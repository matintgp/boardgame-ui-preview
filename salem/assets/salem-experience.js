/* Salem Experience V4: UI-only enhancement layer over existing game rules.
   Never use this view for authorization or multiplayer secret distribution. */
(()=>{
'use strict';
const STORAGE='boardgame.salem.experience.v4';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults={motion:true,ambient:true,sfx:true,contrast:false,compact:false,largeText:false,quietMode:false};
let prefs={...defaults},state=null,cardDict={},selected=null,drawer=null,hud=null,lastPhase='',lastTurn=-1,tutorialStep=0;
const steps=[
 {title:'میز و نوبت‌ها',description:'بازیکنی که دور تصویرش روشن است، صاحب نوبت است. نفرهای بعدی در نوار بالای میز دیده می‌شوند.',target:'#tableBoard'},
 {title:'کارت‌های دست',description:'برای اجرای یک کارت، ابتدا کارت و سپس بازیکن هدف را انتخاب کن. توضیح کارت را با «بررسی کارت» ببین.',target:'#handCards'},
 {title:'انتخاب حرکت',description:'می‌توانی یک یا چند کارت بازی کنی. اگر هیچ کارتی بازی نکردی، باید دو کارت بکشی و نوبتت تمام می‌شود.',target:'#turnActions'},
 {title:'Tryal و قابلیت شخصیت',description:'کارت‌های مخفی تو فقط برای خودت هستند. قابلیت شخصیت در پنل سمت چپ نمایش داده می‌شود.',target:'#myIdentity'},
 {title:'گزارش مسابقه',description:'رویدادهای عمومی در سمت راست ثبت می‌شوند؛ بعد از پایان بازی خلاصه و بازپخش متنی قابل دیدن است.',target:'#eventLog'}
];
function load(){
 try{const parsed=JSON.parse(localStorage.getItem(STORAGE)||'null');if(parsed&&typeof parsed==='object'){for(const k of Object.keys(defaults))if(typeof parsed[k]==='boolean')prefs[k]=parsed[k];}}catch{}
 apply();
}
function apply(){
 document.body.dataset.sxMotion=prefs.motion?'on':'off';
 document.body.dataset.sxContrast=prefs.contrast?'high':'normal';
 document.body.dataset.sxCompact=prefs.compact?'yes':'no';
 document.body.dataset.sxLargeText=prefs.largeText?'yes':'no';
 document.body.dataset.sxQuiet=prefs.quietMode?'yes':'no';
}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(prefs));}catch{}}
function make(){
 if(!hud){
  hud=$('#salemExperienceHud')||document.createElement('section');
  hud.id='salemExperienceHud';hud.className='sx-hud panel';hud.setAttribute('aria-label','اطلاعات نوبت و تجربه بازی');
  const status=$('#gamePage .game-status');
  if(!hud.parentNode)status?.after(hud);
 }
 if(!drawer){
  drawer=document.createElement('div');drawer.className='sx-shade';drawer.id='sxShade';drawer.hidden=true;
  drawer.innerHTML='<section class="sx-sheet" role="dialog" aria-modal="true" aria-labelledby="sxTitle"><header><div><span class="sx-eyebrow">SALEM EXPERIENCE</span><h2 id="sxTitle">گزینه‌ها</h2></div><button class="btn outline" data-sx-close>بستن ×</button></header><div class="sx-sheet-body" id="sxBody"></div></section>';
  document.body.append(drawer);
  drawer.querySelector('[data-sx-close]').addEventListener('click',close);
  drawer.addEventListener('pointerdown',e=>{if(e.target===drawer)close();});
  drawer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const nodes=[...drawer.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(x=>x.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 }
}
let returnFocus=null;
function open(title,html,hook){
 make();returnFocus=document.activeElement;drawer.querySelector('#sxTitle').textContent=title;drawer.querySelector('#sxBody').innerHTML=html;
 drawer.hidden=false;document.body.classList.add('sx-dialog-open');
 hook?.(drawer.querySelector('#sxBody'));
 drawer.querySelector('[data-sx-close]')?.focus({preventScroll:true});
}
function close(){
 if(!drawer)return;drawer.hidden=true;document.body.classList.remove('sx-dialog-open');const element=returnFocus;returnFocus=null;if(element?.isConnected)element.focus({preventScroll:true});
}
function settings(){
 const toggles=[
  ['motion','انیمیشن‌ها و حرکت کارت‌ها','با خاموش‌کردن، افکت‌های نمایشی حذف می‌شوند.'],
  ['ambient','فضای صوتی شب و روز','به روشن‌بودن صدای مرورگر هم وابسته است.'],
  ['sfx','افکت‌های کوتاه بازی','افشا، کارت و گربه سیاه.'],
  ['contrast','کنتراست بیشتر','مناسب دید بهتر متن و دکمه‌ها.'],
  ['compact','چیدمان فشرده','مناسب نمایشگر کوچک‌تر و لپ‌تاپ.'],
  ['largeText','فونت درشت‌تر','برای خوانایی بیشتر روی موبایل و دسکتاپ.'],
  ['quietMode','حالت تمرکز','کاهش جزئیات متحرک و عناصر غیرضروری.']
 ];
 open('تنظیمات بازی',toggles.map(([id,name,desc])=>'<label class="sx-setting"><span><strong>'+esc(name)+'</strong><small>'+esc(desc)+'</small></span><input type="checkbox" data-sx-setting="'+id+'" '+(prefs[id]?'checked':'')+'></label>').join('')+
 '<div class="sx-settings-footer"><button class="btn outline" data-sx-tour>شروع آموزش مرحله‌ای</button><button class="btn outline" data-sx-guide>کتابچه کارت‌ها</button><button class="btn outline" data-sx-audio>'+(window.SalemAudio?.isEnabled()?'خاموش‌کردن صدای محیط':'فعال‌کردن صدای محیط')+'</button></div>',body=>{
  body.querySelectorAll('[data-sx-setting]').forEach(el=>el.addEventListener('change',()=>{const name=el.dataset.sxSetting;prefs[name]=el.checked;save();apply();if(name==='ambient'){if(el.checked&&window.SalemAudio?.isEnabled())window.SalemAudio?.night();else window.SalemAudio?.stop();}}));
  body.querySelector('[data-sx-tour]')?.addEventListener('click',()=>{close();tutorial(0);});
  body.querySelector('[data-sx-guide]')?.addEventListener('click',()=>guide());
  body.querySelector('[data-sx-audio]')?.addEventListener('click',()=>{window.SalemAudio?.toggle();settings();});
 });
}
function details(c){
 if(!c)return '<p class="sx-muted">ابتدا یکی از کارت‌های دست را انتخاب کن.</p>';
 return '<div class="sx-card-detail"><img src="'+esc(c.image)+'" alt="تصویر '+esc(c.label)+'"><div><span class="sx-pill">'+esc({red:'اتهام',blue:'اثر آبی',green:'اقدام سبز',black:'رویداد'}[c.kind]||'کارت')+'</span><h3>'+esc(c.label)+'</h3><p>'+esc(c.help)+'</p><small>برای اجرای کارت، پنجره را ببند و روی بازیکن مجاز بزن.</small></div></div>';
}
function inspect(key){const card=cardDict[key];open('جزئیات کارت',details(card),null);}
function guide(){
 const cards=Object.entries(cardDict).filter(([key,c])=>c?.help&&!['witness','accCotton','blackcat'].includes(key));
 const roles=window.SalemTownHall?.all||[];
 const contents='<div class="sx-library-head"><p class="sx-muted">قوانین کارت‌ها و شخصیت‌ها را بدون افشای اطلاعات مخفی رقبا مرور کن.</p>'+
 '<label class="sx-search"><span>جستجو</span><input type="search" id="sxLibrarySearch" placeholder="نام یا قابلیت را بنویس…" autocomplete="off"></label>'+
 '<div class="sx-filter" role="group" aria-label="دسته‌بندی کتابچه">'+
 [['all','همه'],['red','اتهام'],['green','اقدام'],['blue','آبی'],['black','رویداد'],['role','شخصیت‌ها']].map(([id,label])=>
  '<button type="button" data-sx-filter="'+id+'" aria-pressed="'+String(id==='all')+'">'+label+'</button>').join('')+
 '</div></div><div id="sxLibraryEntries" class="sx-guide-grid" aria-live="polite"></div><p id="sxLibraryEmpty" class="sx-muted" hidden>نتیجه‌ای پیدا نشد.</p>';
 open('کتابچه تعاملی Salem',contents,body=>{
  const input=body.querySelector('#sxLibrarySearch'),list=body.querySelector('#sxLibraryEntries');
  let filter='all';
  function draw(){
   const q=input.value.trim().toLocaleLowerCase();
   const filteredCards=filter==='role'?[]:cards.filter(([key,c])=>(filter==='all'||c.kind===filter)&&[key,c.label,c.help].join(' ').toLocaleLowerCase().includes(q));
   const filteredRoles=(filter==='all'||filter==='role')?roles.filter(c=>[c.en,c.fa,c.description,c.job].join(' ').toLocaleLowerCase().includes(q)):[];
   list.innerHTML=filteredCards.map(([key,c])=>'<button type="button" class="sx-guide-entry" data-guide-card="'+esc(key)+'"><img loading="lazy" src="'+esc(c.image)+'" alt=""><span>'+esc(c.label)+'</span><small>'+esc({red:'اتهام',green:'اقدام',blue:'آبی',black:'رویداد'}[c.kind]||'')+'</small></button>').join('')+
   filteredRoles.map(c=>'<button type="button" class="sx-guide-entry" data-guide-role="'+esc(c.id)+'"><img loading="lazy" src="'+esc(c.image)+'" alt=""><span>'+esc(c.fa)+'</span><small>'+esc(c.en)+'</small></button>').join('');
   body.querySelector('#sxLibraryEmpty').hidden=filteredCards.length+filteredRoles.length>0;
  }
  input.addEventListener('input',draw);
  body.querySelectorAll('[data-sx-filter]').forEach(button=>button.addEventListener('click',()=>{
   filter=button.dataset.sxFilter;
   body.querySelectorAll('[data-sx-filter]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
   draw();
  }));
  list.addEventListener('click',event=>{
   const card=event.target.closest('[data-guide-card]'),role=event.target.closest('[data-guide-role]');
   if(card)inspect(card.dataset.guideCard);
   if(role){
    const person=window.SalemTownHall?.byId[role.dataset.guideRole];
    if(person)open('قابلیت شخصیت','<div class="sx-card-detail"><img src="'+esc(person.image)+'" alt="پرتره '+esc(person.fa)+'"><div><span class="sx-pill">'+esc(person.type==='passive'?'دائمی':person.type==='trigger'?'شرطی':person.type==='twice'?'دوبار':'یک‌بار')+'</span><h3>'+esc(person.fa)+'</h3><small dir="ltr">'+esc(person.en)+'</small><p>'+esc(person.description)+'</p></div></div>');
   }
  });
  draw();
 });
}
function tutorial(index){
 tutorialStep=index;
 const step=steps[index];if(!step){close();return;}
 const target=document.querySelector(step.target);
 if(target&&target.getClientRects().length&&!(document.body.dataset.salemDawn==='true'))target.scrollIntoView({behavior:prefs.motion?'smooth':'auto',block:'center'});
 open('آموزش تعاملی · '+(index+1)+' از '+steps.length,
  '<div class="sx-tutorial"><span class="sx-step">مرحله '+(index+1)+' / '+steps.length+'</span><h3>'+esc(step.title)+'</h3><p>'+esc(step.description)+'</p><div class="sx-tutorial-actions"><button class="btn outline" data-tutorial-skip>ردکردن آموزش</button>'+(index?'<button class="btn outline" data-tutorial-prev>قبلی</button>':'')+'<button class="btn primary" data-tutorial-next>'+(index===steps.length-1?'پایان':'بعدی ←')+'</button></div></div>',body=>{
  body.querySelector('[data-tutorial-skip]')?.addEventListener('click',close);
  body.querySelector('[data-tutorial-prev]')?.addEventListener('click',()=>tutorial(index-1));
  body.querySelector('[data-tutorial-next]')?.addEventListener('click',()=>index===steps.length-1?close():tutorial(index+1));
 });
}
function upcoming(players,current,phase){
 if(!players?.length)return [];
 const idx=players.findIndex(p=>p.id===current);
 if(idx<0)return [];
 const result=[];
 for(let n=0;n<players.length&&result.length<4;n++){
  const p=players[(idx+n)%players.length];if(p.alive)result.push(p);
 }
 return result;
}
function update(s){
 state=s;make();
 if(!s){hud.hidden=true;return;}
 const isGame=$('#gamePage')&&!$('#gamePage').hidden;
 hud.hidden=!isGame;
 if(!isGame)return;
 const order=upcoming(s.players,s.current,s.phase),onTurn=s.phase==='turn';
 const first=order[0];
 const html='<div class="sx-hud-title"><div><span class="sx-eyebrow">TURN ORDER</span><strong>'+(onTurn?'نوبت صحبت و بازی کارت':'در انتظار رویداد')+'</strong></div><div class="sx-hud-ops"><button type="button" class="btn outline tiny" data-sx-guide>کارت‌ها</button><button type="button" class="btn outline tiny" data-sx-tour>آموزش</button><button type="button" class="btn outline tiny" data-sx-settings>تنظیمات ⚙</button></div></div>'+
 '<div class="sx-speaker"><div class="sx-next-list">'+order.map((p,i)=>'<div class="sx-next-player '+(i===0&&onTurn?'sx-is-speaker':'')+'" title="'+esc(p.name)+'"><div class="sx-avatar-wrap"><img src="'+esc(p.portrait)+'" alt=""></div><strong>'+esc(p.name)+(p.id===0?' (شما)':'')+'</strong><small>'+(i===0?'نوبت فعلی':'بعدی '+i)+'</small></div>').join('')+'</div><div class="sx-speaker-label">'+(onTurn?'<span class="sx-onair">نوبت: '+esc(first?.name)+'</span>':'<span class="sx-onair neutral">میکروفون نوبتی بسته است</span>')+'<span class="sx-voice-warning">نمای صوتی دمو · تماس واقعی متصل نیست</span></div></div>';
 hud.innerHTML=html;
 hud.querySelector('[data-sx-guide]')?.addEventListener('click',guide);
 hud.querySelector('[data-sx-settings]')?.addEventListener('click',settings);
 hud.querySelector('[data-sx-tour]')?.addEventListener('click',()=>tutorial(0));
 if(s.phase!==lastPhase){lastPhase=s.phase;document.body.dataset.sxPhase=s.phase;}
 if(s.turn!==lastTurn){lastTurn=s.turn;}
}
let effectTimer=null;
function effect(kind,data={}){
 if(!prefs.motion||window.matchMedia?.('(prefers-reduced-motion:reduce)').matches)return;
 document.querySelector('.sx-effect')?.remove();
 const el=document.createElement('div');el.className='sx-effect sx-'+kind;el.setAttribute('aria-hidden','true');
 const content={cat:'گربه سیاه',reveal:'افشای کارت Tryal',card:'کارت بازی شد',draw:'کارت تازه',victory:'پایان پرونده'}[kind]||'SALEM';
 el.innerHTML='<div class="sx-effect-icon">'+({cat:'☾',reveal:'✦',card:'⚜',draw:'✧',victory:'♛'}[kind]||'✦')+'</div><div class="sx-effect-label">'+esc(data.label||content)+'</div>';
 document.body.append(el);
 clearTimeout(effectTimer);effectTimer=setTimeout(()=>el.remove(),1550);
 if(prefs.sfx)window.SalemAudio?.cue?.(kind);
}
function onSelected(key){selected=key;}
function catalog(definitions){cardDict=definitions||{};}
function endgame(s){
 const logs=(s?.logs||[]).slice(0,35);
 const players=s?.players||[];
 const text=s?.winner==='town'?'شهر پیروز شد':'جادوگران پیروز شدند';
 const cards='<div class="sx-end-players">'+players.map(p=>'<article class="sx-end-player"><img src="'+esc(p.portrait)+'" alt=""><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.character)+'</small><span>'+(p.witchEver?'تیم جادوگران':'تیم شهر')+'</span></div></article>').join('')+'</div>';
 const history='<details class="sx-history"><summary>مرور '+logs.length+' رویداد مهم مسابقه</summary>'+logs.map(x=>'<div><strong>'+esc(x.title)+'</strong><p>'+esc(x.message)+'</p></div>').join('')+'</details>';
 return '<div class="sx-end"><span class="sx-eyebrow">MATCH COMPLETE</span><h3>'+text+'</h3><div class="sx-end-stats"><b>'+Number(s.turn||0)+' نوبت</b><b>'+players.filter(p=>p.alive).length+' بازمانده</b><b>'+Number(s.totalWitches||0)+' کارت Witch</b></div>'+cards+history+'<p class="sx-muted">نقش‌ها فقط پس از پایان مسابقه نشان داده شده‌اند. این خلاصه از شبیه‌سازی مرورگر ساخته می‌شود.</p></div>';
}
window.SalemExperience=Object.freeze({load,update,settings,guide,tutorial,inspect,effect,onSelected,catalog,endgame,close,upcoming,getPrefs:()=>({...prefs})});
function start(){load();$('#inspectCardButton')?.addEventListener('click',()=>selected?inspect(selected):guide());$('#experienceSettingsButton')?.addEventListener('click',settings);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();