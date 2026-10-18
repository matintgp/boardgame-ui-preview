const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const base = path.resolve(__dirname, '../salem');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const raw = fs.readFileSync(path.join(base, 'assets/salem-engine.js'), 'utf8');
const townHallSource=fs.readFileSync(path.join(base,'assets/town-hall.js'),'utf8');
const dawnSource=fs.readFileSync(path.join(base,'assets/salem-dawn.js'),'utf8');
// Test-only instrumentation, NEVER committed to the game bundle.
const source = raw.replace(
  'window.SalemDemo=',
  'window.__SalemQA={state:()=>game,render,drawTwo,playCard,advanceTurn,revealTryal,eliminate,legalTarget,accuseLimit,activateTownHall,freePhipsConfess};window.SalemDemo='
).replace(
  'function beginFirstDawn(){',
  'function beginFirstDawn(){if(window.__QA_SKIP_DAWN){game.phase="turn";game.dawnCompleted=true;game.turnEndsAt=Date.now()+60000;return;}'
);
assert.notEqual(source, raw, 'test instrumentation injection point');

function setup(size=6, role='town') {
  const dom = new JSDOM(html, {
    runScripts:'outside-only',
    url:'https://boardgame-qa.invalid/salem/',
    pretendToBeVisual:true
  });
  dom.window.scrollTo = () => {};
  // Prevent asynchronous simulated bot timers surviving the jsdom instance in unit tests.
  dom.window.setTimeout = () => 0;
  dom.window.clearTimeout = () => {};
  dom.window.__QA_SKIP_DAWN=true;
  dom.window.eval(townHallSource);
  dom.window.eval(dawnSource);
  dom.window.eval(source);
  const doc=dom.window.document;
  doc.getElementById('playerCount').value=String(size);
  doc.getElementById('testRole').value=role;
  doc.getElementById('startGame').click();
  const option=doc.querySelector('[data-townhall-choose]');
  assert.ok(option,'Town Hall selection must open before private role reveal');
  option.click();
  const qa=dom.window.__SalemQA;
  assert.ok(qa.state());
  // Existing generic gameplay tests must be independent of the newly random Town Hall draft.
  const state=qa.state();
  state.__qaTownHallChoice=state.players[0].townHallId;
  state.current=0;
  state.players[0].townHallId='giles';
  state.players[0].character='Giles Corey';
  state.players[0].abilityUses={};
  qa.render();
  return {dom,doc,qa};
}
const click=(doc,selector)=>{
 const element=doc.querySelector(selector);
 assert.ok(element, 'missing '+selector);
 element.click();
};

test('official Tryal counts for each supported lobby size',()=>{
 for(const n of [4,5,6,7,8,9,10]){
  const {dom,qa}=setup(n);
  const s=qa.state();
  assert.equal(s.players.length,n);
  assert.equal(s.players.every(p=>p.tryals.length === (n<=7?5:n<=9?4:3)),true);
  assert.equal(s.players.reduce((v,p)=>v+p.tryals.filter(t=>t.type==='witch').length,0),n<=5?1:2);
  assert.equal(s.players.reduce((v,p)=>v+p.tryals.filter(t=>t.type==='constable').length,0),1);
  dom.window.close();
 }
});

test('public table and closed private cards do not reveal unknown roles in the DOM',()=>{
 const {dom,doc,qa}=setup();
 const state=qa.state();
 assert.equal(doc.querySelectorAll('#myTryals img').length,0);
 for(const p of state.players.slice(1)){
  assert.equal(doc.querySelector('[data-seat="'+p.id+'"] .tiny-trials').textContent.replace(/\s/g,''), '?'.repeat(p.tryals.length));
 }
 assert.equal(typeof dom.window.SalemDemo.debugConspiracy,'undefined');
 assert.equal(typeof dom.window.SalemDemo.debugAdvanceToNight,'undefined');
 assert.equal('players' in dom.window.SalemDemo.getSnapshot(),false);
 dom.window.close();
});

