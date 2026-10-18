'use client';

import {useState} from 'react';
import {townHallById} from '../town-hall-catalogue';
import type {PublicPlayer,SalemSnapshot} from '../match-protocol';

type Props={
 snapshot:SalemSnapshot;
 timeLeft:number|null;
 busy:boolean;
 onVote:(playerId:string|null)=>Promise<unknown>;
 onCharacter:(id:string)=>Promise<unknown>;
};
const phaseLabels={
 sleep:{heading:'شهر به خواب می‌رود',description:'نور شهر خاموش شده است. جادوگرها به‌زودی بیدار می‌شوند.',tag:'SLEEP PHASE'},
 witch_vote:{heading:'ساحره‌ها بیدار شوید',description:'گربه سیاه باید پیش از پایان زمان به یک بازیکن برسد.',tag:'WITCHES AWAKEN'},
 sunrise:{heading:'طلوع بر شهر سالم',description:'گربه سیاه صاحب نوبت نخست را تعیین می‌کند؛ گوش به صدای خروس بسپار.',tag:'SUNRISE'},
 town_hall:{heading:'شخصیت خود را انتخاب کن',description:'یک شخصیت را نگه دار. کارت دیگر برای این مسابقه از دسترس خارج می‌شود.',tag:'TOWN HALL'}
} as const;
function labelTime(n:number|null):string{
 if(n===null)return '—';
 return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
}
function CatChoice({player,selected,disabled,onClick}:{player:PublicPlayer;selected:boolean;disabled:boolean;onClick:()=>void}){
 return <button type="button" className={'sp-dawn-voter'+(selected?' selected':'')} disabled={disabled||!player.alive} aria-pressed={selected} onClick={onClick}>
   <img src={player.portraitUrl} alt=""/>
   <strong>{player.name}</strong>
   <small>{selected?'انتخاب ثبت‌شده':'قابل انتخاب'}</small>
 </button>;
}
export function SalemPhaseExperience({snapshot,timeLeft,busy,onVote,onCharacter}:Props){
 const match=snapshot.public,personal=snapshot.private;
 const [error,setError]=useState<string|null>(null);
 const phase=match.phase;
 if(!['sleep','witch_vote','sunrise','town_hall'].includes(phase))return null;
 const isWitch=phase==='witch_vote'&&Array.isArray(personal?.witchTeammateIds);
 const team=isWitch?match.players.filter(p=>personal?.witchTeammateIds?.includes(p.id)||p.id===personal?.playerId):[];
 const canSelect=phase==='town_hall'&&snapshot.viewer==='player'&&Boolean(personal?.offeredCharacters.length);
 const text=phaseLabels[phase as keyof typeof phaseLabels];
 async function select(id:string|null){
  setError(null);
  try{await onVote(id);}catch(e){setError(e instanceof Error?e.message:'رأی ثبت نشد.');}
 }
 async function choose(id:string){
  setError(null);
  try{await onCharacter(id);}catch(e){setError(e instanceof Error?e.message:'انتخاب شخصیت ثبت نشد.');}
 }
 return <section dir="rtl" className={'sp-dawn-panel sp-dawn-'+phase} aria-label={text.heading}>
   <div className="sp-dawn-background" aria-hidden="true"><i className="sp-dawn-moon"/><i className="sp-dawn-cloud"/><i className="sp-dawn-ground"/></div>
   <div className="sp-dawn-content">
    <span className="sp-dawn-tag">{text.tag}</span>
    <h2>{phase==='witch_vote'&&!isWitch?'شهر در خواب است':text.heading}</h2>
    <p>{phase==='witch_vote'&&!isWitch?'منتظر بمان تا تصمیم جادوگران تمام شود. اطلاعات مخفی به تو نمایش داده نمی‌شود.':text.description}</p>
    <div className="sp-dawn-clock" aria-live="off" aria-label="زمان باقی‌مانده">
     <time>{labelTime(timeLeft)}</time><span>زمان فاز · براساس ساعت سرور</span>
    </div>
    {isWitch&&<div className="sp-dawn-witch-panel">
     <h3>جادوگرهای این شب</h3><div className="sp-dawn-team">
      {team.map(p=><span key={p.id}><img src={p.portraitUrl} alt=""/><b>{p.name}{p.id===personal?.playerId?' (شما)':''}</b></span>)}
     </div>
     <p>به هر بازیکن زنده، حتی خودت، می‌توانی رأی بدهی. انصراف از رأی مجاز است.</p>
     <div className="sp-dawn-voters">
      {match.players.filter(p=>p.alive).map(p=><CatChoice key={p.id} player={p}
       selected={personal?.selfBlackCatVote===p.id} disabled={busy} onClick={()=>void select(p.id)}/>)}
     </div>
     <button className="sp-dawn-abstain" type="button" disabled={busy} onClick={()=>void select(null)}>رأی ممتنع / پاک‌کردن انتخاب</button>
     <p className="sp-dawn-private-note">رأی سایر ساحره‌ها مخفی می‌ماند؛ نتیجه در پایان مهلت توسط سرور محاسبه می‌شود.</p>
    </div>}
    {canSelect&&<div className="sp-dawn-offers">
     {personal!.offeredCharacters.map(id=>{
      const card=townHallById[id];
      return <article className="sp-dawn-character" key={id}>
       <div className="sp-dawn-portrait">{card&&<img src={card.portrait} alt={'شخصیت '+card.name}/>}</div>
       <div><h3>{card?.name||id}</h3><small>{card?.en}</small><p>{card?.description||'توانایی اختصاصی'}</p>
        <button disabled={busy} onClick={()=>void choose(id)}>انتخاب و سوزاندن کارت دیگر</button></div>
      </article>;
     })}
    </div>}
    {phase==='sunrise'&&<p className="sp-dawn-sunrise-note">تا پایان طلوع صبر کن؛ حق صحبت و حرکت در نوبت بعد تعیین می‌شود.</p>}
    {error&&<p role="alert" className="sp-error">{error}</p>}
   </div>
  </section>;
}
