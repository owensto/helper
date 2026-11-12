/* Preview-only integration checks: PLAYWRIGHT_MODULE=/path/to/playwright node tests/play-lingo-browser.cjs */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8057';
const out=process.env.SCREENSHOT_DIR||path.resolve(__dirname,'../test-results/play-shots');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const errors=[];fs.mkdirSync(out,{recursive:true});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',isMobile:width===390,hasTouch:width===390});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   for(const route of ['play','fishing-lingo']){
    await page.goto(base+'/'+route+'/');const reject=page.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow '+width);
    await page.screenshot({path:path.join(out,`${route}-${width}.png`),fullPage:false});
    await page.screenshot({path:path.join(out,`${route}-${width}-full.png`),fullPage:true});
   }
   await page.goto(base+'/fishing-lingo/');await page.locator('#slams').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`lingo-slams-${width}.png`)});
   await page.locator('#gulf-coast').scrollIntoViewIfNeeded();await page.locator('#gulf-coast-gaspergou summary').click();await page.screenshot({path:path.join(out,`lingo-terms-${width}.png`)});
   await page.goto(base+'/play/');await page.locator('#fish-log').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`fish-log-${width}.png`)});
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/fishing-lingo/');const reject=page.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();
  const terms=page.locator('[data-lingo-term]:visible');assert.equal(await terms.count(),157);
  await page.locator('#lingo-search').fill('sac-a-lait');assert.equal(await terms.count(),1);await terms.locator('summary').click();assert.match(await terms.innerText(),/brush/);
  await page.locator('#lingo-clear').click();await page.locator('button[data-continent="Europe"]').click();assert.equal(await terms.count(),13);
  await page.locator('#lingo-search').fill('marlin');assert.equal(await terms.count(),0);assert.ok(await page.locator('#lingo-empty').isVisible());
  await page.locator('#lingo-clear').click();await page.locator('.lingo-regions>summary').click();await page.locator('[data-region="alaska"]').click();assert.equal(await terms.count(),8);assert.equal(await page.locator('[data-lingo-region]:visible').count(),1);assert.match(await page.locator('#lingo-count').innerText(),/Alaska/);
  await page.locator('#lingo-clear').click();await page.locator('button[data-letter="B"]').click();assert.ok(await terms.count()>0);assert.ok((await terms.locator('h4').allTextContents()).every(t=>t.startsWith('B')));
  await page.goto(base+'/fishing-lingo/#caribbean-flats-grand-slam');assert.ok(await page.locator('#florida-keys-grand-slam').isVisible());assert.ok(await page.locator('#florida-keys-grand-slam details').getAttribute('open')!==null);
  await page.goto(base+'/fishing-lingo/?q=haruan&region=southeast-asia');assert.equal(await terms.count(),1);
  await page.goto(base+'/play/');await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.evaluate(()=>{Math.random=()=>.45;});
  const state=()=>page.locator('[data-fishing-game]').getAttribute('data-state');
  const helpers=require('./game-test-helpers.cjs');const cast=()=>helpers.cast(page),bite=()=>helpers.bite(page),land=()=>helpers.land(page);
  assert.equal(await page.locator('#game-sound').getAttribute('aria-pressed'),'false');
  for(const water of ['lake','ice','flats','offshore','river']){await page.locator(`[data-water=${water}]`).click();assert.equal(await page.locator(`[data-water=${water}]`).getAttribute('aria-pressed'),'true');await page.locator('.game-scene').screenshot({path:path.join(out,`water-${water}.png`)});}
  await cast();await page.keyboard.press('Enter');assert.equal(await state(),'wait');await bite();await page.clock.runFor(3400);assert.equal(await state(),'lost');
  await cast();await bite();await page.clock.runFor(2600);assert.equal(await state(),'lost');
  await cast();await bite();await page.keyboard.press('Space');await page.keyboard.down('Space');await page.clock.runFor(5000);await page.keyboard.up('Space');assert.equal(await state(),'lost');assert.match(await page.locator('#game-status').innerText(),/snapped/);
  await land();assert.equal(await page.locator('#catch-trip').getAttribute('href'),'/environments/rivers-streams/');assert.equal(await page.locator('#collection-count').innerText(),'1');assert.equal(await page.locator('#game-log li').count(),1);
  await page.locator('#game-catch').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'game-catch-1440.png')});
  // Exercise the download fallback even when the browser exposes native sharing.
  await page.evaluate(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
  const download=page.waitForEvent('download');await page.locator('#catch-share').click();const file=await download;assert.ok(file.suggestedFilename().endsWith('.png'));await file.saveAs(path.join(out,'catch-share.png'));
  await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.sharedCatch={type:data.files[0].type,size:data.files[0].size};}});});await page.locator('#catch-share').click();assert.equal(await page.evaluate(()=>window.sharedCatch.type),'image/png');assert.ok(await page.evaluate(()=>window.sharedCatch.size)>10000);
  const best=await page.locator('#game-best').innerText();await page.reload();assert.equal(await page.locator('#game-best').innerText(),best);
  await page.evaluate(()=>{Math.random=()=>.45;});await land();await land();assert.equal(await page.locator('[data-lure=spinner]').isEnabled(),true);assert.equal(await page.locator('[data-lure=fly]').isDisabled(),true);await page.locator('[data-lure=spinner]').click();assert.equal(await page.locator('[data-lure=spinner]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-mode=tournament]').click();await cast();await page.locator('#game-pause').click();const left=await page.locator('#game-streak').innerText();await page.clock.runFor(10000);assert.equal(await page.locator('#game-streak').innerText(),left);assert.equal(await state(),'wait');await page.locator('#game-pause').click();await page.clock.fastForward(61000);assert.ok(await page.locator('#tournament-result').isVisible());assert.equal(await page.locator('#game-leaderboard li b').count(),1);await page.locator('#tournament-close').click();
  await page.locator('#daily-start').click();assert.equal(await page.locator('[data-mode=daily]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-water]:enabled').count(),0);await land();assert.match(await page.locator('#daily-progress').innerText(),/1 \/ 3/);
  await page.locator('#game-menu').click();assert.equal(await page.locator('[data-fishing-game]').getAttribute('data-paused'),'true');await page.locator('#game-time').selectOption('night');await page.locator('#game-weather').selectOption('rain');await page.keyboard.press('Escape');await page.clock.runFor(50);assert.equal(await page.locator('[data-fishing-game]').getAttribute('data-paused'),'false');await page.locator('.game-scene').screenshot({path:path.join(out,'water-night.png')});
  await page.locator('#game-sound').click();assert.equal(await page.locator('#game-sound').getAttribute('aria-pressed'),'true');await page.locator('#game-sound').click();assert.equal(await page.locator('#game-sound').getAttribute('aria-pressed'),'false');
  await page.locator('#collection-more').click();assert.equal(await page.locator('.fish-species-card:visible').count(),34);await page.locator('#collection-more').click();assert.equal(await page.locator('.fish-species-card:visible').count(),5);
  await context.close();
  const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const m=await phone.newPage();await m.goto(base+'/play/');await m.locator('#game-action').tap();assert.equal(await m.locator('[data-fishing-game]').getAttribute('data-state'),'aim');await m.locator('#game-action').tap();assert.equal(await m.locator('[data-fishing-game]').getAttribute('data-state'),'wait');await m.locator('#game-menu').tap();await m.locator('[data-close-menu]').last().tap();await m.waitForFunction(()=>document.querySelector('[data-fishing-game]').dataset.paused==='false');assert.equal(await m.locator('[data-fishing-game]').getAttribute('data-paused'),'false');await phone.close();
  const nojs=await browser.newContext({javaScriptEnabled:false});const n=await nojs.newPage();await n.goto(base+'/fishing-lingo/');assert.equal(await n.locator('[data-lingo-term]').count(),157);await n.goto(base+'/play/');assert.match(await n.locator('main noscript').innerText(),/needs JavaScript/);await nojs.close();
  const denied=await browser.newContext();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));const d=await denied.newPage();await d.goto(base+'/play/');assert.ok(await d.locator('#game-action').isEnabled());assert.match(await d.locator('#game-storage-note').innerText(),/unavailable/);await denied.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({screenshots:out,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