test('turn enforcement, illegal self-target and owner of seventh accusation',()=>{
 const {dom,doc,qa}=setup();
 click(doc,'#modalBody .modal-actions button');
 click(doc,'[data-seat="0"]');
 assert.equal(doc.getElementById('selectedTarget').textContent.includes('هدف: شما'),false);
 const s=qa.state();
 s.players[1].townHallId='giles';s.players[0].hand=['acc1'];s.players[1].accusations=6;s.players[1].redPile=Array(6).fill('acc1');
 qa.render();
 click(doc,'[data-hand="0"]');click(doc,'[data-seat="1"]');
 click(doc,'[data-action="play"]');
 assert.equal(s.pendingReveal,1);
 assert.equal(s.pendingRevealActor,0);
 assert.equal(s.players[1].accusations,0);
 assert.equal(s.players[1].redPile.length,0);
 click(doc,'[data-reveal-index]');
 assert.equal(s.pendingReveal,null);
 assert.equal(s.current,0,'human may continue their turn after seventh accusation');
 assert.equal(s.played,1);
 assert.equal(qa.playCard(1,0,0,true),false,'opponent cannot act during player turn');
 dom.window.close();
});

test('Black Conspiracy interrupts drawing, resolves, then takes the remaining card',()=>{
 const {dom,doc,qa}=setup();
 click(doc,'#modalBody .modal-actions button');
 const s=qa.state();s.deck=['conspiracy','acc1','night'];
 s.blackCat=1;
 s.players[1].tryals.forEach(t=>t.type='innocent');
 s.players.forEach(p=>{if(p.townHallId==='rebecca')p.townHallId='giles';});
 s.players[0].hand=[];qa.render();
 click(doc,'[data-action="draw"]');
 assert.equal(s.phase,'conspiracy');
 assert.equal(s.pendingDraw.remaining,1);
 assert.equal(s.pendingDraw.owner,0);
 click(doc,'[data-cat-trial]');
 assert.equal(s.phase,'conspiracy');
 click(doc,'#modalBody .modal-actions button');
 assert.equal(s.phase,'turn');
 assert.equal(s.pendingDraw,null);
 assert.equal(s.players[0].hand.includes('acc1'),true);
 assert.notEqual(s.current,0);
 dom.window.close();
});

test('night resolution returns from a black event to the current turn progression',()=>{
 const {dom,doc,qa}=setup();
 click(doc,'#modalBody .modal-actions button');
 const s=qa.state();s.deck=['night','acc2','night'];
 qa.render();
 click(doc,'[data-action="draw"]');
 assert.equal(s.phase,'night');
 assert.equal(s.pendingDraw.remaining,1);
 s.nightTarget=1;s.nightProtect=1; // explicitly prevent night elimination so this test isolates interruption/resume
 // Isolate the continuation case from random cards reshuffled from previous discards.
 s.discard=[];
 if(s.nightSelection==='protect')click(doc,'[data-seat="1"]');
 if(s.nightSelection==='attack')click(doc,'[data-seat="1"]');
 click(doc,'[data-action="night-done"]');
 assert.equal(s.phase,'night-report');
 assert.equal(s.turnEndsAt,null);
 click(doc,'#modalBody .modal-actions button');
 assert.equal(s.phase,'turn');
 assert.equal(s.pendingDraw,null);
 assert.equal(s.players[0].hand.includes('acc2'),true);
 dom.window.close();
});

test('all local image paths exist and are nonempty',()=>{
 const imgRoot=path.join(base,'assets');
 const matches=[...raw.matchAll(new RegExp('assets/[a-z0-9_/-]+[.]webp','g'))].map(x=>x[0]);
 assert.ok(matches.length>5);
 for(const image of new Set(matches)){
   assert.ok(fs.statSync(path.join(base,image)).size>50,'missing '+image);
 }
 assert.ok(fs.statSync(path.join(imgRoot,'salem.css')).size>1000);
});

test('Scapegoat destination is explicitly chosen and never the acting player',()=>{
 const {dom,doc,qa}=setup();
 click(doc,'#modalBody .modal-actions button');
 const s=qa.state();
 s.players[0].hand=['scapegoat'];
 s.players[1].accusations=2;
 s.players[1].redPile=['acc2'];
 s.players[1].effects=['asylum'];
 qa.render();
 click(doc,'[data-hand="0"]');
 click(doc,'[data-seat="1"]');
 click(doc,'[data-action="play"]');
 assert.ok(doc.querySelector('[data-scapegoat-to="2"]'));
 assert.equal(doc.querySelector('[data-scapegoat-to="0"]'),null);
 assert.equal(doc.querySelector('[data-scapegoat-to="1"]'),null);
 click(doc,'[data-scapegoat-to="2"]');
 assert.equal(s.players[1].accusations,0);
 assert.equal(s.players[1].effects.length,0);
 assert.equal(s.players[2].accusations,2);
 assert.equal(s.players[2].effects.includes('asylum'),true);
 assert.equal(s.played,1);
 dom.window.close();
});

