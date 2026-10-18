'use client';

import { useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import type { SalemVoiceAccess, SalemVoiceTokenResponse, VoiceChannel } from '../voice-contract';
import { permittedChannel } from '../voice-contract';

type Props = { state: SalemVoiceAccess; tokenEndpoint?: string };
type Status = 'idle'|'connecting'|'connected'|'blocked'|'error';

function MicrophoneControl({canSpeak}:{canSpeak:boolean}){
  const room=useRoomContext();
  const [muted,setMuted]=useState(true);
  useEffect(()=>{
    setMuted(true);
    // Microphone is never enabled implicitly.
    return ()=>{void room.localParticipant.setMicrophoneEnabled(false).catch(()=>{});};
  },[room,canSpeak]);
  async function toggle(){
    if(!canSpeak)return;
    try {
      const enable=muted;
      await room.localParticipant.setMicrophoneEnabled(enable);
      setMuted(!enable);
    }catch{setMuted(true);}
  }
  return <button type="button" disabled={!canSpeak} onClick={toggle}
    aria-pressed={canSpeak&&!muted}>{!canSpeak?'فقط شنونده':muted?'فعال‌کردن میکروفون':'بی‌صدا کردن میکروفون'}</button>;
}

export function SalemLiveKitVoice({state,tokenEndpoint='/api/salem/voice-token'}:Props){
  const channel:VoiceChannel|null=permittedChannel(state);
  const [status,setStatus]=useState<Status>('idle');
  const [grant,setGrant]=useState<SalemVoiceTokenResponse|null>(null);
  const canSpeak=channel==='witch-night'||channel==='day-speaker';

  useEffect(()=>{
    const controller=new AbortController();
    setGrant(null);setStatus(channel?'connecting':'blocked');
    if(!channel)return;
    // A client-supplied phase or team assertion is NEVER trusted. Backend independently
    // validates session, match, side, speaker ID and phaseVersion before signing a token.
    async function obtainGrant(allowed:VoiceChannel){
      try{
        const response=await fetch(tokenEndpoint,{
          method:'POST',credentials:'include',signal:controller.signal,
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            matchId:state.matchId,
            channel:allowed,
            expectedPhaseVersion:state.phaseVersion
          })
        });
        if(!response.ok)throw new Error('Unauthorized LiveKit room');
        const body=await response.json() as SalemVoiceTokenResponse;
        if(!body.server_url.startsWith('wss://')||!body.participant_token)throw new Error('Bad grant');
        if(!controller.signal.aborted){setGrant(body);setStatus('idle');}
      }catch{if(!controller.signal.aborted)setStatus('error');}
    }
    void obtainGrant(channel);
    return ()=>controller.abort();
  },[channel,tokenEndpoint,state.matchId,state.phaseVersion,state.authenticatedPlayerId]);

  return <section dir="rtl" className="salem-voice" aria-label="ارتباط صوتی سالم">
    <strong>{channel==='witch-night'?'اتاق اختصاصی ساحره‌ها':channel==='day-speaker'?'نوبت صحبت شما':channel==='day-listen'?'در حال شنیدن صحبت نوبت':'میکروفون بسته است'}</strong>
    <p aria-live="polite">{status==='connecting'?'در حال دریافت مجوز امن تماس…':status==='connected'?'ارتباط صوتی برقرار است':status==='blocked'?'در این فاز به کانال صوتی دسترسی نداری.':status==='error'?'توکن یا اتصال LiveKit معتبر نیست.':'آماده اتصال'}</p>
    {grant&&channel&&<LiveKitRoom key={state.matchId+':'+state.phaseVersion+':'+channel}
      token={grant.participant_token} serverUrl={grant.server_url}
      connect={true} audio={false} video={false}
      onConnected={()=>setStatus('connected')}
      onDisconnected={()=>setStatus('idle')}
      onError={()=>setStatus('error')}>
      <RoomAudioRenderer/>
      <MicrophoneControl canSpeak={canSpeak}/>
    </LiveKitRoom>}
    <small>شرکت‌کننده بدون مجوز سرور نه می‌تواند میکروفون منتشر کند و نه به اتاق ساحره‌ها وارد شود.</small>
  </section>;
}
