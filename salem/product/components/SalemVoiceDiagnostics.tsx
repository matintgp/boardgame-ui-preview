'use client';
import {useEffect,useState} from 'react';
import {useRoomContext} from '@livekit/components-react';
import {RoomEvent} from 'livekit-client';
import type {ConnectionQuality,Participant} from 'livekit-client';

/* Real diagnostics for connected rooms. Never infer sound activity from a CSS animation. */
export function SalemVoiceDiagnostics(){
 const room=useRoomContext();
 const [quality,setQuality]=useState('نامشخص');
 const [speakers,setSpeakers]=useState<string[]>([]);
 const [audioReady,setAudioReady]=useState(false);
 const [devices,setDevices]=useState<MediaDeviceInfo[]>([]);
 const [device,setDevice]=useState('');

 useEffect(()=>{
  const onQuality=(q:ConnectionQuality,p:Participant)=>{
   if(p.identity===room.localParticipant.identity)setQuality(String(q));
  };
  const onSpeakers=(list:Participant[])=>{
   setSpeakers(list.map(p=>p.name||p.identity).slice(0,5));
  };
  room.on(RoomEvent.ConnectionQualityChanged,onQuality);
  room.on(RoomEvent.ActiveSpeakersChanged,onSpeakers);
  return()=>{
   room.off(RoomEvent.ConnectionQualityChanged,onQuality);
   room.off(RoomEvent.ActiveSpeakersChanged,onSpeakers);
  };
 },[room]);

 async function unlock(){
  try{await room.startAudio();setAudioReady(true);}
  catch{setAudioReady(false);}
 }
 async function scanDevices(){
  try{
   const list=await navigator.mediaDevices.enumerateDevices();
   setDevices(list.filter(d=>d.kind==='audioinput'));
  }catch{setDevices([]);}
 }
 async function choose(value:string){
  if(!value)return;
  try{await room.switchActiveDevice('audioinput',value);setDevice(value);}
  catch{setDevice('');}
 }
 return <div className="salem-voice-diagnostics" dir="rtl">
  <div><strong>کیفیت اتصال:</strong> {quality} <span aria-live="polite">{speakers.length?'در حال صحبت: '+speakers.join('، '):'در حال حاضر کسی صحبت نمی‌کند'}</span></div>
  <div className="salem-voice-tools">
   <button type="button" onClick={()=>void unlock()}>{audioReady?'صدای خروجی فعال است':'فعال‌کردن پخش صدا'}</button>
   <button type="button" onClick={()=>void scanDevices()}>انتخاب میکروفون</button>
   {devices.length>0&&<select aria-label="دستگاه میکروفون" value={device} onChange={e=>void choose(e.target.value)}>
    <option value="">میکروفون</option>
    {devices.map((d,i)=><option key={d.deviceId||i} value={d.deviceId}>{d.label||'میکروفون '+(i+1)}</option>)}
   </select>}
  </div>
 </div>;
}