test('Alibi removes at most three actual accusation points',()=>{
 const {dom,qa,doc}=setup();
 click(doc,'#modalBody .modal-actions button');
 const s=qa.state();
 s.players[0].hand=['alibi'];
 s.players[1].accusations=4;s.players[1].redPile=['acc3','acc1'];
 assert.equal(qa.playCard(0,0,1,false),true);
 if(doc.querySelector('[data-alibi-mode="defense"]'))click(doc,'[data-alibi-mode="defense"]');
 assert.equal(s.players[1].accusations,1);
 assert.deepEqual(Array.from(s.players[1].redPile),['acc1']);
 dom.window.close();
});

test('Stocks consumes one skipped turn and Piety blocks direct accusations',()=>{
 const {dom,qa,doc}=setup();
 click(doc,'#modalBody .modal-actions button');
 const s=qa.state();
 s.players[1].effects=['stocks'];
 qa.advanceTurn();
 assert.equal(s.current,2);
 assert.equal(s.players[1].effects.includes('stocks'),false);
 s.current=0;s.action='choose';s.played=0;
 s.players[0].hand=['acc1'];
 s.players[1].effects=['piety'];
 assert.equal(qa.playCard(0,0,1,false),false);
 dom.window.close();
});


test('Salem uses the shared Persian typography with self-hosted variable font files',()=>{
 const css=fs.readFileSync(path.join(base,'assets/salem.css'),'utf8');
 assert.match(html, /fonts\.googleapis\.com\/css2\?family=Outfit/);
 assert.match(css, /--salem-font-fa:'Salem Vazirmatn'/);
 assert.match(css, /font-family:var\(--salem-font-fa\)/);
 assert.match(css, /font-size:clamp\(38px,4\.65vw,64px\)/);
 assert.match(css, /@media\(max-width:540px\)/);
 for(const file of ['vazirmatn-arabic-wght-normal.woff2','vazirmatn-latin-wght-normal.woff2']){
   const buff=fs.readFileSync(path.join(base,'assets/fonts',file));
   assert.ok(buff.length>10000,file+' should not be empty');
   assert.equal(buff.subarray(0,4).toString('ascii'),'wOF2','font file signature '+file);
 }
 assert.ok(fs.statSync(path.join(base,'assets/fonts/OFL.txt')).size>1000,'font license must be included');
});


test('Town Hall catalogue has all fifteen unique documented character cards',()=>{
 const {dom}=setup(6);
 const all=dom.window.SalemTownHall.all;
 assert.equal(all.length,15);
 assert.equal(new Set(all.map(x=>x.id)).size,15);
 for(const name of ['abigail','ann','cotton','giles','george','john','martha','mary','rebecca','samuel','sarah','thomas','tituba','will','william']){
  assert.ok(dom.window.SalemTownHall.byId[name]?.description);
 }
 for(const n of [4,5,6,7,8,9,10]){
  const dealt=dom.window.SalemTownHall.deal(n);
  assert.equal(dealt.offered,n<=7?2:1);
  assert.equal(dealt.hands.length,n);
  assert.equal(dealt.hands.every(h=>h.length===dealt.offered),true);
  const dealtIds=dealt.hands.flat();
  assert.equal(new Set(dealtIds).size,dealtIds.length);
  assert.equal(dealt.unused.length+dealtIds.length,15);
 }
 dom.window.close();
});

test('Town Hall selection burns the unchosen public ability and cannot be used twice',()=>{
 const {dom,qa}=setup(6);
 const state=qa.state();
 assert.equal(state.townHallPending,false);
 assert.equal(state.townHallOffers.length,0);
 assert.equal(state.burnedTownHall.length,9);
 assert.equal(state.players.filter(p=>p.townHallId!=null).length,6);
 assert.equal(new Set([state.__qaTownHallChoice,...state.players.slice(1).map(p=>p.townHallId)]).size,6);
 assert.equal(state.burnedTownHall.includes(state.__qaTownHallChoice),false);
 dom.window.close();
});

