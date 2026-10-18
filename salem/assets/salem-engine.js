(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const P='assets/portraits/portrait-';
const IMG={village:'assets/moonlit_colonial_village_in_fog.webp',witch:'assets/moonlit_witch_in_candlelight.webp',guard:'assets/torchlit_colonial_watchman.webp',cat:'assets/moonlit_cat_over_the_haunted_village.webp',letter:'assets/secret_letter_by_candlelight.webp',evidence:'assets/candlelit_letter_by_the_village_window.webp',gavel:'assets/gavel_of_judgment_in_candlelit_salem.webp'};
const cast=[
  ['شما','Giles Corey',1],['ابیگیل','Abigail Williams',2],['ربکا','Rebecca Nurse',3],['ساموئل','Samuel Parris',4],['مرسی','Mercy Lewis',5],['جان','John Proctor',6],['مری','Mary Warren',7],['سارا','Sarah Good',8],['تیتوبا','Tituba',2],['توماس','Thomas Putnam',7]
];
const TRIALS={innocent:{label:'بی‌گناه',art:IMG.evidence},witch:{label:'جادوگر',art:IMG.witch},constable:{label:'کلانتر',art:IMG.guard}};
const CONFIG={4:[18,1,1],5:[23,1,1],6:[27,2,1],7:[32,2,1],8:[29,2,1],9:[33,2,1],10:[27,2,1]};
const CARD={
  acc1:{label:'اتهام ×۱',kind:'red',value:1,image:IMG.gavel,help:'۱ اتهام به بازیکن هدف اضافه می‌کند.'},
  acc2:{label:'اتهام ×۲',kind:'red',value:2,image:IMG.gavel,help:'۲ اتهام به بازیکن هدف اضافه می‌کند.'},
  acc3:{label:'اتهام ×۳',kind:'red',value:3,image:IMG.gavel,help:'۳ اتهام به بازیکن هدف اضافه می‌کند.'},
  accCotton:{label:'Evidence خنثی',kind:'red',value:1,image:IMG.gavel,help:'کاهش‌یافته توسط Cotton Mather.'},
  witness:{label:'Witness',kind:'red',value:7,image:IMG.gavel,help:'استفاده ویژه Will Griggs از Alibi به عنوان Witness.'},
  alibi:{label:'دفاع (Alibi)',kind:'green',image:IMG.evidence,help:'تا ۳ اتهام را از بازیکن دیگر حذف می‌کند (نسخه دمو).'},
  asylum:{label:'پناهگاه (Asylum)',kind:'blue',image:IMG.letter,help:'بازیکن را تا زمان حذف اثر، از یک حمله شبانه حفاظت می‌کند.'},
  scapegoat:{label:'سپر بلا (Scapegoat)',kind:'green',image:IMG.letter,help:'همه کارت‌های رو به روی یک نفر را به نفر دیگر منتقل می‌کند؛ بدون اثر روی خودت.'},
  curse:{label:'نفرین (Curse)',kind:'green',image:IMG.witch,help:'یک کارت آبیِ روی بازیکن دیگر را حذف می‌کند.'},
  robbery:{label:'Robbery',kind:'green',image:IMG.letter,help:'کارت‌های دست بازیکن هدف را به نفر دیگری منتقل می‌کند.'},
  arson:{label:'Arson',kind:'green',image:IMG.gavel,help:'همه کارت‌های دست یک بازیکن را می‌سوزاند.'},
  matchmaker:{label:'Matchmaker',kind:'blue',image:IMG.evidence,help:'دو بازیکن را به هم مرتبط می‌کند؛ اثر جانبی روی حذف آن‌ها.'},
  blackcat:{label:'گربه سیاه (Black Cat)',kind:'blue',image:IMG.cat,help:'علامت آشکار و منفی؛ صاحبش در Conspiracy در معرض افشای Tryal است.'},
  stocks:{label:'بازداشت (Stocks)',kind:'blue',image:IMG.gavel,help:'بازیکن هدف نوبت بعدی را از دست می‌دهد.'},
  piety:{label:'پارسا (Piety)',kind:'blue',image:IMG.evidence,help:'تا زمان حذف کارت، از اتهام مستقیم قرمز جلوگیری می‌کند.'},
  conspiracy:{label:'Conspiracy',kind:'black',image:IMG.letter,help:'کارت‌های Tryal میان بازیکنان زنده جابه‌جا می‌شوند.'},
  night:{label:'Night',kind:'black',image:IMG.village,help:'جادوگران حمله و کلانتر محافظت را انتخاب می‌کند.'}
};
const sequence=['turn','conspiracy','night','finished'];
const SET_KEY='boardgame.salem.v5';
// The offline simulator is NOT authoritative: hidden cards in localStorage are inspectable.
// A real match must send only per-player projections and validate all commands on the server.
let game=null, secretOpen=false, chosenCard=null, chosenTarget=null, rapid=false, running=false, token=0, toastTimer=null, modalAction=null, lastPhase=null;
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function shuffle(a){let b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function random(a){return a[Math.floor(Math.random()*a.length)];}
function human(){return game?.players[0];}
function living(){return game.players.filter(p=>p.alive);}
function member(id){return game.players.find(p=>p.id===id);}
function current(){return member(game.current);}
function isMyTurn(){return game&&game.phase==='turn'&&game.dawnCompleted===true&&game.current===0&&human().alive&&!running;}
function dangerCount(){return game.players.reduce((v,p)=>v+p.tryals.filter(t=>t.type==='witch'&&t.revealed).length,0);}
function log(t,m){game.logs.unshift({title:t,message:m,id:Date.now()+Math.random()});game.logs=game.logs.slice(0,50);}
function save(){try{if(game)localStorage.setItem(SET_KEY,JSON.stringify(game));}catch(e){}}
function read(){try{const g=JSON.parse(localStorage.getItem(SET_KEY));return g?.schema===5&&g.players?.length>=4&&g.players.length<=10&&Array.isArray(g.deck)&&g.players.every(p=>Array.isArray(p.tryals)&&Array.isArray(p.hand))?g:null;}catch(e){return null;}}
function legalTarget(by,targetId,key){
 const a=member(by),b=member(targetId);if(!a?.alive||!b?.alive||by===targetId||!CARD[key]||CARD[key].kind==='black')return false;
 if(CARD[key].kind==='blue'&&living().length<=2)return false;
 if(CARD[key].kind==='red'&&b.effects.includes('piety'))return false;
 if(key==='scapegoat')return living().filter(p=>p.id!==by&&p.id!==targetId).length>0;
 if(key==='curse')return b.effects.some(x=>CARD[x]?.kind==='blue')||game.blackCat===targetId;
 if((key==='robbery'||key==='arson')&&hasTown(b,'sarah'))return false;
 if(key==='matchmaker'&&(hasTown(b,'mary')||b.effects.includes('matchmaker')))return false;
 return true;
}
function nextAfterBlack(){
 if(!game||game.winner)return;
 const pending=game.pendingDraw;game.pendingDraw=null;game.phase='turn';game.turnEndsAt=Date.now()+60000;
 if(pending?.remaining>0&&member(pending.owner)?.alive&&game.current===pending.owner){drawTwo(pending.owner,pending.remaining);return;}
 advanceTurn();
}
function notice(s){const t=$('#toast');t.textContent=s;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,2600);}
function showModal(title,html,actions=[],closable=false){
  modalAction=null;$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;
  $('#closeModal').hidden=!closable;$('#overlay').hidden=false;
  const footer=document.createElement('div');footer.className='modal-actions';
  actions.forEach(({label,fn,primary})=>{const b=document.createElement('button');b.type='button';b.className='btn '+(primary?'primary':'outline');b.textContent=label;b.addEventListener('click',()=>{closeModal();fn?.();});footer.append(b);});
  if(actions.length)$('#modalBody').append(footer);
}
function closeModal(){ $('#overlay').hidden=true;$('#closeModal').hidden=false; }
function forceClose(){ $('#overlay').hidden=true;$('#closeModal').hidden=false; }
function showLobby(){window.SalemDawn?.stop();window.SalemTurn?.stop();window.SalemAudio?.stop();token++;running=false;$('#gamePage').hidden=true;$('#lobbyPage').hidden=false;refreshLobby();window.scrollTo(0,0);}
function showGame(){ $('#lobbyPage').hidden=true;$('#gamePage').hidden=false;render();window.scrollTo(0,0); }
function refreshLobby(){let n=Number($('#playerCount').value)||6;$('#seatCount').textContent=`${n} جایگاه`;$('#lobbySeats').innerHTML=cast.slice(0,n).map((v,i)=>`<div class="lobby-seat"><img src="${P}${v[2]}.webp" alt=""><div><b>${esc(v[0])}</b><small>${i?'بازیکن نمایشی':'میزبان · شما'}</small></div></div>`).join('');$('#resumeGame').hidden=!read();}
function buildDeck(){
  const counts={acc1:18,acc2:13,acc3:6,alibi:5,asylum:5,scapegoat:4,curse:3,stocks:2,piety:1,robbery:1,arson:1,matchmaker:2};
  let cards=shuffle(Object.entries(counts).flatMap(([k,n])=>Array(n).fill(k)));
  return cards;
}

const TOWN=window.SalemTownHall;
if(!TOWN||TOWN.all.length!==15)throw Error('Salem Town Hall cards were not loaded');
function townId(p){return p?.townHallId||TOWN.all.find(c=>c.en===p?.character)?.id||null;}
function townCard(p){return TOWN.byId[townId(p)]||null;}
function effectiveTown(p){
 let own=townCard(p);
 if(own?.id!=='martha')return own;
 // Martha inherits the ability of the first living person to her right.
 for(let i=1;i<game.players.length;i++){
  const next=game.players[(p.id+i)%game.players.length];
  if(next?.alive&&next.id!==p.id){const card=townCard(next);return card?.id==='martha'?null:card;}
 }
 return null;
}
function hasTown(p,id){return Boolean(p?.alive&&effectiveTown(p)?.id===id);}
function availableTown(p){const c=effectiveTown(p);return c?.initialCharges==null?null:Math.max(0,p?.abilityUses?.[c.id]??c.initialCharges);}
function spendTown(p){
 const c=effectiveTown(p);if(!c||availableTown(p)==null||availableTown(p)<=0)return false;
 p.abilityUses??={};p.abilityUses[c.id]=availableTown(p)-1;p.abilityCharges=p.abilityUses[c.id];return true;
}
function accuseLimit(target,actor=null){
 if(!target)return 7;
 const george=hasTown(target,'george');
 if(actor&&hasTown(actor,'thomas')&&!george)return 6;
 if(actor&&hasTown(actor,'thomas')&&george)return 7;
 return george?8:7;
}
function abilityUsable(p){
 if(!game||!p?.alive||game.phase!=='turn'||game.current!==p.id||game.played!==0||game.action!=='choose'||game.pendingReveal!=null)return false;
 const c=effectiveTown(p);
 return Boolean(c&&['samuel','tituba'].includes(c.id)&&(availableTown(p)||0)>0);
}
function abilitySummary(p){
 const c=townCard(p),active=effectiveTown(p),remaining=availableTown(p);
 return c?`<section class="townhall-ability"><strong>${esc(c.fa)}${active&&active.id!==c.id?` · قابلیت ${esc(active.fa)}`:''}</strong><p>${esc(active?.description||c.description)}</p><div class="ability-tag">${remaining===null?'قابلیت دائمی یا شرطی':remaining===0?'استفاده‌ها تمام شد':remaining+' استفاده باقی‌مانده'}</div>${p.id===0&&abilityUsable(p)?`<button class="btn outline" type="button" data-townhall-activate>فعال‌کردن قابلیت ${esc(active.fa)}</button>`:''}</section>`:'';
}
function bonusDraw(p,count,{allowBlack=true}={}){
 let gained=0;
 while(gained<count&&game.deck.length){
  const key=game.deck.shift();
  if(key==='night'||key==='conspiracy'){
   if(allowBlack){
    game.discard.push(key);
    game.pendingDraw={owner:p.id,remaining:count-gained-1,bonus:true};
    if(key==='night')beginNight();else beginConspiracy();
   }else game.deck.push(key);
   return gained;
  }
  p.hand.push(key);gained++;
 }
 return gained;
}

function dawnCallbacks(){
 return {
  member,save,render,log,
  setPublic:txt=>{game.lastPublic=txt;},
  audioEnabled:()=>Boolean(window.SalemAudio?.isEnabled()),
  toggleSound:()=>window.SalemAudio?.toggle(),
  sound:key=>{if(key==='rooster')window.SalemAudio?.sunrise();},
  voice:()=>notice('ویس خصوصی واقعی بعد از فعال‌شدن توکن مجاز LiveKit در سرور قابل استفاده است.'),
  onDay:()=>{game.dawnCompleted=true;game.turnEndsAt=Date.now()+60000;render();if(game.current!==0)queueBot();}
 };
}
function beginFirstDawn(){
 if(!game||game.dawnCompleted)return;
 window.SalemAudio?.night();
 window.SalemDawn?.begin(game,dawnCallbacks());
 render();
}
function resumeFirstDawn(){window.SalemDawn?.resume(game,dawnCallbacks());}
function turnExpired(){
 if(!game||game.phase!=='turn'||game.winner||game.pendingReveal!=null)return;
 if(game.current===0){if(game.played===0)drawTwo(0);else endTurn();}
 else if(game.played===0)drawTwo(game.current);else advanceTurn();
}
function revealTownIntro(){
 const me=human(),witch=me.tryals.some(t=>t.type==='witch'),guard=me.tryals.some(t=>t.type==='constable');
 const role=witch?'جادوگر':guard?'کلانتر':'شهروند',art=witch?IMG.witch:guard?IMG.guard:IMG.evidence;
 const town=townCard(me);
 showModal('کارت‌های شخصی شما',`<div class="reveal-layout"><img src="${art}" alt="کارت نقش ${role}"><div><span class="eyebrow">PRIVATE REVEAL</span><h3>${role}</h3><div class="info-line"><small>شخصیت انتخاب‌شده</small><strong>${esc(town?.fa||me.character)} / ${esc(town?.en||'')}</strong></div><div class="info-line"><small>قابلیت شخصیت</small><strong>${esc(town?.description||'')}</strong></div><div class="info-line"><small>Tryal خصوصی</small><strong>${me.tryals.map(t=>TRIALS[t.type].label).join(' · ')}</strong></div><div class="info-line"><small>هدف</small><strong>${witch?'بقای تیم جادوگران و حذف شهروندان':'پیداکردن کارت‌های Witch و افشای همه آن‌ها'}</strong></div><p>Tryalهای دیگران محرمانه می‌مانند. کارت شخصیت شما عمومی است.</p></div></div>`,[{label:'ورود به میز',primary:true,fn:()=>{secretOpen=false;render();beginFirstDawn();}}]);
}
function beginTownHallDraft(){
 const offers=game.townHallOffers||[];
 if(!offers.length)return;
 const cards=offers.map((id,i)=>{
  const c=TOWN.byId[id];
  return `<article class="townhall-card" data-townhall-card="${c.id}"><div class="townhall-art"><img src="${c.image}" alt="پرتره ${esc(c.fa)}"><span class="townhall-number">TOWN HALL / ${String(i+1).padStart(2,'0')}</span></div><div class="townhall-info"><div class="townhall-job">${esc(c.job)} · ${c.age} سال · ${c.type==='passive'?'دائمی':c.type==='trigger'?'شرطی':c.type==='twice'?'۲ بار':'۱ بار'}</div><h3>${esc(c.fa)}</h3><span class="townhall-en">${esc(c.en)}</span><p class="townhall-power"><b>توانایی: </b>${esc(c.description)}</p><button type="button" class="btn primary" data-townhall-choose="${c.id}">انتخاب ${esc(c.fa)}</button></div></article>`;
 }).join('');
 showModal('انتخاب شخصیت Salem',`<section class="townhall-draft"><div class="townhall-draft-intro"><strong>${offers.length===2?'دو شخصیت پیشنهاد شده‌اند. یکی را نگه دار.':'شخصیت این مسابقه'}</strong><div>${offers.length===2?'شخصیت انتخاب‌شده در تمام مسابقه قابلیت تو خواهد بود. کارت دوم به‌طور قطعی از این مسابقه کنار گذاشته می‌شود.':'در بازی‌های ۸ نفره و بیشتر، هر بازیکن یک کارت Town Hall دریافت می‌کند.'}</div></div><div class="townhall-draft-grid ${offers.length===1?'single':''}">${cards}</div><div class="townhall-burn-note">کارت انتخاب‌نشده به دست هیچ بازیکن دیگری در این مسابقه نمی‌رسد.</div></section>`,[],false);
 $$('#modalBody [data-townhall-choose]').forEach(button=>button.addEventListener('click',()=>{
  if(!game?.townHallPending)return;
  const id=button.dataset.townhallChoose;
  if(!game.townHallOffers.includes(id))return;
  const chosen=TOWN.byId[id];
  const burnt=game.townHallOffers.filter(v=>v!==id);
  const me=human();me.townHallId=id;me.character=chosen.en;me.portrait=chosen.image;me.abilityCharges=chosen.initialCharges;me.abilityUses={};
  game.burnedTownHall.push(...burnt);game.townHallPending=false;game.phase='reveal';
  if(id==='mary'&&game.blackCat===0){
   const others=game.players.filter(p=>p.id!==0&&p.alive&&!hasTown(p,'mary'));
   game.blackCat=random(others)?.id??1;game.current=game.blackCat;
  }game.townHallOffers=[];
  log('شخصیت انتخاب شد',`${me.name} شخصیت ${chosen.fa} را انتخاب کرد. ${burnt.length?'یک کارت دیگر سوزانده شد.':'بازی با یک کارت Town Hall انجام می‌شود.'}`);
  forceClose();save();render();revealTownIntro();
 }));
}

function start(){
  const n=Number($('#playerCount').value)||6;
  const prefer=$('#testRole').value;
  const [innocent,witch,constable]=CONFIG[n];
  const characterDeal=TOWN.deal(n);
  let pool=shuffle([...Array(innocent).fill('innocent'),...Array(witch).fill('witch'),'constable']);
  const countPer=(innocent+witch+constable)/n;
  let trialSets=Array.from({length:n},(_,i)=>pool.slice(i*countPer,(i+1)*countPer));
  function forceMy(t){if(trialSets[0].includes(t))return;const other=trialSets.findIndex((ts,j)=>j>0&&ts.includes(t));if(other>0){const i=trialSets[other].indexOf(t);const meIdx=trialSets[0].findIndex(x=>t==='witch'?x==='innocent':x==='innocent');const targetIdx=meIdx>=0?meIdx:0;[trialSets[0][targetIdx],trialSets[other][i]]=[trialSets[other][i],trialSets[0][targetIdx]];}}
  if(prefer==='witch')forceMy('witch');
  if(prefer==='constable')forceMy('constable');
  if(prefer==='town'&&trialSets[0].includes('witch')){let good=trialSets.findIndex((ts,j)=>j>0&&!ts.includes('witch'));if(good<0)good=1;let idx=trialSets[0].indexOf('witch');let tidx=trialSets[good].findIndex(x=>x==='innocent');if(tidx<0)tidx=0;[trialSets[0][idx],trialSets[good][tidx]]=[trialSets[good][tidx],trialSets[0][idx]];}
  let players=cast.slice(0,n).map((c,i)=>({id:i,name:c[0],character:i===0?'در انتظار انتخاب':TOWN.byId[characterDeal.hands[i][0]].en,townHallId:i===0?null:characterDeal.hands[i][0],abilityCharges:i===0?null:TOWN.byId[characterDeal.hands[i][0]].initialCharges,portrait:i===0?`${P}${c[2]}.webp`:TOWN.byId[characterDeal.hands[i][0]].image,abilityUses:{},alive:true,witchEver:trialSets[i].includes('witch'),accusations:0,redPile:[],effects:[],tryals:trialSets[i].map((t,k)=>({id:`${i}-${k}`,type:t,revealed:false})),hand:[]}));
  let deck=buildDeck();
  players.forEach(p=>{p.hand=deck.splice(0,3);});
  deck.splice(Math.min(9,Math.floor(deck.length*.23)),0,'conspiracy');
  deck.push('night');
  game={schema:5,dawnCompleted:false,turnEndsAt:null,townHallOffers:characterDeal.hands[0],burnedTownHall:[...characterDeal.unused,...characterDeal.hands.slice(1).flatMap(h=>h.slice(1))],townHallPending:true,players,current:0,turn:1,round:1,phase:'draft',action:'choose',played:0,deck,discard:[],blackCat:null,totalWitches:witch,selectedTarget:null,pendingReveal:null,pendingRevealActor:null,pendingDraw:null,nightTarget:null,nightProtect:null,nightConfessed:false,nightSelection:null,winner:null,logs:[],lastPublic:'میز تشکیل شد. کارت‌ها بین بازیکن‌ها توزیع شدند.',room:$('#roomName').value.trim().slice(0,40)||'میز Salem',lastBreakdown:null};
  chosenCard=null;chosenTarget=null;secretOpen=false;rapid=false;token++;running=false;lastPhase=null;
  log('شروع پرونده',`میز ${n} نفره تشکیل شد. ابتدا کارت Town Hall انتخاب می‌شود.`);save();showGame();
  beginTownHallDraft();
}
function revealIntro(){return revealTownIntro();}
function winCheck(){
 if(!game||game.winner)return Boolean(game?.winner);
 if(dangerCount()>=game.totalWitches){finish('town');return true;}
 if(living().length>0 && living().every(p=>p.witchEver)){finish('witch');return true;}
 return false;
}
function finish(w){game.phase='finished';game.winner=w;running=false;log('پایان مسابقه',w==='town'?'شهر همه کارت‌های Witch را پیدا کرد.':'جادوگران بر بازماندگان شهر غلبه کردند.');save();render();showModal('پایان پرونده',`<img class="modal-poster" src="${w==='town'?IMG.gavel:IMG.witch}" alt=""><p>${w==='town'?'شهروندان پیروز شدند. همه کارت‌های Witch افشا شده‌اند.':'جادوگران پیروز شدند. هیچ شهروندی در بازی باقی نمانده است.'}</p><div class="inset"><strong>خلاصه مسابقه</strong><p>${game.turn} نوبت · ${living().length} بازمانده · ${dangerCount()} / ${game.totalWitches} کارت Witch افشاشده</p></div>`,[{label:'ساخت مسابقه جدید',primary:true,fn:()=>{showLobby();}}]);}
function chooseTarget(id){
 if(!game||game.winner)return;
 const p=member(id);if(!p?.alive)return;
 if(game.phase==='night'){
  if(!human().alive||!['attack','protect'].includes(game.nightSelection))return;
  if(id===0&&game.nightSelection==='protect')return notice('کلانتر نمی‌تواند از خودش حفاظت کند.');
  game.nightTargetUser=id;render();return;
 }
 if(!isMyTurn()||game.pendingReveal!=null||id===0)return;
 chosenTarget=id;game.selectedTarget=id;render();
}
function render(){
 if(!game)return; const me=human();
 if(game.phase!==lastPhase){lastPhase=game.phase;document.body.dataset.salemPhase=game.phase;}
 document.documentElement.style.setProperty('--accent',game.phase==='night'?'#8db3e5':game.phase==='conspiracy'?'#d98a91':'#d5ae71');
 let owner=current();let phaseTitle={draft:'انتخاب شخصیت',reveal:'افشای نقش خصوصی',turn:'روز · نوبت بازیکنان',dawn:'شب آغازین · شهر در خواب',conspiracy:'توطئه در Salem',night:'شب جادوگران','night-report':'در انتظار گزارش شب',finished:'پرونده بسته شد'}[game.phase];
 $('#roomLabel').textContent=game.room+' / '+(game.round||1);$('#statusTitle').textContent=game.winner? 'مسابقه تمام شد' : game.phase==='turn'?(game.current===0?'نوبت شماست':`نوبت ${owner?.name||'رقیب'}`):phaseTitle;
 $('#statusSubtitle').textContent=game.phase==='turn'?(game.current===0?(game.action==='play'?'حداقل یک کارت بازی کن؛ سپس می‌توانی نوبت را تمام کنی.':'دو کارت بکش یا یک کارت بازی کن.'):'بازیکن شبیه‌سازی‌شده در حال تصمیم‌گیری است.'):game.lastPublic;
 $('#turnBadge').textContent=`نوبت ${game.turn}`;$('#phaseBadge').textContent=phaseTitle;$('#aliveBadge').textContent=`${living().length} نفر زنده`;
 $('#deckCount').textContent=game.deck.length;$('#witchProgress').textContent=`${dangerCount()}/${game.totalWitches}`;$('#discardCount').textContent=game.discard.length;$('#roundCount').textContent=game.turn;
 $('#myIdentity').innerHTML=secretOpen?`<div class="secret-content"><img src="${me.tryals.some(t=>t.type==='witch')?IMG.witch:me.tryals.some(t=>t.type==='constable')?IMG.guard:IMG.evidence}" alt=""><div><strong>${me.tryals.some(t=>t.type==='witch')?'جادوگر':me.witchEver?'جادوگر سابق':me.tryals.some(t=>t.type==='constable')?'کلانتر':'شهروند'}</strong><p>${esc(me.character)}</p><p>${me.witchEver?'تیم جادوگران':'تیم شهر'}</p></div></div>`:`<div class="secret-content"><div class="secret-back">✦</div><div><strong>نقش مخفی است</strong><p>برای حفاظت از اطلاعات خصوصی روی دکمه نمایش نقش بزن.</p><p>${esc(me.character)}</p></div></div>`;
 $('#myIdentity').insertAdjacentHTML('beforeend',abilitySummary(me));
 $('#toggleSecret').textContent=secretOpen?'پنهان کردن':'نمایش نقش';
 $('#myTryals').innerHTML=me.tryals.map((t,i)=>{const visible=secretOpen||t.revealed;return `<button class="tryal-mini ${t.revealed?'revealed':''} ${game.phase==='night'&&game.nightSelection==='confess'&&!t.revealed?'selectable':''}" data-my-trial="${i}" aria-label="Tryal ${i+1}: ${visible?TRIALS[t.type].label:'مخفی'}">${visible?`<img src="${TRIALS[t.type].art}" alt=""><b>${TRIALS[t.type].label}</b>`:'<span class="tryal-card-back" aria-hidden="true">✦</span><b>کارت مخفی</b>'}</button>`;}).join('');
 $('#actionStatus').textContent=game.phase==='turn'?(game.current===0?'نوبت من':'منتظر رقیب'):game.phase==='night'?'شب':'رویداد';
 $('#rulesHint').textContent=game.phase==='night'?'جادوگران حمله و کلانتر حفاظت را انتخاب می‌کند. در این دمو اکشن‌های دیگران شبیه‌سازی می‌شود.':'انواع کارت: قرمز برای اتهام، آبی با اثر ماندگار، سبز یک‌بارمصرف و سیاه رویداد اجباری.';
 $('#turnActions').innerHTML=turnButtons();
 $('#selectedTarget').textContent=chosenTarget!=null?`هدف: ${esc(member(chosenTarget)?.name)}`:'برای انتخاب هدف روی بازیکن بزن';
 $('#boardDescription').textContent=game.phase==='night'?'شب روی شهر افتاده است. نقش‌های ویژه برای هدف‌گیری فعال‌اند.':game.pendingReveal!=null?'۷ اتهام ثبت شد؛ یک Tryal پنهان را افشا کن.':'روی تصویر بازیکن هدف کلیک کن؛ کارت‌های مخفی دیگران قابل مشاهده نیستند.';
 renderBoard();renderHand();renderTimeline();renderLogs();renderDock();save();window.SalemTurn?.sync(game,turnExpired);
}
function turnButtons(){
 if(game.phase==='finished')return '<div class="primary-description">مسابقه به پایان رسیده است.</div><button class="btn primary" id="newGameAction">بازی جدید</button>';
 if(game.phase==='night'){
  const special=nightRole();const can=game.nightSelection==='protect'||game.nightSelection==='attack';
  const phips=human().alive&&!game.nightConfessed&&hasTown(human(),'william')&&(availableTown(human())||0)>0;
  return `<p class="primary-description">${special==='witch'?'به‌عنوان جادوگر یک بازیکن را برای حمله انتخاب کن.':special==='constable'?'به‌عنوان کلانتر یک نفر به‌جز خودت را برای حفاظت انتخاب کن.':'اکشن سایر نقش‌ها به‌صورت نمایشی انجام می‌شود.'}</p>${human().alive&&!game.nightConfessed?'<button class="btn outline" data-action="confess">اعتراف برای مصونیت این شب</button>':''}${phips?'<button class="btn primary" data-action="free-confess">اعتراف رایگان با توانایی William Phips</button>':''}<div class="action-stack"><button class="btn primary" data-action="night-done" ${can&&game.nightTargetUser==null?'disabled':''}>${can?'تأیید انتخاب و طلوع':'مشاهده نتیجه شب'}</button></div>`;
 }
 if(game.phase!=='turn')return '<p class="primary-description">در حال اجرای رویداد ویژه هستیم…</p>';
 if(game.current!==0||running)return '<div class="primary-description turn-spinner"><i></i> بازیکنان شبیه‌سازی‌شده مشغول تصمیم‌گیری هستند.</div>';
 if(game.pendingReveal!=null)return `<p class="primary-description">${esc(member(game.pendingReveal).name)} به ۷ اتهام رسیده است. یک کارت Tryal او را انتخاب کن.</p>`;
 const key=human().hand[chosenCard];
 let targetOK=chosenCard!=null&&chosenTarget!=null&&legalTarget(0,chosenTarget,key);
 let canPlay=chosenCard!=null&&chosenTarget!=null;
 return `<p class="primary-description">${game.action==='choose'?'انتخاب با توست: ۲ کارت بکش، یا یکی از کارت‌های دستت را بازی کن.':`تا اینجا ${game.played} کارت بازی شده؛ می‌توانی کارت دیگری بازی کنی یا نوبت را تمام کنی.`}</p><div class="action-stack"><button class="btn outline" data-action="draw" ${game.action!=='choose'?'disabled':''}>کشیدن ۲ کارت و پایان نوبت</button><button class="btn primary" data-action="play" ${!targetOK?'disabled':''}>بازی کارت روی هدف</button><button class="btn outline" data-action="end">${game.played?"پایان نوبت و رفتن به بعدی":"رد نوبت · کشیدن اجباری ۲ کارت"}</button></div>${!canPlay?'<div class="game-tip">برای بازی‌کردن: یک کارت از پایین صفحه و یک بازیکن از روی میز انتخاب کن.</div>':''}`;
}
function renderBoard(){
 const livingP=living();let mid=Math.ceil(game.players.length/2);
 const display=(arr)=>`<div class="seat-grid" style="--cols:${Math.min(arr.length,5)}">${arr.map(p=>{
  const sel=chosenTarget===p.id,turn=game.phase==='turn'&&game.current===p.id;
  const trialHtml=p.tryals.map((t,i)=>`<span class="${t.revealed?'open':''}" title="${t.revealed?TRIALS[t.type].label:'Tryal مخفی'}">${t.revealed?(t.type==='witch'?'W':t.type==='constable'?'C':'✓'):'?'}</span>`).join('');
  return `<button class="player-seat ${sel?'selected':''} ${turn?'turn-owner':''} ${!p.alive?'dead':''}" data-seat="${p.id}" aria-pressed="${sel}"><div class="seat-ident"><img src="${p.portrait}" alt=""><div><strong>${esc(p.name)} ${p.id===0?'(شما)':''}</strong><small>${esc(p.character)}</small></div></div><div class="seat-meta"><span>${p.alive?`اتهام ${p.accusations} / ${accuseLimit(p)}`:'حذف‌شده'}</span><span>${game.blackCat===p.id?'🐈‍⬛ گربه سیاه':p.effects.length?'اثر '+p.effects.length:''}</span></div><div class="accuse-meter"><i style="width:${p.accusations/accuseLimit(p)*100}%"></i></div><div class="tiny-trials">${trialHtml}</div></button>`;
 }).join('')}</div>`;
 let ic=game.phase==='night'?'☾':game.phase==='conspiracy'?'✉':'⚖';let title=game.phase==='night'?'شب تصمیم‌های پنهان':game.phase==='conspiracy'?'توطئه در شهر':game.phase==='finished'?'پایان پرونده':game.pendingReveal!=null?'وقت افشای Tryal':game.current===0?'اکنون نوبت توست':`نوبت ${current()?.name}`;
 let sub=game.phase==='turn'&&game.current===0?'یا دو کارت بکش یا حداقل یک کارت بازی کن.':game.lastPublic;
 $('#tableBoard').className='salem-board '+(game.phase==='night'?'night':game.phase==='conspiracy'?'conspiracy':'');
 $('#tableBoard').innerHTML=display(game.players.slice(0,mid))+`<div class="table-hub"><div><div class="hub-icon">${ic}</div><div class="hub-eyebrow">SALEM 1692 · ${game.phase.toUpperCase()}</div><h3>${esc(title)}</h3><p>${esc(sub)}</p><div class="hub-deck">${game.deck.length} کارت در دسته · ${livingP.length} نفر زنده</div></div></div>`+display(game.players.slice(mid));
 $$('#tableBoard [data-seat]').forEach(b=>b.addEventListener('click',()=>chooseTarget(Number(b.dataset.seat))));
}
function renderHand(){
 let cards=human().hand;$('#handCount').textContent=`${cards.length} کارت`;
 $('#handCards').innerHTML=cards.length?cards.map((k,i)=>{const c=CARD[k];return `<button class="action-card ${chosenCard===i?'selected':''}" data-hand="${i}" ${!isMyTurn()?'disabled':''}><img src="${c.image}" alt=""><div class="action-card-content"><b>${esc(c.label)}</b><small>${esc(c.help)}</small><span class="kind">${{red:'اتهام',green:'سبز',blue:'آبی'}[c.kind]||'ویژه'}</span></div></button>`;}).join(''):'<p class="aside-caption">کارت دستت تمام شده؛ در نوبت بعد دو کارت بکش.</p>';
 $$('#handCards [data-hand]').forEach(b=>b.addEventListener('click',()=>{chosenCard=Number(b.dataset.hand);render();}));
}
function renderTimeline(){
 const entries=[['turn','نوبت‌ها','کشیدن ۲ کارت یا بازی حداقل ۱ کارت.'],['conspiracy','توطئه','چرخش کارت‌های مخفی Tryal میان بازماندگان.'],['night','شب','هدف جادوگران، محافظت کلانتر و اعتراف.'],['finished','پایان','برد شهر با افشای همه Witchها؛ برد جادوگران با حذف غیرجادوگران.']];
 $('#phaseTimeline').innerHTML=entries.map(([id,note,desc],i)=>`<div class="timeline-item ${game.phase===id?'active':''}"><i>${['☀','✉','☾','♛'][i]}</i><div><strong>${note}</strong><p>${desc}</p></div></div>`).join('');
}
function renderLogs(){ $('#eventLog').innerHTML=game.logs.slice(0,11).map(l=>`<div class="log-row"><b>${esc(l.title)}</b><p>${esc(l.message)}</p></div>`).join('');}
function renderDock(){
 const dock=$('#mobileDock'); if(game.phase!=='turn'||game.current!==0||running||game.winner||game.pendingReveal!=null){dock.innerHTML='<div class="dock-text"><strong>SALEM</strong><small>در انتظار رویداد یا نوبت بعدی</small></div>';return;}
 dock.innerHTML=`<div class="dock-text"><strong>نوبت شما</strong><small>${game.played?'پایان نوبت یا بازی کارت دیگر':'انتخاب کارت و هدف'}</small></div><button class="btn primary" id="dockPrimary">${game.played?"پایان نوبت":"رد نوبت · ۲ کارت"}</button>`;
 $('#dockPrimary')?.addEventListener('click',()=>endTurn());
}
function removeAlibiAccusations(target){
 // Choose a combination of actual red cards whose values total at most 3.
 const pile=target.redPile||[];
 let best=[],score=0;
 for(let mask=1;mask<(1<<pile.length)&&pile.length<12;mask++){
   let total=0,indices=[];
   for(let j=0;j<pile.length;j++)if(mask&(1<<j)){total+=CARD[pile[j]]?.value||0;indices.push(j);}
   if(total<=3&&total>score){best=indices;score=total;}
 }
 for(const i of best.reverse()){
  const removed=pile.splice(i,1)[0];
  if(removed!=='witness')game.discard.push(removed==='accCotton'?'acc3':removed);
 }
 target.accusations=Math.max(0,target.accusations-score);
 return score;
}
function playCard(by,handIndex,targetId,bot=false,destinationId=null,alibiMode=null){
 const owner=member(by);
 if(!owner?.alive||!game.dawnCompleted||game.phase!=='turn'||by!==game.current||game.pendingReveal!=null)return false;
 const key=owner.hand[handIndex],card=CARD[key],target=member(targetId);
 if(!card||!legalTarget(by,targetId,key))return false;
 if(key==='alibi'&&hasTown(owner,'will')&&!bot&&alibiMode==null){
  showModal('Will Griggs — انتخاب اثر Alibi',`<div class="inset"><strong>دو روش استفاده از کارت</strong><p>می‌توانی Alibi را برای حذف تا ۳ اتهام خرج کنی، یا از قابلیت پزشک برای ۷ اتهام مستقیم استفاده کنی.</p></div><div class="action-row"><button type="button" class="btn outline" data-alibi-mode="defense">حذف اتهام‌ها</button><button type="button" class="btn primary" data-alibi-mode="witness" ${target.effects.includes('piety')?'disabled':''}>Witness · ۷ اتهام</button></div>`,[],true);
  $$('#modalBody [data-alibi-mode]').forEach(btn=>btn.onclick=()=>{
   const mode=btn.dataset.alibiMode;
   if(mode==='witness'&&target.effects.includes('piety'))return;
   forceClose();playCard(by,handIndex,targetId,false,destinationId,mode);
  });
  return true;
 }
 if(alibiMode==='witness'&&target.effects.includes('piety'))return false;
 if(key==='scapegoat'&&!bot&&destinationId==null){
  const options=living().filter(p=>p.id!==by&&p.id!==targetId);
  showModal('Scapegoat — انتخاب مقصد',`<div class="inset"><strong>انتقال تمام کارت‌های رو‌به‌روی ${esc(target.name)}</strong><p>طبق قانون اول Salem، مقصد نباید خودت یا بازیکن مبدأ باشد. یک نفر را برای انتقال انتخاب کن.</p></div><div class="tryal-chooser">${options.map(p=>`<button class="btn outline" data-scapegoat-to="${p.id}">${esc(p.name)}</button>`).join('')}</div>`,[],true);
  $$('#modalBody [data-scapegoat-to]').forEach(btn=>btn.addEventListener('click',()=>{
   const id=Number(btn.dataset.scapegoatTo);
   if(!legalTarget(by,targetId,key)||id===by||id===targetId||!member(id)?.alive)return;
   forceClose();playCard(by,handIndex,targetId,false,id);
  }));
  return true;
 }
 owner.hand.splice(handIndex,1);
 if(card.kind==='green')game.discard.push(key);
 let body='';
 const useWillWitness=key==='alibi'&&hasTown(owner,'will')&&(bot?true:alibiMode==='witness');
 if(card.kind==='red'||useWillWitness){
  const value=useWillWitness?7:key==='acc3'&&hasTown(target,'cotton')?1:card.value;
  target.accusations+=value;target.redPile.push(useWillWitness?'witness':key==='acc3'&&hasTown(target,'cotton')?'accCotton':key);
  body=`${owner.name} با ${useWillWitness?'Alibi به‌عنوان Witness':card.label}، ${value} اتهام روی ${target.name} گذاشت.`;
  const limit=accuseLimit(target,owner);
  if(target.accusations>=limit){
   if(hasTown(owner,'abigail')){
    game.discard.push(...owner.redPile);owner.redPile=[];owner.accusations=0;
    log('توانایی ابیگیل','پس از اتهام نهایی، تمام اتهام‌های جلوی ابیگیل حذف شدند.');
   }
   if(hasTown(owner,'ann')){
    bonusDraw(owner,2,{allowBlack:false});
    log('توانایی آن','آن پیش از افشای Tryal دو کارت اضافی دریافت کرد.');
   }
   target.accusations=0;
   game.discard.push(...target.redPile.filter(k=>k!=='witness').map(k=>k==='accCotton'?'acc3':k));target.redPile=[];
   game.pendingReveal=target.id;game.pendingRevealActor=by;
  }
 }else if(key==='alibi'){
  const removed=removeAlibiAccusations(target);
  body=`${owner.name} با Alibi تعداد ${removed} اتهام از ${target.name} برداشت.`;
 }else if(key==='asylum'){
  target.effects.push('asylum');
  body=`${owner.name} کارت پناهگاه را مقابل ${target.name} گذاشت.`;
 }else if(key==='stocks'){
  target.effects.push('stocks');
  body=`${owner.name}، ${target.name} را بازداشت کرد؛ نوبت بعدی او رد می‌شود.`;
 }else if(key==='piety'){
  target.effects.push('piety');
  body=`${owner.name}، کارت Piety را برای ${target.name} قرار داد.`;
 }else if(key==='arson'){
  game.discard.push(...target.hand);target.hand=[];
  body=`${owner.name} با Arson کارت‌های دست ${target.name} را سوزاند.`;
 }else if(key==='robbery'){
  const options=living().filter(p=>p.id!==target.id&&p.id!==owner.id);
  const dest=random(options);
  if(!dest)return false;
  dest.hand.push(...target.hand);target.hand=[];
  body=`${owner.name} کارت‌های دست ${target.name} را به ${dest.name} داد.`;
 }else if(key==='matchmaker'){
  target.effects.push('matchmaker');
  body=`${owner.name} برای ${target.name} کارت پیوند گذاشت.`;
 }else if(key==='blackcat'){
  if(game.blackCat!=null&&game.blackCat!==target.id)game.discard.push('blackcat');
  game.blackCat=target.id;
  body=`${owner.name} گربه سیاه را مقابل ${target.name} قرار داد.`;
 }else if(key==='curse'){
  let removed;
  if(game.blackCat===target.id){removed='blackcat';game.blackCat=null;}
  else {const index=target.effects.findIndex(k=>CARD[k]?.kind==='blue');removed=target.effects.splice(index,1)[0];}
  if(removed)game.discard.push(removed);
  body=`${owner.name} با Curse کارت آبی ${CARD[removed]?.label||removed} را از جلوی ${target.name} برداشت.`;
 }else if(key==='scapegoat'){
  const other=destinationId!=null?member(destinationId):random(living().filter(p=>p.id!==targetId&&p.id!==by));
  if(!other?.alive||other.id===by||other.id===targetId)return false;
  other.redPile.push(...target.redPile);
  other.accusations+=target.accusations;
  other.effects.push(...target.effects);
  if(game.blackCat===target.id)game.blackCat=other.id;
  target.redPile=[];target.accusations=0;target.effects=[];
  body=`${owner.name} تمام کارت‌های رو‌به‌روی ${target.name} را به ${other.name} منتقل کرد.`;
  if(other.accusations>=7){
   other.accusations=0;game.discard.push(...other.redPile);other.redPile=[];
   game.pendingReveal=other.id;game.pendingRevealActor=by;
  }
 }
 game.lastPublic=body;log('کارت بازی شد',body);
 game.action='play';game.played++;
 if(!bot){chosenCard=null;chosenTarget=null;}
 render();
 if(game.pendingReveal!=null)requestTryalReveal(game.pendingReveal);
 return true;
}
function requestTryalReveal(id){
 const p=member(id);if(!p||game?.pendingReveal!==id)return;
 const choices=p.tryals.map((t,i)=>({t,i})).filter(x=>!x.t.revealed);
 if(!choices.length){game.pendingReveal=null;game.pendingRevealActor=null;return;}
 const actor=game.pendingRevealActor;
 const finishSelection=idx=>{
   if(game.pendingReveal!==id||!choices.some(x=>x.i===idx))return;
   game.pendingReveal=null;game.pendingRevealActor=null;
   revealTryal(p.id,idx,'accusation');
   render();
 };
 if(actor!==0){
   // The simulating opponent who played the seventh accusation selects.
   finishSelection(random(choices).i);
   return;
 }
 const cards=choices.map(({i})=>`<button class="tryal-mini secret" data-reveal-index="${i}" aria-label="انتخاب کارت مخفی شماره ${i+1}"><b>Tryal ${i+1}</b></button>`).join('');
 showModal('هفت اتهام — انتخاب بازیکن اتهام‌زننده',`<div class="inset"><strong>${esc(p.name)} زیر اتهام است</strong><p>شما اتهام هفتم را ثبت کرده‌ای. یکی از کارت‌های مخفی این بازیکن را برای افشا انتخاب کن. بقیه کارت‌ها محرمانه می‌مانند.</p></div><div class="tryal-chooser">${cards}</div>`,[],false);
 $$('#modalBody [data-reveal-index]').forEach(btn=>btn.addEventListener('click',()=>{
  const idx=Number(btn.dataset.revealIndex);forceClose();finishSelection(idx);
 }));
}
function revealTryal(id,index,source='tryal'){
 const p=member(id),t=p?.tryals[index];if(!t||t.revealed)return;
 t.revealed=true;
 if(source!=='confess'&&source!=='death'){
  for(const watcher of living().filter(q=>q.id!==id&&hasTown(q,'rebecca'))){
   bonusDraw(watcher,1,{allowBlack:false});
   log('توانایی ربکا',`${watcher.name} با افشای Tryal یک کارت کشید.`);
  }
 }log('کارت Tryal افشا شد',`یک کارت ${TRIALS[t.type].label} از ${p.name} رو شد.`);
 game.lastPublic=`Tryal ${p.name} افشا شد: ${TRIALS[t.type].label}`;
 if(t.type==='witch'||p.tryals.every(x=>x.revealed))eliminate(id,t.type==='witch'?'افشای کارت Witch':'افشای تمام Tryalها');
 winCheck();
}
function eliminate(id,why,fromMatchmaker=false){
 const p=member(id);if(!p?.alive)return;
 const matched=p.effects.includes('matchmaker');
 const inheritors=living().filter(other=>other.id!==id&&hasTown(other,'john'));
 for(const inheritor of inheritors){
  inheritor.hand.push(...p.hand,...p.effects.filter(k=>CARD[k]?.kind==='blue'));
  log('توانایی جان',`${inheritor.name} کارت‌های باقی‌مانده ${p.name} را به ارث برد.`);
 }
 p.alive=false;p.tryals.forEach(t=>t.revealed=true);if(!inheritors.length)game.discard.push(...p.hand,...p.effects.filter(k=>CARD[k]?.kind==='blue'));
 game.discard.push(...(p.redPile||[]).filter(k=>k!=='witness'),...p.effects.filter(k=>CARD[k]?.kind!=='blue'));p.hand=[];p.redPile=[];p.effects=[];
 if(living().length===2){for(const q of living()){const keep=[];for(const key of q.effects){if(CARD[key]?.kind==='blue')game.discard.push(key);else keep.push(key);}q.effects=keep;}}
 log('بازیکن حذف شد',`${p.name} به علت ${why} از بازی حذف شد.`);
 if(matched&&!fromMatchmaker){
  const partner=living().find(q=>q.effects.includes('matchmaker')&&!hasTown(q,'mary'));
  if(partner)eliminate(partner.id,'پیوند Matchmaker',true);
 }
 if(game.blackCat===id){game.discard.push('blackcat');game.blackCat=null;}
 if(living().length<=2&&game.blackCat!=null){game.discard.push('blackcat');game.blackCat=null;}
 if(!winCheck()&&game.phase==='turn'&&game.current===id){advanceTurn();}}
function drawTwo(by,count=2){
 const owner=member(by);
 if(!owner?.alive||!game.dawnCompleted||game.phase!=='turn'||game.current!==by||game.pendingReveal!=null)return false;
 if(by===0)window.SalemTurn?.drawn();
 let pulled=0,drawnKeys=[];
 for(let i=0;i<count;i++){
  if(!game.deck.length)game.deck=['night'];
  const key=game.deck.shift(),card=CARD[key];
  if(!card)break;
  // With two survivors, Blue cards are set aside and replaced immediately.
  if(living().length<=2&&card.kind==='blue'){game.discard.push(key);i--;continue;}
  if(card.kind==='black'){
   game.pendingDraw={owner:by,remaining:count-i-1};
   log('کارت سیاه کشیده شد',`${owner.name} کارت ${card.label} را رو کرد؛ اثر بلافاصله اجرا می‌شود.`);
   game.lastPublic=`رویداد ویژه: ${card.label}`;
   game.discard.push(key);
   if(key==='conspiracy')beginConspiracy();else beginNight();
   if(by===0)notice('رویداد کارت سیاه بلافاصله فعال شد.');
   return true;
  }
  owner.hand.push(key);drawnKeys.push(key);pulled++;
 }
 if(pulled)log('کشیدن کارت',`${owner.name} تعداد ${pulled} کارت کشید.`);
 if(count===2&&drawnKeys.length===2&&drawnKeys.every(k=>k==='acc1')&&hasTown(owner,'giles')){
  const added=bonusDraw(owner,1,{allowBlack:false});
  if(added)log('توانایی جایلز',`${owner.name} با کشیدن دو Accusation یک کارت سوم هم برداشت.`);
 }
 if(by===0)notice(`${pulled} کارت به دستت اضافه شد.`);
 game.played=0;game.action='choose';chosenCard=null;chosenTarget=null;
 render();advanceTurn();
 return true;
}
function endTurn(){
 if(!isMyTurn())return;
 if(game.played===0){drawTwo(0);return;}
 log('پایان نوبت',`شما بعد از بازی ${game.played} کارت، نوبت را تمام کردید.`);advanceTurn();
}
function advanceTurn(){
 if(!game.dawnCompleted||game.phase!=='turn'||game.winner||game.pendingReveal!=null)return;
 if(!living().length)return;
 let pos=game.current,next=null;
 // Stocks skips a player's next turn; multiple Stocks can skip multiple turns.
 for(let attempts=0;attempts<game.players.length*8;attempts++){
  pos=(pos+1)%game.players.length;
  const candidate=member(pos);
  if(!candidate?.alive)continue;
  if(pos<=game.current)game.round++;
  game.turn++;
  const i=candidate.effects.indexOf('stocks');
  if(i>=0){
   candidate.effects.splice(i,1);
   game.discard.push('stocks');
   log('بازداشت',`نوبت ${candidate.name} به‌دلیل Stocks رد شد.`);
   continue;
  }
  next=pos;break;
 }
 if(next===null){render();return;}
 game.current=next;game.played=0;game.action='choose';game.turnEndsAt=Date.now()+60000;chosenCard=null;chosenTarget=null;render();
 if(next!==0)queueBot();
}
function queueBot(){if(!game||game.phase!=='turn'||game.current===0||game.winner||game.pendingReveal!=null)return;const t=token;running=true;render();setTimeout(()=>{if(t!==token||!game||game.phase!=='turn'||game.current===0)return;running=false;botMove();},rapid?45:370);}
function botMove(){if(!game||game.phase!=='turn'||game.current===0||game.pendingReveal!=null)return;
 const p=current();if(!p?.alive){advanceTurn();return;}
 const others=living().filter(x=>x.id!==p.id);
 const offensive=p.hand.map((k,i)=>({k,i,validTargets:others.filter(t=>legalTarget(p.id,t.id,k))})).filter(x=>x.validTargets.length);
 if(!offensive.length||Math.random()<.45){drawTwo(p.id);return;}
 let chosen=random(offensive), target=random(chosen.validTargets);
 if(['acc1','acc2','acc3','curse'].includes(chosen.k)){
  // AI uses only public table information, NEVER another player's private Tryals.
  const weighted=chosen.validTargets.flatMap(q=>Array(Math.max(1,Math.min(5,1+Math.floor(q.accusations/2)))).fill(q));
  target=random(weighted);
 } else if(['alibi','asylum'].includes(chosen.k)){
  target=random(living().filter(q=>q.id!==p.id));
 }
 playCard(p.id,chosen.i,target.id,true);
 if(game.winner||game.phase!=='turn'||game.pendingReveal!=null)return;
 if(p.hand.length&&Math.random()<.2){const item=p.hand.findIndex(k=>['acc1','acc2','acc3'].includes(k));if(item>=0){playCard(p.id,item,random(others).id,true);if(game.pendingReveal!=null||game.winner)return;}}
 advanceTurn();
}
function beginConspiracy(){
 game.turnEndsAt=null;
 game.phase='conspiracy';
 log('Conspiracy','بازیکنان از همسایه خود کارت Tryal پنهان دریافت می‌کنند.');
 chosenCard=null;chosenTarget=null;
 const drawer=game.pendingDraw?.owner;
 const revealBlackCat=idx=>{
  const cat=member(game.blackCat);
  if(cat?.alive&&idx!=null)revealTryal(cat.id,idx,'conspiracy');
  if(game.winner)return;
  const alive=living();
  // Choose one concealed Tryal from each player simultaneously before moving.
  const offers=alive.map(p=>{
   const concealed=p.tryals.filter(t=>!t.revealed);
   if(!concealed.length)return null;
   const pick=random(concealed);p.tryals.splice(p.tryals.indexOf(pick),1);
   return pick;
  });
  alive.forEach((p,i)=>{
   const incoming=offers[(i+1)%alive.length];
   if(incoming){
    p.tryals.push(incoming);
    if(incoming.type==='witch')p.witchEver=true;
    // Constable ability is derived from current Tryal ownership.
   }
  });
  game.lastPublic='توطئه: کارت‌های مخفی جابه‌جا شدند و ممکن است جادوگران جدیدی وجود داشته باشند.';
  log('جابجایی Tryal','هر بازیکن یک کارت پنهان از همسایه‌اش گرفت.');
  if(winCheck())return;
  render();
  showModal('توطئه در Salem',`<img class="modal-poster" src="${IMG.letter}" alt=""><p>Conspiracy اجرا شد. کارت‌های Tryal پنهان جابه‌جا شدند؛ تیم جادوگران ممکن است تغییر کرده باشد.</p><p class="inset">کارت‌های مخفی دیگران به شما نشان داده نمی‌شوند.</p>`,[{label:'ادامه بازی',primary:true,fn:nextAfterBlack}]);
 };
 const cat=member(game.blackCat);
 const options=cat?.alive?cat.tryals.map((t,i)=>({t,i})).filter(x=>!x.t.revealed):[];
 if(!options.length){revealBlackCat(null);return;}
 if(drawer!==0){revealBlackCat(random(options).i);return;}
 showModal('Conspiracy — انتخاب Tryal گربه سیاه',`<p>چون کارت سیاه را تو کشیدی، یکی از Tryalهای بازیکن دارای گربه سیاه (${esc(cat.name)}) را انتخاب کن.</p><div class="tryal-chooser">${options.map(({i})=>`<button class="tryal-mini secret" data-cat-trial="${i}"><b>Tryal ${i+1}</b></button>`).join('')}</div>`,[],false);
 $$('#modalBody [data-cat-trial]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.catTrial);forceClose();revealBlackCat(i);}));
}
function nightRole(){const me=human();if(!me.alive)return 'town';if(me.witchEver)return 'witch';if(me.tryals.some(t=>t.type==='constable'&&!t.revealed))return 'constable';return 'town';}
function beginNight(){
 game.turnEndsAt=null;
 game.phase='night';game.nightConfessed=false;game.nightTargetUser=null;
 const witches=living().filter(p=>p.witchEver);const towns=living().filter(p=>!p.witchEver);
 game.nightTarget=random(towns.length?towns:living())?.id??null;
 const guard=living().find(p=>p.tryals.some(t=>t.type==='constable'&&!t.revealed));
 game.nightProtect=guard?random(living().filter(p=>p.id!==guard.id))?.id??null:null;
 game.nightSelection=nightRole()==='witch'?'attack':nightRole()==='constable'?'protect':null;
 game.lastPublic='شب شروع شده؛ نقش‌های مخفی بی‌صدا تصمیم می‌گیرند.';
 log('آغاز شب','جادوگران برای حذف و کلانتر برای حفاظت آماده شدند.');
 chosenCard=null;chosenTarget=null;render();
}
function confess(){
 if(game.phase!=='night'||!human().alive||game.nightConfessed)return;
 const options=human().tryals.map((t,i)=>({t,i})).filter(x=>!x.t.revealed);
 if(!options.length)return notice('هیچ کارت Tryal پنهانی نداری.');
 game.nightSelection='confess';notice('برای اعتراف یک کارت Tryal خودت را از پنل نقش انتخاب کن.');render();
}
function completeConfession(i){
 if(game.phase!=='night'||game.nightSelection!=='confess')return;
 if(human().tryals[i]?.revealed)return;
 game.nightConfessed=true;game.nightSelection=null;
 revealTryal(0,i,'confess');
 if(game.winner)return;
 log('اعتراف','شما یک Tryal خود را افشا کردید و در این شب مصونیت گرفتید.');render();
}
function resolveNight(){
 if(game.phase!=='night')return;
 if(game.nightSelection==='attack'&&game.nightTargetUser!=null)game.nightTarget=game.nightTargetUser;
 if(game.nightSelection==='protect'&&game.nightTargetUser!=null)game.nightProtect=game.nightTargetUser;
 const p=member(game.nightTarget);
 let report='شهر بدون قربانی بیدار شد.';
 if(p?.alive){
  if(game.nightProtect===p.id||p.effects.includes('asylum')||(p.id===0&&game.nightConfessed)){
    report='حمله شبانه ناکام ماند. بازیکن هدف نجات یافت.';
    // Asylum is a persistent Blue card. It remains until moved/removed or its holder dies.
  }else{eliminate(p.id,'حمله شبانه');report=`${p.name} در تاریکی شب از بازی حذف شد.`;}
 }
 log('طلوع روز',report);game.lastPublic=report;
 if(game.winner)return;
 game.phase='night-report';game.nightTargetUser=null;game.nightSelection=null;game.nightConfessed=false;
 // Both Conspiracy and normal discards re-enter the deck after Night.
 const discard=game.discard.filter(x=>x!=='night');
 game.deck=shuffle([...game.deck.filter(x=>x!=='night'),...discard]);game.deck.push('night');game.discard=[];
 render();showModal('گزارش بامداد',`<img class="modal-poster" src="${IMG.village}" alt=""><p>${esc(report)}</p><p class="inset">کارت‌های دورریز برای دور بعد بازگردانده شدند. ترتیب نوبت‌های معمول ادامه پیدا می‌کند.</p>`,[{label:'بازگشت به بازی',primary:true,fn:nextAfterBlack}]);
}

function activateTownHall(){
 const me=human();
 if(!abilityUsable(me))return notice('این قابلیت الآن قابل فعال‌کردن نیست.');
 const card=effectiveTown(me);
 if(card.id==='samuel'){
  const options=game.discard.filter(k=>CARD[k]&&CARD[k].kind!=='black');
  if(!options.length)return notice('هنوز کارت قابل برداشت در دورریز وجود ندارد.');
  let chosen=[];
  const paint=()=>{
   const html=options.map((key,i)=>`<button type="button" class="btn ${chosen.includes(i)?'primary':'outline'}" data-parris-take="${i}">${esc(CARD[key].label)} ${chosen.includes(i)?'✓':''}</button>`).join('');
   $('#modalBody').innerHTML=`<div class="inset"><strong>Samuel Parris · برداشتن از دورریز</strong><p>حداکثر دو کارت انتخاب کن. این عمل کل نوبت توست. تعداد استفاده باقی‌مانده: ${availableTown(me)}</p></div><div class="tryal-chooser">${html}</div><button type="button" class="btn primary" data-parris-confirm ${!chosen.length?'disabled':''}>برداشتن ${chosen.length} کارت و پایان نوبت</button>`;
   $$('#modalBody [data-parris-take]').forEach(b=>b.addEventListener('click',()=>{
    const idx=Number(b.dataset.parrisTake);
    if(chosen.includes(idx))chosen=chosen.filter(x=>x!==idx);
    else if(chosen.length<2)chosen.push(idx);
    paint();
   }));
   $('#modalBody [data-parris-confirm]')?.addEventListener('click',()=>{
    if(!abilityUsable(me)||!chosen.length||!spendTown(me))return;
    const keys=chosen.map(i=>options[i]);
    for(const key of keys){const pos=game.discard.indexOf(key);if(pos>=0)game.discard.splice(pos,1);}
    me.hand.push(...keys);
    log('توانایی ساموئل',`${me.name} به‌جای دسته کارت، ${keys.length} کارت از دورریز برداشت.`);
    forceClose();render();advanceTurn();
   });
  };
  showModal('توانایی ساموئل پاریس','',[],true);paint();return;
 }
 if(card.id==='tituba'){
  // Exactly one use. Full deck is visible privately, with arrow actions to reorder.
  let edited=[...game.deck];
  const paint=()=>{
   $('#modalBody').innerHTML=`<div class="inset"><strong>تیتوبا · یک بار در بازی</strong><p>تمام دسته را فقط خودت می‌بینی. با دکمه‌های بالا و پایین ترتیب را عوض کن؛ سپس ذخیره کن. این قابلیت نوبت را تمام نمی‌کند.</p></div><div class="townhall-deck-editor">${edited.map((key,i)=>`<div class="townhall-deck-line"><span>${i+1}. ${esc(CARD[key]?.label||key)}</span><div><button type="button" class="btn tiny" data-deck-up="${i}" ${i===0?'disabled':''}>↑</button><button type="button" class="btn tiny" data-deck-down="${i}" ${i===edited.length-1?'disabled':''}>↓</button></div></div>`).join('')}</div><button class="btn primary" data-tituba-confirm>ثبت چینش دسته</button>`;
   $$('#modalBody [data-deck-up]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.deckUp);if(i>0){[edited[i],edited[i-1]]=[edited[i-1],edited[i]];paint();}});
   $$('#modalBody [data-deck-down]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.deckDown);if(i<edited.length-1){[edited[i],edited[i+1]]=[edited[i+1],edited[i]];paint();}});
   $('#modalBody [data-tituba-confirm]').onclick=()=>{
    if(!abilityUsable(me)||!spendTown(me))return;
    game.deck=edited;log('توانایی تیتوبا','تیتوبا یک بار ترتیب دسته کارت‌ها را تغییر داد.');
    forceClose();render();
   };
  };
  showModal('توانایی تیتوبا','',[],true);paint();
 }
}
function freePhipsConfess(){
 if(game.phase!=='night'||!human()?.alive||game.nightConfessed||!hasTown(human(),'william')||!spendTown(human()))return;
 game.nightConfessed=true;game.nightSelection=null;
 log('توانایی ویلیام فیپس','اعتراف رایگان انجام شد؛ Tryal مخفی نماند.');
 notice('امشب مصون شدی؛ هیچ Tryal افشا نشد.');render();
}

function handleAction(kind){
 if(kind==='free-confess'){freePhipsConfess();return;}
 if(kind==='draw'){if(isMyTurn()&&game.action==='choose')drawTwo(0);return;}
 if(kind==='play'){
  if(!isMyTurn())return;
  if(chosenCard==null||chosenTarget==null)return notice('یک کارت و یک هدف انتخاب کن.');
  const k=human().hand[chosenCard]; if(!k)return notice('کارت معتبر نیست.');
  if(chosenTarget===0)return notice('کارت را باید روی بازیکن دیگری بازی کنی.');
  playCard(0,chosenCard,chosenTarget);return;
 }
 if(kind==='end')return endTurn();
 if(kind==='night-done'){if(game.phase==='night')resolveNight();return;}
 if(kind==='confess')return confess();
 if(kind==='new')return showLobby();
}
function instructions(){showModal('آموزش Salem 1692',`<div class="reveal-layout"><img src="${IMG.gavel}" alt=""><div><div class="info-line"><small>نوبت</small><strong>هر بازیکن ۲ کارت می‌کشد و نوبتش تمام می‌شود، یا یک یا چند کارت بازی می‌کند.</strong></div><div class="info-line"><small>اتهام</small><strong>هفت اتهام برابر با افشای یک کارت Tryal هدف است.</strong></div><div class="info-line"><small>کارت‌های ویژه</small><strong>Conspiracy توزیع Tryal را عوض می‌کند؛ Night حمله و حفاظت را اجرا می‌کند.</strong></div><div class="info-line"><small>برد</small><strong>شهر: افشای تمام Witchها. جادوگران: حذف تمام کسانی که هرگز جادوگر نبودند.</strong></div><p>این دمو قوانین هسته را پیاده‌سازی می‌کند، اما اثر بعضی کارت‌های سبز/آبی و رفتار رقیب‌ها برای طراحی UX ساده‌سازی شده است.</p></div></div>`,[{label:'متوجه شدم',primary:true,fn:()=>{}}],true);}
function init(){
 $('#homeButton').addEventListener('click',showLobby);$('#helpButton').addEventListener('click',instructions);
 $('#playerCount').addEventListener('change',refreshLobby);$('#startGame').addEventListener('click',start);
 $('#resumeGame').addEventListener('click',()=>{game=read();if(game){token++;running=false;secretOpen=false;chosenCard=null;chosenTarget=null;if(game.phase==='conspiracy'){game.phase='turn';game.pendingDraw=null;}showGame();if(game.townHallPending){beginTownHallDraft();return;}if(game.phase==='dawn'){resumeFirstDawn();return;}if(!game.dawnCompleted&&game.phase==='turn'){revealTownIntro();return;}if(game.phase==='turn'&&game.pendingReveal!=null)requestTryalReveal(game.pendingReveal);else if(game.phase==='turn'&&game.current!==0)queueBot();}else notice('فایلی برای ادامه یافت نشد.');});
 $('#toggleSecret').addEventListener('click',()=>{secretOpen=!secretOpen;render();});
 $('#myIdentity').addEventListener('click',e=>{if(e.target.closest('[data-townhall-activate]'))activateTownHall();});
 $('#turnActions').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)handleAction(b.dataset.action);else if(e.target.id==='newGameAction')showLobby();});
 $('#myTryals').addEventListener('click',e=>{const b=e.target.closest('[data-my-trial]');if(b&&game?.phase==='night'&&game.nightSelection==='confess')completeConfession(Number(b.dataset.myTrial));});
 $('#fastTurn').addEventListener('click',()=>{rapid=!rapid;$('#fastTurn').textContent=rapid?'سرعت عادی رقیب‌ها':'تندتر شدن نوبت رقبا';notice(rapid?'شبیه‌سازی رقبا سریع‌تر شد.':'سرعت معمول فعال شد.');});
 $('#saveButton').addEventListener('click',()=>{save();notice('دموی بازی در حافظه محلی مرورگر ذخیره شد.');});
 $('#resetButton').addEventListener('click',()=>{forceClose();showLobby();});
 $('#closeModal').addEventListener('click',forceClose);
 $('#overlay').addEventListener('click',e=>{if(e.target.id==='overlay'&&!$('#closeModal').hidden)forceClose();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#overlay').hidden&&!$('#closeModal').hidden)forceClose();});
 refreshLobby();
}
// API تستی فقط برای کنترل دموی محلی، نه قرارداد یا امنیت سرور
window.SalemDemo={getSnapshot:()=>game?{phase:game.phase,current:game.current,turn:game.turn,alive:living().length,deck:game.deck.length,witchProgress:dangerCount(),winner:game.winner}:null};
init();
})();
