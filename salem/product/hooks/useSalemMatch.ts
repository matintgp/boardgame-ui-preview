'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {ConnectionState,SalemCommand,SalemCommandEnvelope,SalemSnapshot,SalemRealtimeMessage} from '../match-protocol';
import {parseSnapshot,permittedAction} from '../match-protocol';

type Config={matchId:string;viewerId?:string;apiBase?:string;socketUrl:string;enabled:boolean};
export function useSalemMatch({matchId,viewerId,apiBase='/api',socketUrl,enabled}:Config){
 const [state,setState]=useState<SalemSnapshot|null>(null);
 const [connection,setConnection]=useState<ConnectionState>('offline');
 const [error,setError]=useState<string|null>(null);
 const [pending,setPending]=useState(false);
 const wsRef=useRef<WebSocket|null>(null);
 const lastVersion=useRef(-1);
 const latest=useRef<SalemSnapshot|null>(null);
 const loading=useRef(false);
 latest.current=state;

 const refresh=useCallback(async(signal?:AbortSignal)=>{
  if(!enabled||loading.current)return;
  loading.current=true;
  try{
   const r=await fetch(apiBase+'/matches/'+encodeURIComponent(matchId)+'/state',{
    credentials:'include',headers:{Accept:'application/json'},signal,
    cache:'no-store'
   });
   if(!r.ok)throw new Error('عدم دسترسی به وضعیت مسابقه ('+r.status+')');
   const value=parseSnapshot(await r.json(),viewerId);
   if(value.public.matchId!==matchId)throw new Error('Match identity mismatch');
   if(value.public.stateVersion>=lastVersion.current){
    lastVersion.current=value.public.stateVersion;
    setState(value);
   }
   setError(null);
  }catch(e){
   if((e as Error)?.name!=='AbortError')setError(e instanceof Error?e.message:'خطای بازیابی وضعیت');
  }finally{loading.current=false;}
 },[enabled,apiBase,matchId,viewerId]);

 useEffect(()=>{
  if(!enabled){setConnection('offline');setState(null);return;}
  const controller=new AbortController();
  let stopped=false,attempt=0,timer:ReturnType<typeof setTimeout>|null=null;
  const open=()=>{
   if(stopped||controller.signal.aborted)return;
   setConnection(attempt===0?'connecting':'reconnecting');
   let ws:WebSocket;
   try{
    const url=new URL(socketUrl);
    if(!['wss:','ws:'].includes(url.protocol))throw new Error('Invalid websocket URL');
    if(url.protocol==='ws:'&&url.hostname!=='localhost'&&url.hostname!=='127.0.0.1')throw new Error('Insecure websocket');
    url.searchParams.set('matchId',matchId);
    // Auth is server session cookie; NEVER send a role assertion or LiveKit secret.
    ws=new WebSocket(url.toString());
   }catch(e){setConnection('offline');setError(String(e));return;}
   wsRef.current=ws;
   ws.onopen=()=>{attempt=0;setConnection('online');void refresh(controller.signal);};
   ws.onmessage=event=>{
    let msg:SalemRealtimeMessage;
    try{msg=JSON.parse(String(event.data)) as SalemRealtimeMessage;}catch{return;}
    if(msg.type==='snapshot'){
     try{
      const snapshot=parseSnapshot(msg.state,viewerId);
      if(snapshot.public.matchId===matchId&&snapshot.public.stateVersion>=lastVersion.current){
       lastVersion.current=snapshot.public.stateVersion;setState(snapshot);
      }
     }catch{setError('اطلاعات دریافتی از سرور نامعتبر است.');}
    }else if(msg.type==='state_changed'||msg.type==='phase_changed'){
     if(msg.version>lastVersion.current)void refresh(controller.signal);
    }
   };
   ws.onerror=()=>setError('ارتباط با سرور مختل شد.');
   ws.onclose=()=>{
    if(stopped)return;
    setConnection('reconnecting');
    const wait=Math.min(12000,650*Math.pow(2,Math.min(attempt++,5)))+Math.random()*450;
    timer=setTimeout(open,wait);
   };
  };
  void refresh(controller.signal);open();
  const onVisible=()=>{if(!document.hidden&&wsRef.current?.readyState===WebSocket.OPEN)void refresh(controller.signal);};
  document.addEventListener('visibilitychange',onVisible);
  return ()=>{
   stopped=true;controller.abort();
   if(timer)clearTimeout(timer);
   document.removeEventListener('visibilitychange',onVisible);
   const ws=wsRef.current;wsRef.current=null;
   ws?.close(1000,'Leaving match');
  };
 },[enabled,matchId,socketUrl,refresh,viewerId]);

 const send=useCallback(async(action:SalemCommand)=>{
  const snap=latest.current;
  if(!snap||pending||snap.viewer!=='player'||!snap.private)throw new Error('اقدام برای این حساب مجاز نیست.');
  if(!permittedAction(snap.public.phase,action))throw new Error('این حرکت در فاز فعلی مجاز نیست.');
  const request:SalemCommandEnvelope={
   matchId,commandId:crypto.randomUUID(),
   expectedStateVersion:snap.public.stateVersion,
   expectedPhaseVersion:snap.public.phaseVersion,action
  };
  setPending(true);
  try{
   const r=await fetch(apiBase+'/matches/'+encodeURIComponent(matchId)+'/commands',{
    method:'POST',credentials:'include',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(request)
   });
   if(!r.ok){
    if([409,412].includes(r.status)){await refresh();throw new Error('وضعیت بازی عوض شده است. اطلاعات تازه دریافت شد.');}
    throw new Error('سرور حرکت را نپذیرفت ('+r.status+')');
   }
   await refresh();
   return true;
  }finally{setPending(false);}
 },[pending,matchId,apiBase,refresh]);

 return {state,connection,error,pending,send,refresh};
}