test('George needs eight accusations, Cotton weakens Evidence and Thomas needs six',()=>{
 const {dom,qa,doc}=setup(6);
 click(doc,'#modalBody .modal-actions button');
 let s=qa.state(), me=s.players[0],victim=s.players[1];
 victim.townHallId='george';victim.accusations=6;victim.redPile=Array(6).fill('acc1');
 me.hand=['acc1'];
 assert.equal(qa.playCard(0,0,1,false),true);
 assert.equal(victim.accusations,7);
 assert.equal(s.pendingReveal,null);
 victim.townHallId='cotton';victim.accusations=0;victim.redPile=[];
 me.hand=['acc3'];
 assert.equal(qa.playCard(0,0,1,false),true);
 assert.equal(victim.accusations,1);
 me.townHallId='thomas';victim.townHallId='george';victim.accusations=5;
 victim.redPile=Array(5).fill('acc1');me.hand=['acc1'];
 assert.equal(qa.playCard(0,0,1,false),true);
 assert.equal(s.pendingReveal,null,'George still needs seven against Thomas');
 victim.townHallId='cotton';victim.accusations=5;victim.redPile=Array(5).fill('acc1');
 me.hand=['acc1'];assert.equal(qa.playCard(0,0,1,false),true);
 assert.equal(s.pendingReveal,1,'Thomas reveals an ordinary player at six');
 dom.window.close();
});

test('Mary cannot be targeted by simulated Matchmaker, Sarah resists Arson and Robbery',()=>{
 const {dom,qa}=setup(); const s=qa.state();
 const other=s.players[1];
 other.townHallId='mary';
 assert.equal(qa.legalTarget(0,1,'matchmaker'),false);
 other.townHallId='sarah';
 assert.equal(qa.legalTarget(0,1,'robbery'),false);
 assert.equal(qa.legalTarget(0,1,'arson'),false);
 dom.window.close();
});

test('William free confession consumes one use without revealing a Tryal',()=>{
 const {dom,doc,qa}=setup();
 click(doc,'#modalBody .modal-actions button');
 const s=qa.state(), me=s.players[0];
 me.townHallId='william';me.abilityUses={};
 s.phase='night';s.nightSelection=null;s.nightConfessed=false;
 const previously=me.tryals.filter(t=>t.revealed).length;
 qa.freePhipsConfess();
 assert.equal(s.nightConfessed,true);
 assert.equal(me.tryals.filter(t=>t.revealed).length,previously);
 assert.equal(me.abilityUses.william,0);
 qa.freePhipsConfess();assert.equal(me.abilityUses.william,0);
 dom.window.close();
});

test('shared custom dropdown preserves native select change and keyboard controls',()=>{
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<!doctype html><html lang="fa"><body><label>افراد<select id="persons"><option value="4">۴ نفر</option><option value="6">۶ نفر</option><option value="8">۸ نفر</option></select></label></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const doc=dom.window.document;
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 const component=fs.readFileSync(path.join(base,'../assets/bg-select.js'),'utf8');
 dom.window.eval(component);
 doc.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 const trigger=doc.querySelector('.bg-select-trigger');
 assert.ok(trigger);
 trigger.click();
 const option=doc.querySelector('[data-index="1"]');assert.ok(option);
 let fired=0;doc.getElementById('persons').addEventListener('change',()=>fired++);
 option.click();
 assert.equal(doc.getElementById('persons').value,'6');
 assert.equal(fired,1);
 assert.equal(trigger.getAttribute('aria-expanded'),'false');
 // Retain this fixture until process exit: jsdom mutation-observer microtasks still resolve after assertions.
});

test('the Salem character panel is loaded before gameplay and shared dropdown assets exist',()=>{
 const css=fs.readFileSync(path.join(base,'assets/town-hall.css'),'utf8');
 assert.match(html,/assets\/town-hall\.js/);
 assert.match(html,/assets\/town-hall\.css/);
 assert.match(css,/townhall-draft-grid/);
 for(const file of ['../assets/bg-select.css','../assets/bg-select.js'])assert.ok(fs.statSync(path.join(base,file)).size>500);
});

