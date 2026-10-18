/* Initial Salem Dawn: standalone stateful overlay for frontend preview.
   Production multiplayer must execute votes and phases on the backend. */
(()=>{
'use strict';
let match=null,api=null,ticker=null,root=null;
const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const alive=()=>match.players.filter(p=>p.alive);
const witches=()=>alive().filter(p=>p.witchEver);
const localWitch=()=>Boolean(match.players[0].witchEver);
const rand=items=>items[Math.floor(Math.random()*items.length)];
const seconds=()=>Math.max(0,Math.ceil((match.initialDawn.endsAt-Date.now())/1000));
const format=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const lengths={sleep:5000,vote:30000,sunrise:5200};
function tally(votes,people,rng=Math.random){
 const ballots=Object.values(votes||{}).filter(id=>people.some(p=>p.id===id));
 if(!ballots.length)return people[Math.floor(rng()*people.length)].id;
 const count={};ballots.forEach(id=>count[id]=(count[id]||0)+1);
 const high=Math.max(...Object.values(count)),tied=Object.keys(count).filter(id=>count[id]===high);
 return Number(tied[Math.floor(rng()*tied.length)]);
}
function stop(){
 if(ticker)clearInterval(ticker);ticker=null;
 if(root)root.remove();root=null;
 delete document.body.dataset.salemDawn;
 match=null;api=null;
}
function create(){
 if(root)return;
 root=document.createElement('div');root.id='salemDawn';root.className='salem-dawn';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','شب آغازین سالم');root.setAttribute('tabindex','-1');
 document.body.append(root);document.body.dataset.salemDawn='true';
 root.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const nodes=[...root.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)')].filter(el=>el.getClientRects().length);
  if(!nodes.length){event.preventDefault();return;}
  const first=nodes[0],last=nodes[nodes.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
}
function updateTime(){
 if(!root||!match)return;
 const remain=seconds(),c=$('#dawnClock'),meter=$('#dawnMeter');
 if(c)c.textContent=format(remain);
 if(meter)meter.style.width=Math.max(0,100*remain*1000/lengths[match.initialDawn.stage])+'%';
}
function change(stage){
 match.initialDawn.stage=stage;
 match.initialDawn.endsAt=Date.now()+lengths[stage];
 api.save();render();
}
function begin(state,hooks){
 stop();match=state;api=hooks;
 state.phase='dawn';state.blackCat=null;
 state.initialDawn={stage:'sleep',endsAt:Date.now()+lengths.sleep,votes:{},confirmed:[],winner:null,botsVoted:false};
 api.log('آغاز شب نخست','بازیکنان به خواب رفتند. جادوگران منتظر فراخوان هستند.');
 create();render();ticker=setInterval(tick,200);api.save();
}
function resume(state,hooks){
 stop();match=state;api=hooks;
 if(state.phase!=='dawn')return;
 if(!state.initialDawn){begin(state,hooks);return;}
 create();render();ticker=setInterval(tick,200);
}
function botBallots(){
 const d=match.initialDawn;
 if(d.botsVoted)return;
 d.botsVoted=true;
 witches().filter(p=>p.id!==0).forEach(p=>{
   if(Math.random()<.24)return;
   d.votes[p.id]=rand(alive()).id;
   d.confirmed.push(p.id);
 });
 api.save();
}
function resolve(){
 const d=match.initialDawn;
 if(d.stage!=='vote')return;
 botBallots();
 const target=tally(d.votes,alive());
 d.winner=target;
 match.blackCat=target;match.current=target;match.turn=1;match.round=1;
 match.action='choose';match.played=0;match.turnEndsAt=Date.now()+60000;
 api.log('گربه سیاه','گربه سیاه به '+api.member(target).name+' رسید؛ این بازیکن روز را شروع می‌کند.');
 window.SalemExperience?.effect('cat',{label:'گربه سیاه · '+api.member(target).name});
 api.setPublic('گربه سیاه به '+api.member(target).name+' رسید.');
 change('sunrise');api.sound('rooster');api.render();
}
function finish(){
 if(!match||match.phase!=='dawn')return;
 const state=match,callbacks=api;
 state.phase='turn';state.current=state.initialDawn.winner;
 state.turnEndsAt=Date.now()+60000;state.initialDawn=null;
 callbacks.save();stop();callbacks.render();callbacks.onDay();
 document.querySelector('[data-action="draw"]')?.focus({preventScroll:true});
}
function tick(){
 if(!match||match.phase!=='dawn'){stop();return;}
 if(Date.now()>=match.initialDawn.endsAt){
  if(match.initialDawn.stage==='sleep'){change('vote');botBallots();}
  else if(match.initialDawn.stage==='vote')resolve();
  else{finish();return;}
 }
 updateTime();
}
function selection(id){
 if(!match||match.phase!=='dawn'||match.initialDawn.stage!=='vote'||!localWitch())return;
 if(id!==null&&!alive().some(p=>p.id===id))return;
 if(id===null)delete match.initialDawn.votes[0];
 else match.initialDawn.votes[0]=id;
 match.initialDawn.confirmed=match.initialDawn.confirmed.filter(x=>x!==0);
 api.save();render();
 const target=id===null?'#dawnAbstain':'[data-dawn-vote="'+id+'"]';
 root?.querySelector(target)?.focus({preventScroll:true});
}
function confirm(){
 if(!localWitch()||match.initialDawn.stage!=='vote')return;
 if(!match.initialDawn.confirmed.includes(0))match.initialDawn.confirmed.push(0);
 api.save();render();root?.querySelector('#dawnConfirm')?.focus({preventScroll:true});
}
function render(){
 if(!match?.initialDawn)return;
 create();
 const d=match.initialDawn,stage=d.stage,witch=localWitch(),ws=witches();
 const people=alive(),isVote=stage==='vote';
 const title=stage==='sleep'?'شهر به خواب می‌رود':isVote?(witch?'ساحره‌ها بیدار شوید':'شهر هنوز در خواب است'):'صبح فرا رسید';
 const description=stage==='sleep'?'ماه بر سالم تابیده است. همه بازیکنان منتظرند.':isVote?(witch?'ساحره‌ها همدیگر را می‌شناسند؛ گربه سیاه را به یک نفر بدهید.':'اطلاعات مخفی جادوگران برای شما نمایش داده نمی‌شود.'):'صدای خروس شهر را بیدار می‌کند؛ صاحب گربه سیاه نخستین بازیکن است.';
 const allied=witch&&isVote?'<section class="dawn-allies"><h3>هم‌تیمی‌های ساحره</h3><div class="dawn-allies-list">'+ws.map(p=>'<div><img src="'+esc(p.portrait)+'" alt=""><strong>'+esc(p.name)+(p.id===0?' · شما':'')+'</strong></div>').join('')+'</div></section>':'';
 const candidates=witch&&isVote?'<section class="dawn-vote"><h3>'+(ws.length===1?'انتخاب گربه سیاه':'رأی مخفی ساحره‌ها')+'</h3><p>می‌توانی خودت را هم انتخاب کنی یا از رأی‌دادن صرف‌نظر کنی. نتیجه تنها پس از پایان تایمر مشخص می‌شود.</p><div class="dawn-candidates">'+people.map(p=>'<button type="button" class="dawn-choice '+(d.votes[0]===p.id?'chosen':'')+'" data-dawn-vote="'+p.id+'" aria-pressed="'+(d.votes[0]===p.id)+'"><img src="'+esc(p.portrait)+'" alt=""><span>'+esc(p.name)+'</span></button>').join('')+'</div><div class="dawn-vote-actions"><button class="btn outline" id="dawnAbstain">بدون انتخاب</button><button class="btn primary" id="dawnConfirm">'+(d.confirmed.includes(0)?'ثبت شد ✓':'ثبت رأی من')+'</button></div><p class="dawn-info">رأی بقیه ساحره‌ها مخفی است؛ اگر هیچ‌کس رأی ندهد، مقصد تصادفی انتخاب می‌شود.</p></section>':'';
 const voice=witch&&isVote?'<section class="dawn-private-voice"><span class="dawn-voice-dot"></span><div><strong>کانال خصوصی ساحره‌ها</strong><p>تا زمان اتصال سرور LiveKit، این بخش تنها پیش‌نمایش است و صدای واقعی منتقل نمی‌شود.</p></div><button type="button" class="btn outline" id="dawnVoice">وضعیت ویس</button></section>':'';
 const result=stage==='sunrise'?'<div class="dawn-result"><img src="assets/moonlit_cat_over_the_haunted_village.webp" alt="گربه سیاه"><div><strong>گربه سیاه: '+esc(api.member(d.winner)?.name)+'</strong><p>صاحب گربه سیاه، اولین نوبت یک‌دقیقه‌ای را آغاز می‌کند.</p></div></div>':'';
 root.className='salem-dawn '+stage;
 root.innerHTML='<div class="dawn-backdrop"><div class="dawn-moon"></div><div class="dawn-cloud cloud-a"></div><div class="dawn-cloud cloud-b"></div><div class="dawn-fog"></div></div><div class="dawn-layout"><header><span>SALEM 1692 · DAWN</span><button class="dawn-audio" id="dawnAudio">'+(api.audioEnabled()?'صدا روشن':'فعال‌کردن صدا')+'</button></header><main><span class="dawn-overline">'+(stage==='sunrise'?'☀ خورشید طلوع می‌کند':'☾ شب تاریخی سالم')+'</span><div class="dawn-moon-symbol">'+(stage==='sunrise'?'☀':'☾')+'</div><h2>'+title+'</h2><p>'+description+'</p><div class="dawn-timer"><strong id="dawnClock">'+format(seconds())+'</strong><span>'+(stage==='sleep'?'تا فراخوان ساحره‌ها':isVote?'تا پایان تصمیم‌گیری':'تا آغاز اولین نوبت')+'</span><div class="dawn-track"><i id="dawnMeter"></i></div></div></main>'+allied+voice+candidates+result+'<footer>فاز خودکار شب آغازین · دمو محلی</footer></div>';
 root.querySelectorAll('[data-dawn-vote]').forEach(b=>b.onclick=()=>selection(Number(b.dataset.dawnVote)));
 $('#dawnAbstain')?.addEventListener('click',()=>selection(null));
 $('#dawnConfirm')?.addEventListener('click',confirm);
 $('#dawnAudio')?.addEventListener('click',()=>{const on=api.toggleSound();if(on&&stage==='sunrise')api.sound('rooster');render();root?.querySelector('#dawnAudio')?.focus({preventScroll:true});});
 $('#dawnVoice')?.addEventListener('click',()=>api.voice());
 updateTime();
 if(!root.contains(document.activeElement))root.querySelector('#dawnAudio')?.focus({preventScroll:true});
}
window.SalemDawn={begin,resume,stop,tally};
})();