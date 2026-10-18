'use client';
import {useEffect,useMemo,useState} from 'react';
import {SalemLiveKitVoice} from './SalemLiveKitVoice';
import {SalemPlayerReport} from './SalemPlayerReport';
import {useSalemMatch} from '../hooks/useSalemMatch';
import {remainingSeconds,upcomingPlayers} from '../match-protocol';
import type {SalemCommand,SalemSnapshot} from '../match-protocol';
import type {SalemVoiceAccess} from '../voice-contract';
import './salem-product.css';

type Props={matchId:string;viewerId?:string;socketUrl:string;apiBase?:string;voiceTokenEndpoint?:string};
const phaseNames:Record<string,string>={
 lobby:'لابی',town_hall:'انتخاب شخصیت',role_reveal:'افشای نقش',
 sleep:'شهر در خواب',witch_vote:'رأی گربه سیاه',sunrise:'طلوع صبح',
 turn:'روز · نوبت بازیکن',night:'شب جادوگران',trial:'افشای Tryal',finished:'پایان مسابقه'
};
function formatSeconds(value:number|null){
 if(value==null)return '—';
 return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
}
function phaseVoice(snapshot:SalemSnapshot):SalemVoiceAccess{
 const match=snapshot.public,privateMatch=snapshot.private;
 return {
  matchId:match.matchId,
  phase:match.phase==='witch_vote'?'witch_vote':match.phase==='turn'?'turn':'room_setup',
  phaseVersion:match.phaseVersion,
  authenticatedPlayerId:privateMatch?.playerId||'spectator',
  isWitch:Boolean(privateMatch?.witchTeammateIds),
  currentSpeakerId:match.currentSpeakerId,
  isAlive:Boolean(match.players.find(p=>p.id===privateMatch?.playerId)?.alive)
 };
}
export function SalemProductRoom({matchId,viewerId,socketUrl,apiBase='/api',voiceTokenEndpoint='/api/salem/voice-token'}:Props){
 const [now,setNow]=useState(Date.now());
 const [target,setTarget]=useState<string|null>(null);
 const [selectedCard,setSelectedCard]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [tab,setTab]=useState<'table'|'hand'|'history'>('table');
 const [reportTarget,setReportTarget]=useState<string|null>(null);
 const {state,connection,pending,send,refresh}=useSalemMatch({matchId,viewerId,apiBase,socketUrl,enabled:Boolean(matchId&&socketUrl)});
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id);},[]);
 const match=state?.public,privateView=state?.private;
 const seconds=remainingSeconds(match?.phaseDeadline??null,now);
 const queue=useMemo(()=>match?upcomingPlayers(match):[],[match]);
 const myTurn=Boolean(state?.viewer==='player'&&privateView&&match?.currentSpeakerId===privateView.playerId&&match.phase==='turn');
 const witchVote=Boolean(privateView?.witchTeammateIds&&match?.phase==='witch_vote');
 const voiceAccess=useMemo(()=>state?phaseVoice(state):null,[state]);
 async function command(action:SalemCommand){
  setError(null);
  try{await send(action);setSelectedCard(null);setTarget(null);}
  catch(e){setError(e instanceof Error?e.message:'حرکت پذیرفته نشد.');}
 }
 if(!match)return <section dir="rtl" className="sp-root sp-loading" aria-live="polite">
  <h2>در حال بارگذاری مسابقه Salem</h2><p>{error||'در حال دریافت وضعیت عمومی و اطلاعات مجاز بازیکن از سرور…'}</p>
  <span>وضعیت ارتباط: {connection}</span><button onClick={()=>void refresh()}>تلاش دوباره</button>
 </section>;
 return <main dir="rtl" className={'sp-root phase-'+match.phase}>
  <header className="sp-top">
   <div><small>SALEM 1692 · SECURE MATCH</small><h1>{phaseNames[match.phase]||match.phase}</h1><span>{match.players.filter(p=>p.alive).length} بازیکن زنده · نوبت {match.turnNumber}</span></div>
   <div className="sp-network"><span className={'sp-light '+connection}/><strong>{connection==='online'?'متصل':connection==='reconnecting'?'در حال اتصال مجدد…':'آفلاین'}</strong><time>{formatSeconds(seconds)}</time></div>
  </header>
  <div className="sp-queue" aria-label="ترتیب نوبت‌ها">
   {queue.map((p,i)=><div key={p.id} className={'sp-player-queue '+(!i?'active':'')}>
     <img alt="" src={p.portraitUrl}/><span>{p.name}</span><small>{i?'نفر بعد':'نوبت فعلی'}</small></div>)}
  </div>
  <div className="sp-tabs" role="tablist" aria-label="بخش‌های مسابقه">
   {(['table','hand','history'] as const).map(value=><button key={value} role="tab" aria-selected={tab===value} onClick={()=>setTab(value)}>{value==='table'?'میز':value==='hand'?'دست من':'رویدادها'}</button>)}
  </div>
  <div className="sp-content">
   {tab==='table'&&<section className="sp-table" aria-label="بازیکنان و اتهامات">
    {match.players.map(p=><button key={p.id} type="button"
      className={'sp-seat '+(p.id===target?'target ':'')+(!p.alive?'dead ':'')+(p.id===match.currentSpeakerId?'speaking':'')}
      disabled={!myTurn||!p.alive||p.id===privateView?.playerId} onClick={()=>setTarget(p.id)}>
      <img src={p.portraitUrl} alt=""/><strong>{p.name}</strong>
      <small>{p.characterId||'بدون شخصیت'} · {p.presence}</small>
      <span>{p.accusations} اتهام · {p.revealedTryals.length} Tryal عمومی</span>
      {p.hasBlackCat&&<b>گربه سیاه</b>}
     </button>)}
   </section>}
   {tab==='table'&&target&&state?.viewer==='player'&&<div className="sp-report-controls">
      <span>بازیکن انتخاب‌شده: {match.players.find(p=>p.id===target)?.name}</span>
      <button type="button" onClick={()=>setReportTarget(target)}>گزارش رفتار این بازیکن</button>
    </div>}
    {tab==='table'&&reportTarget&&state?.viewer==='player'&&<SalemPlayerReport matchId={match.matchId} targetId={reportTarget} apiBase={apiBase} onClose={()=>setReportTarget(null)}/>}
   {tab==='hand'&&<section className="sp-hand">
    {!privateView?<p>نمای تماشاچی؛ کارت‌های خصوصی نمایش داده نمی‌شوند.</p>:
     privateView.hand.map(card=><button key={card.instanceId} onClick={()=>setSelectedCard(card.instanceId)}
       aria-pressed={selectedCard===card.instanceId} className="sp-private-card" disabled={!myTurn}>
       <span>✦</span><strong>{card.cardId}</strong></button>)}
    {myTurn&&<div className="sp-actions">
     <button disabled={pending||!selectedCard||!target} onClick={()=>void command({kind:'play_card',cardInstanceId:selectedCard!,targetPlayerId:target!})}>بازی کارت روی هدف</button>
     <button disabled={pending} onClick={()=>void command({kind:'draw_two'})}>کشیدن دو کارت و پایان نوبت</button>
     <button disabled={pending} onClick={()=>void command({kind:'end_turn'})}>پایان نوبت</button>
    </div>}
   </section>}
   {tab==='history'&&<section className="sp-events" aria-label="تاریخچه عمومی مسابقه">
    {match.publicEvents.slice().reverse().map(ev=><article key={ev.id}><time>{new Date(ev.occurredAt).toLocaleTimeString('fa-IR')}</time><p>{ev.message}</p></article>)}
   </section>}
  </div>
  {match.phase==='town_hall'&&privateView&&<section className="sp-choices"><h2>انتخاب یکی از شخصیت‌ها</h2>
   {privateView.offeredCharacters.map(id=><button key={id} disabled={pending} onClick={()=>void command({kind:'choose_character',characterId:id})}>{id}</button>)}
  </section>}
  {witchVote&&<section className="sp-choices"><h2>رأی مخفی گربه سیاه</h2>
   {match.players.filter(p=>p.alive).map(p=><button key={p.id} disabled={pending} onClick={()=>void command({kind:'black_cat_vote',targetPlayerId:p.id})}>{p.name}</button>)}
   <button disabled={pending} onClick={()=>void command({kind:'black_cat_vote',targetPlayerId:null})}>رأی ممتنع</button>
   <p>رأی سایر ساحره‌ها به شما ارسال نمی‌شود. سرور نتیجه را تعیین می‌کند.</p>
  </section>}
  {voiceAccess&&<SalemLiveKitVoice key={voiceAccess.phaseVersion+':'+voiceAccess.authenticatedPlayerId} state={voiceAccess} tokenEndpoint={voiceTokenEndpoint}/>}
  {error&&<p className="sp-error" role="alert">{error}</p>}
  {state?.viewer==='spectator'&&<p className="sp-disclaimer">نمای تماشاچی: هیچ اطلاعات مخفی دریافت نشده است.</p>}
 </main>;
}