test('initial Dawn uses role-safe ballots, ties and abstentions',()=>{
 const {dom,qa,doc}=setup(6,'witch');
 const result=dom.window.SalemDawn.tally;
 const people=[{id:0},{id:1},{id:2}];
 assert.equal(result({0:2,1:2},people,()=>.99),2,'unanimous votes');
 assert.equal(result({0:1,1:2},people,()=>0),1,'tie first target');
 assert.equal(result({0:1,1:2},people,()=>.99),2,'tie last target');
 assert.equal(result({0:0},people,()=>.2),0,'witch may choose herself');
 assert.equal(result({},people,()=>.7),2,'all abstain produces random target');
 // Local roles stay private visually; client-side data remains non-authoritative.
 const s=qa.state();
 s.players[0].witchEver=true;
 dom.window.__QA_SKIP_DAWN=false;
 const button=doc.querySelector('#modalBody .modal-actions button');
 assert.ok(button);
 button.click();
 assert.equal(s.phase,'dawn');
 assert.equal(s.initialDawn.stage,'sleep');
 assert.ok(doc.querySelector('#salemDawn'));
 s.initialDawn.endsAt=Date.now()-10;
 dom.window.SalemDawn.stop();
 dom.window.close();
});

test('ending the turn with zero played cards must draw two before handing over',()=>{
 const {dom,doc,qa}=setup();
 click(doc,'#modalBody .modal-actions button');
 const state=qa.state();
 const before=state.players[0].hand.length;
 state.deck=['acc1','acc2','acc3',...state.deck];
 qa.render();
 click(doc,'[data-action="end"]');
 assert.equal(state.players[0].hand.length,before+2);
 assert.notEqual(state.current,0);
 dom.window.close();
});

test('new opening-night dependencies and turn motion exist',()=>{
 for(const name of ['salem-dawn.js','salem-dawn.css','salem-turn.js','salem-turn.css','salem-audio.js']){
   assert.ok(fs.statSync(path.join(base,'assets',name)).size>400,'missing '+name);
   assert.match(html,new RegExp('assets/'+name.replace(/[.]/g,'[.]')));
 }
});


test('full opening dawn transitions from sleep through private ballot to first cat-owner turn',async()=>{
 const {dom,doc,qa}=setup(4,'witch');
 const state=qa.state();
 state.players[0].witchEver=true;
 dom.window.__QA_SKIP_DAWN=false;
 click(doc,'#modalBody .modal-actions button');
 assert.equal(state.phase,'dawn');
 assert.equal(state.initialDawn.stage,'sleep');
 state.initialDawn.endsAt=Date.now()-1;
 await new Promise(resolve=>setTimeout(resolve,230));
 assert.equal(state.initialDawn.stage,'vote');
 assert.ok(doc.querySelector('[data-dawn-vote="2"]'));
 click(doc,'[data-dawn-vote="2"]');
 assert.equal(state.initialDawn.votes[0],2);
 state.initialDawn.endsAt=Date.now()-1;
 await new Promise(resolve=>setTimeout(resolve,230));
 assert.equal(state.initialDawn.stage,'sunrise');
 assert.equal(state.blackCat,2);
 state.initialDawn.endsAt=Date.now()-1;
 await new Promise(resolve=>setTimeout(resolve,230));
 assert.equal(state.phase,'turn');
 assert.equal(state.current,2);
 assert.equal(state.dawnCompleted,true);
 assert.ok(state.turnEndsAt>Date.now());
 assert.ok(!doc.getElementById('salemDawn'));
 dom.window.SalemDawn.stop();
 dom.window.close();
});

test('turn clock expires once and reports public owner; timer markup is present',()=>{
 const {dom,doc,qa}=setup();
 const source=fs.readFileSync(path.join(base,'assets/salem-turn.js'),'utf8');
 dom.window.eval(source);
 const state=qa.state();
 state.phase='turn';state.current=0;state.turnEndsAt=Date.now()-500;
 let fired=0;
 dom.window.SalemTurn.sync(state,()=>fired++);
 assert.equal(fired,1);
 assert.match(doc.querySelector('#turnTimerBadge').textContent,/00:00/);
 dom.window.SalemTurn.stop();
 dom.window.close();
});


