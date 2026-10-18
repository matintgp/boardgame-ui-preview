/* BoardGame shared select, built around the original form control. */
(()=>{
'use strict';
const base='.bg-select',nativeClass='bg-native';
let active=null;
const all=(s,el=document)=>Array.from(el.querySelectorAll(s));
const clamp=(v,min,max)=>Math.max(min,Math.min(v,max));
let ids=0;
function close(focus=false){
 if(!active)return;
 const {host,trigger,pop}=active;
 host.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');
 if(pop)pop.remove();
 active=null;
 if(focus)trigger.focus({preventScroll:true});
}
function place(){
 if(!active)return;
 const r=active.trigger.getBoundingClientRect(),panel=active.pop;
 const spaceBelow=innerHeight-r.bottom-8,spaceAbove=r.top-8;
 const height=Math.min(panel.scrollHeight,300,Math.max(spaceBelow,spaceAbove)-8);
 const below=spaceBelow>=Math.min(220,panel.scrollHeight)||spaceBelow>=spaceAbove;
 panel.style.width=Math.max(155,r.width)+'px';
 panel.style.maxHeight=Math.max(100,height)+'px';
 panel.style.left=clamp(r.left,8,Math.max(8,innerWidth-r.width-8))+'px';
 panel.style.top=(below?r.bottom+5:Math.max(6,r.top-height-5))+'px';
}
function enhance(select){
 if(!select||select.dataset.bgEnhanced==='yes'||select.multiple||select.size>1)return;
 select.dataset.bgEnhanced='yes';
 const host=document.createElement('span');host.className='bg-select';
 select.before(host);host.append(select);select.classList.add(nativeClass);
 const trigger=document.createElement('button');trigger.type='button';trigger.className='bg-select-trigger';
 const id='bg-listbox-'+(++ids);
 trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-controls',id);trigger.setAttribute('aria-expanded','false');
 host.append(trigger);
 const sync=()=>{
  const opt=select.selectedOptions[0]||select.options[select.selectedIndex];
  trigger.textContent=opt?.textContent||'انتخاب کنید';
  trigger.disabled=select.disabled;
  if(active?.host===host){fill(active);place();}
 };
 function fill(st){
  st.pop.innerHTML='';
  [...select.options].forEach((o,i)=>{
   const b=document.createElement('button');b.type='button';b.className='bg-select-option';
   b.role='option';b.id=id+'-item-'+i;
   b.dataset.index=i;b.textContent=o.textContent;b.disabled=o.disabled;
   b.setAttribute('aria-selected',String(i===select.selectedIndex));
   if(i===st.cursor)b.classList.add('is-active');
   b.addEventListener('pointermove',()=>{st.cursor=i;refreshCursor();});
   b.addEventListener('click',()=>choose(i));
   st.pop.append(b);
  });
  refreshCursor();
 }
 function refreshCursor(){
  if(!active||active.host!==host)return;
  all('.bg-select-option',active.pop).forEach((el,i)=>el.classList.toggle('is-active',i===active.cursor));
  const o=active.pop.children[active.cursor];if(o)o.scrollIntoView({block:'nearest'});
 }
 function choose(i){
  const option=select.options[i];if(!option||option.disabled)return;
  const changed=select.selectedIndex!==i;
  select.selectedIndex=i;close(true);sync();
  if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}
 }
 function open(){
  if(trigger.disabled)return;
  if(active?.host===host){close(true);return;}
  close();
  const pop=document.createElement('div');pop.className='bg-select-popover';pop.id=id;
  pop.setAttribute('role','listbox');pop.setAttribute('aria-label',(select.closest('label')?.textContent||select.getAttribute('aria-label')||'انتخاب گزینه').trim().slice(0,75));
  document.body.append(pop);
  active={host,trigger,pop,cursor:Math.max(0,select.selectedIndex)};
  host.classList.add('is-open');trigger.setAttribute('aria-expanded','true');
  fill(active);place();
 }
 trigger.addEventListener('click',open);
 trigger.addEventListener('keydown',e=>{
  if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(e.key))e.preventDefault();
  if(e.key==='Escape'){close(true);return;}
  if(!active||active.host!==host){
   if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key))open();
   return;
  }
  const opts=[...select.options];let idx=active.cursor;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){let n=0;do{idx=clamp(idx+(e.key==='ArrowDown'?1:-1),0,opts.length-1);n++;}while(opts[idx]?.disabled&&n<opts.length);}
  if(e.key==='Home')idx=opts.findIndex(o=>!o.disabled);
  if(e.key==='End')idx=opts.findLastIndex(o=>!o.disabled);
  if(idx>=0){active.cursor=idx;refreshCursor();}
  if(e.key==='Enter'||e.key===' ')choose(active.cursor);
 });
 select.addEventListener('change',sync);
 const mo=new MutationObserver(sync);mo.observe(select,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','selected','label']});
 sync();
}
function scan(){all('select:not([data-bg-enhanced])').forEach(enhance);}
document.addEventListener('pointerdown',e=>{if(active&&!active.host.contains(e.target)&&!active.pop.contains(e.target))close();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.stopPropagation();close(true);}});
window.addEventListener('scroll',place,true);window.addEventListener('resize',place);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
let pending=false;
new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;scan();});}).observe(document.documentElement,{childList:true,subtree:true});
window.BoardGameSelect={refresh:scan,close:()=>close()};
})();