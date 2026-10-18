'use client';
import {useState} from 'react';
type Props={matchId:string;targetId:string;apiBase?:string;onClose:()=>void};
type Reason='harassment'|'cheating'|'abuse'|'afk'|'other';
export function SalemPlayerReport({matchId,targetId,apiBase='/api',onClose}:Props){
 const [reason,setReason]=useState<Reason>('harassment');
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [outcome,setOutcome]=useState('');
 async function report(e:React.FormEvent){
  e.preventDefault();if(busy)return;
  setBusy(true);setOutcome('');
  try{
   const res=await fetch(apiBase+'/matches/'+encodeURIComponent(matchId)+'/reports',{
    method:'POST',credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({targetPlayerId:targetId,reason,description:note.slice(0,500),reportId:crypto.randomUUID()})
   });
   if(!res.ok)throw new Error('در حال حاضر ثبت گزارش امکان‌پذیر نیست.');
   setOutcome('گزارش برای بررسی ارسال شد.');
  }catch(e){setOutcome(e instanceof Error?e.message:'خطای ارسال گزارش');}
  finally{setBusy(false);}
 }
 return <form dir="rtl" className="sp-report" onSubmit={e=>void report(e)}>
  <h3>گزارش رفتار بازیکن</h3><p>فقط موارد واقعی رو ثبت کن؛ نتیجه گزارش توسط مدیر بررسی می‌شود.</p>
  <label>دلیل گزارش
   <select value={reason} onChange={e=>setReason(e.target.value as Reason)}>
    <option value="harassment">آزار صوتی یا گفتاری</option><option value="cheating">تقلب</option>
    <option value="abuse">تخلف در بازی</option><option value="afk">غیرفعال‌بودن مداوم</option>
    <option value="other">سایر موارد</option>
   </select>
  </label>
  <label>توضیح کوتاه (اختیاری)<textarea maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label>
  <div><button disabled={busy} type="submit">{busy?'در حال ثبت…':'ثبت گزارش'}</button><button type="button" onClick={onClose}>بستن</button></div>
  {outcome&&<p role="status">{outcome}</p>}
 </form>;
}