test('Black Cat is discarded rather than magically transferred when its owner dies',()=>{
 const {dom,qa}=setup(6);
 const state=qa.state();
 state.blackCat=1;
 const before=state.discard.filter(x=>x==='blackcat').length;
 qa.eliminate(1,'regression');
 assert.equal(state.blackCat,null,'no random replacement owner');
 assert.equal(state.discard.filter(x=>x==='blackcat').length,before+1);
 dom.window.close();
});

test('Black Cat is discarded when game reaches two surviving players',()=>{
 const {dom,qa}=setup(6);
 const state=qa.state();
 state.blackCat=0;
 for(const p of state.players.slice(3))p.alive=false;
 assert.equal(state.players.filter(p=>p.alive).length,3);
 qa.eliminate(1,'regression');
 assert.equal(state.players.filter(p=>p.alive).length,2);
 assert.equal(state.blackCat,null);
 assert.equal(state.discard.includes('blackcat'),true);
 dom.window.close();
});

test('Night report survives restoring a saved match without restarting the timer',()=>{
 const {dom,doc,qa}=setup();
 const state=qa.state();
 state.phase='night-report';
 state.turnEndsAt=null;
 state.nightReport='گزارش شب برای ادامه بازی';
 qa.render();
 click(doc,'#homeButton');
 assert.equal(doc.querySelector('#resumeGame').hidden,false);
 click(doc,'#resumeGame');
 assert.equal(doc.querySelector('#overlay').hidden,false);
 assert.match(doc.querySelector('#modalBody').textContent,/گزارش شب برای ادامه بازی/);
 assert.equal(qa.state().phase,'night-report');
 click(doc,'#modalBody .modal-actions button');
 assert.equal(qa.state().phase,'turn');
 assert.ok(qa.state().turnEndsAt>Date.now());
 dom.window.close();
});


test('Salem Experience UI connects timeline, guide, tutorial, settings and endgame without revealing private roles',()=>{
 const {dom,doc,qa}=setup();
 const js=fs.readFileSync(path.join(base,'assets/salem-experience.js'),'utf8');
 dom.window.eval(js);
 doc.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 const exp=dom.window.SalemExperience;
 assert.ok(exp,'experience module should be loaded');
 const state=qa.state();
 exp.catalog({acc1:{kind:'red',label:'اتهام',image:'assets/gavel_of_judgment_in_candlelit_salem.webp',help:'اتهام یک'}});
 exp.update(state);
 assert.ok(doc.querySelector('#salemExperienceHud'),'turn order HUD');
 assert.ok(doc.querySelector('[data-sx-settings]'),'settings action');
 exp.settings();
 assert.match(doc.querySelector('#sxBody').textContent,/انیمیشن/);
 const settings=doc.querySelector('[data-sx-setting="motion"]');
 assert.ok(settings);
 settings.checked=false;
 settings.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
 assert.equal(exp.getPrefs().motion,false);
 exp.tutorial(0);
 assert.match(doc.querySelector('#sxTitle').textContent,/آموزش تعاملی/);
 doc.querySelector('[data-tutorial-next]').click();
 assert.match(doc.querySelector('#sxBody').textContent,/کارت/);
 exp.guide();
 assert.ok(doc.querySelector('[data-guide-card="acc1"]'));
 exp.inspect('acc1');
 assert.match(doc.querySelector('#sxBody').textContent,/اتهام یک/);
 exp.close();
 const secrets=state.players.flatMap(p=>p.tryals.map(t=>t.type)).filter(t=>t==='witch');
 assert.ok(secrets.length>0);
 assert.equal(doc.querySelector('.sx-hud')?.textContent.includes('witchEver'),false);
 const recap=exp.endgame({...state,winner:'town'});
 assert.match(recap,/پیروزی شهروندان/);
 dom.window.close();
});

test('Salem Experience is included on the live page with responsive and reduced-motion styling',()=>{
 assert.match(html,/salem-experience[.]css/);
 assert.match(html,/salem-experience[.]js/);
 const css=fs.readFileSync(path.join(base,'assets/salem-experience.css'),'utf8');
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/max-width:610px/);
 assert.match(css,/sx-hud/);
 assert.match(css,/sx-guide-grid/);
});
