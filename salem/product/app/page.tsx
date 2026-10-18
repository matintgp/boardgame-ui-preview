'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
export default function StartPage(){
 const [match,setMatch]=useState('');const router=useRouter();
 const valid=/^[a-zA-Z0-9_-]{4,100}$/.test(match);
 return <main dir="rtl" className="sp-root" style={{display:'grid',placeContent:'center',minHeight:'100dvh'}}>
  <section className="sp-top" style={{display:'grid',maxWidth:570,gap:18}}>
   <div><small>BOARDGAME / SALEM 1692</small><h1>ورود به مسابقه</h1>
    <p>این رابط به سرور مسابقات متصل می‌شود؛ ساخت میز و تأیید هویت از طریق بک‌اند اصلی انجام می‌گیرد.</p></div>
   <form onSubmit={e=>{e.preventDefault();if(valid)router.push('/match/'+encodeURIComponent(match));}}>
    <label htmlFor="matchId">شناسه میز</label>
    <input id="matchId" value={match} onChange={e=>setMatch(e.target.value)} placeholder="مثلاً salem-room-24"
     style={{display:'block',padding:15,width:'100%',borderRadius:12,margin:'12px 0',background:'#1c3040',color:'#fff',border:'1px solid #d0ac70'}} />
    <button type="submit" disabled={!valid} style={{padding:'12px 20px',background:'#c9a36b',color:'#0e1720',border:0,borderRadius:10}}>ورود به میز</button>
   </form>
   <p className="sp-disclaimer">برای امتحان دمو بدون بک‌اند، از سایت اصلی BoardGame و مسیر /salem/ استفاده کن.</p>
  </section>
 </main>;
}
