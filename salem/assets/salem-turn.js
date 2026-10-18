/* Salem turn clock is a UI simulator; multiplayer clocks are server-authoritative. */
(()=>{
'use strict';
let match=null,onExpire=null,handle=null,done='';
const $=s=>document.querySelector(s);
const format=x=>String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0');
function tick(){
 const clock=$('#turnTimerBadge'),voice=$('#voiceStatusBadge');
 if(!match)return;
 if(match.phase!=='turn'||!match.turnEndsAt||match.winner){
  if(clock)clock.hidden=true;
  if(voice)voice.textContent=match.phase==='dawn'?'همه در خواب‌اند · ویس مخفی ساحره‌ها':match.phase==='night'?'شب · ارتباط مخفی': 'ویس در حالت انتظار';
  return;
 }
 const remain=Math.max(0,Math.ceil((match.turnEndsAt-Date.now())/1000));
 if(clock){clock.hidden=false;clock.textContent=format(remain);clock.classList.toggle('urgent',remain<=10);}
 const owner=match.players.find(p=>p.id===match.current);
 if(voice)voice.textContent='نوبت صحبت: '+(owner?.name||'بازیکن')+' · اتصال LiveKit لازم است';
 const key=match.turn+':'+match.current+':'+match.turnEndsAt;
 if(remain===0&&done!==key){
  done=key;onExpire?.();
 }
}
function sync(state,callback){
 match=state;onExpire=callback;
 if(!handle)handle=setInterval(tick,250);
 tick();
}
function stop(){
 match=null;onExpire=null;done='';
 if(handle){clearInterval(handle);handle=null;}
 const clock=$('#turnTimerBadge');if(clock)clock.hidden=true;
}
function drawn(){
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const board=$('#tableBoard');if(!board||!board.getBoundingClientRect)return;
 const p=board.getBoundingClientRect(),holder=document.createElement('div');holder.className='salem-draw-animation';
 holder.innerHTML='<i></i><i></i><span>۲ کارت جدید</span>';
 holder.style.left=Math.max(12,p.left+p.width/2-55)+'px';holder.style.top=Math.max(100,p.top+p.height/2-120)+'px';
 document.body.append(holder);setTimeout(()=>holder.remove(),1250);
}
window.SalemTurn={sync,stop,drawn};
})();