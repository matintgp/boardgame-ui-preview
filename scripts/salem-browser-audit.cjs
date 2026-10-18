const { chromium }=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const failures=[],reports=[];
 fs.mkdirSync('screenshots/salem-qa',{recursive:true});
 for(const v of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844},{name:'small-mobile',width:320,height:740}]){
  const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await ctx.newPage();
  page.on('pageerror',e=>failures.push(v.name+' JS error '+e.message));
  // Dawn timers use Date.now; move virtual time rather than waiting 40 seconds.
  await page.clock.install({time:new Date()});
  await page.goto('http://127.0.0.1:4173/salem/index.html',{waitUntil:'domcontentloaded'});
  await page.screenshot({path:'screenshots/salem-qa/'+v.name+'-lobby.png',fullPage:true});
  const audit=async stage=>{
   const data=await page.evaluate(()=>{
    const bad=[...document.images].filter(img=>img.complete&&img.naturalWidth===0).map(i=>i.getAttribute('src'));
    const d=document.documentElement,root=document.getElementById('salemDawn');
    const r=root?.getBoundingClientRect();
    return {innerWidth:innerWidth,scrollWidth:d.scrollWidth,brokenImages:[...new Set(bad)],overlay:r?{x:r.x,width:r.width}:null,
      visibleButtons:[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.disabled).length};
   });
   reports.push({viewport:v.name,stage,...data});
   if(data.scrollWidth>v.width+3)failures.push(v.name+' '+stage+' HORIZONTAL OVERFLOW '+data.scrollWidth+' > '+v.width);
   if(data.brokenImages.length)failures.push(v.name+' '+stage+' BROKEN IMAGES '+data.brokenImages.join(','));
   if(data.overlay&&(data.overlay.x< -2||data.overlay.width>v.width+3))failures.push(v.name+' '+stage+' overlay clipping');
  };
  await audit('lobby');
  await page.locator('#testRole').selectOption('witch');
  await page.locator('#startGame').click();
  await page.screenshot({path:'screenshots/salem-qa/'+v.name+'-character-choice.png',fullPage:true});
  await audit('character-choice');
  await page.locator('[data-townhall-choose]').first().click();
  await page.locator('#modalBody .modal-actions button').first().click();
  await page.locator('#salemDawn.sleep').waitFor();
  await page.screenshot({path:'screenshots/salem-qa/'+v.name+'-sleep.png',fullPage:true});
  await audit('sleep');
  await page.clock.fastForward(6000);
  await page.locator('#salemDawn.vote').waitFor();
  await page.screenshot({path:'screenshots/salem-qa/'+v.name+'-witch-vote.png',fullPage:true});
  await audit('vote');
  if(v.name==='desktop'){
   const choice=page.locator('[data-dawn-vote="0"]');
   await choice.click();
   assert.equal(await choice.getAttribute('aria-pressed'),'true','Witch can choose herself');
   await page.locator('#dawnConfirm').click();
  }
  await page.clock.fastForward(32000);
  await page.locator('#salemDawn.sunrise').waitFor();
  await page.screenshot({path:'screenshots/salem-qa/'+v.name+'-sunrise.png',fullPage:true});
  await audit('sunrise');
  await page.clock.fastForward(6500);
  await page.locator('#salemDawn').waitFor({state:'detached'});
  await page.screenshot({path:'screenshots/salem-qa/'+v.name+'-day.png',fullPage:true});
  await audit('day');
  await page.locator('#experienceSettingsButton').click();
  await page.locator('#sxShade:not([hidden])').waitFor();
  await page.screenshot({path:'screenshots/salem-qa/'+v.name+'-settings.png',fullPage:true});
  await audit('settings');
  await page.locator('#sxShade [data-sx-setting="contrast"]').check();
  assert.equal(await page.locator('body').getAttribute('data-sx-contrast'),'high');
  await page.locator('#sxShade [data-sx-close]').click();
  await page.locator('#inspectCardButton').click();
  await page.locator('#sxShade:not([hidden])').waitFor();
  await page.screenshot({path:'screenshots/salem-qa/'+v.name+'-card-guide.png',fullPage:true});
  await audit('card-guide');
  await page.locator('#sxShade [data-sx-close]').click();
  await page.locator('[data-sx-tour]').first().click();
  await page.locator('#sxShade:not([hidden])').waitFor();
  assert.match(await page.locator('#sxShade #sxTitle').textContent(),/آموزش تعاملی/);
  await page.locator('#sxShade [data-tutorial-skip]').click();
  await ctx.close();
 }
 await browser.close();
 console.log('AUDIT_RESULTS '+JSON.stringify(reports,null,2));
 if(failures.length){console.error('BROWSER_QA_FAILED\n'+failures.join('\n'));process.exitCode=1;}
 else console.log('BROWSER_QA_PASS: all viewport stages, JS errors, images and overflow checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
