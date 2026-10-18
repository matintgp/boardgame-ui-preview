'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import type { SalemVoiceAccess, SalemVoiceTokenResponse, VoiceChannel } from '../voice-contract';
import { permittedChannel } from '../voice-contract';

type Props = { state: SalemVoiceAccess; tokenEndpoint?: string };
type Status = 'idle'|'connecting'|'connected'|'blocked'|'error';

export function SalemLiveKitVoice({ state, tokenEndpoint='/api/salem/voice-token' }: Props) {
  const [status,setStatus]=useState<Status>('idle');
  const [muted,setMuted]=useState(true);
  const roomRef=useRef<Room|null>(null);
  const channel=permittedChannel(state);
  // Users must choose to enable microphone. No covert auto-capture.
  const [micApproved,setMicApproved]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    const room=roomRef.current;
    roomRef.current=null;
    if(room){void room.disconnect(true);}
    setStatus(channel?'idle':'blocked');setMuted(true);setMicApproved(false);
    if(!channel)return;
    // Server checks authentication, match membership, team and phase EACH time.
    async function establish(approvedChannel:VoiceChannel){
      try {
        setStatus('connecting');
        const r=await fetch(tokenEndpoint,{
          method:'POST',credentials:'include',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({matchId:state.matchId,channel:approvedChannel,expectedPhaseVersion:state.phaseVersion})
        });
        if(!r.ok)throw new Error('voice access denied');
        const grant=await r.json() as SalemVoiceTokenResponse;
        if(!grant.server_url.startsWith('wss://')||!grant.participant_token)throw new Error('bad voice grant');
        if(cancelled)return;
        const newRoom=new Room({adaptiveStream:true,dynacast:true});
        roomRef.current=newRoom;
        newRoom.on(RoomEvent.Disconnected,()=>{if(!cancelled)setStatus('idle');});
        await newRoom.connect(grant.server_url,grant.participant_token);
        if(cancelled){await newRoom.disconnect(true);return;}
        // Listen only to the server-authorized room. Speaking is separate.
        setStatus('connected');
      } catch {
        if(!cancelled)setStatus('error');
      }
    }
    void establish(channel);
    return ()=>{cancelled=true;const active=roomRef.current;roomRef.current=null;if(active)void active.disconnect(true);};
  },[channel,tokenEndpoint,state.matchId,state.phaseVersion,state.authenticatedPlayerId]);

  async function toggleMic(){
    const room=roomRef.current;if(!room||status!=='connected'||!channel)return;
    try {
      const next=!micApproved;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicApproved(next);setMuted(!next);
    } catch {setMuted(true);setMicApproved(false);setStatus('error');}
  }

  return <section dir="rtl" aria-label="ارتباط صوتی سالم" className="salem-voice">
    <strong>{channel==='witch-night'?'اتاق خصوصی ساحره‌ها':channel==='day-speaker'?'میکروفون نوبت شما':'میکروفون بسته است'}</strong>
    <p aria-live="polite">{status==='connected'?'به اتاق مجاز LiveKit متصل شدی':
      status==='connecting'?'در حال برقراری تماس…':status==='error'?'امکان اتصال وجود ندارد؛ مجوز سرور را بررسی کن.':
      status==='blocked'?'برای این فاز مجوز صحبت نداری.':'در انتظار اتصال به سرور'}</p>
    <button type="button" disabled={status!=='connected'||!channel} onClick={toggleMic}
      aria-pressed={!muted}>{muted?'فعال‌کردن میکروفون':'بی‌صدا کردن میکروفون'}</button>
    <small>توکن اتصال فقط از بک‌اند صادر می‌شود. پایان فاز اتصال این کانال را می‌بندد.</small>
  </section>;
}
