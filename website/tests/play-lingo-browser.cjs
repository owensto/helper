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
  await page.goto(base+'/play/');await page.evaluate(()=>localStorage.clear());await page.reload();
  const rejectPlay=page.getByRole('button',{name:'Reject non-essential',exact:true});if(await rejectPlay.isVisible())await rejectPlay.click();
  await page.waitForFunction(()=>window.CastwardPlay);
  assert.equal(await page.locator('#cc-sound').getAttribute('aria-pressed'),'false');
  const names={lake:'Lake',ice:'Ice edge',flats:'Flats',offshore:'Offshore',river:'River'};
  for(const water of ['lake','ice','flats','offshore','river']){await page.locator('#cc-water-btn').click();await page.locator(`[data-w=${water}]`).click();assert.equal((await page.locator('#cc-water-name').innerText()).trim(),names[water]);await page.locator('.cc-stage').screenshot({path:path.join(out,`water-${water}.png`)});}
  const box=await page.locator('#cc-canvas').boundingBox();
  const fish=await page.evaluate(()=>window.CastwardPlay.state().fish[0]);
  await page.mouse.click(box.x+fish.x, box.y+fish.y);
  await page.evaluate(()=>window.CastwardPlay.advance(0.7));
  let phase=await page.evaluate(()=>{for(let i=0;i<40&&window.CastwardPlay.state().phase!=='strike';i++)window.CastwardPlay.advance(0.1);return window.CastwardPlay.state().phase;});
  assert.equal(phase,'strike');
  await page.evaluate(()=>window.CastwardPlay.advance(3.4));
  assert.equal(await page.evaluate(()=>window.CastwardPlay.state().phase),'lost');
  assert.match(await page.locator('#cc-hint').innerText(),/Too late/i);
  await page.evaluate(()=>window.CastwardPlay.advance(3.4));
  const fish2=await page.evaluate(()=>window.CastwardPlay.state().fish[0]);
  await page.mouse.click(box.x+fish2.x, box.y+fish2.y);
  await page.evaluate(()=>window.CastwardPlay.advance(0.7));
  phase=await page.evaluate(()=>{for(let i=0;i<50&&window.CastwardPlay.state().phase!=='strike';i++)window.CastwardPlay.advance(0.15);return window.CastwardPlay.state().phase;});
  assert.equal(phase,'strike');
  await page.mouse.click(box.x+box.width*0.5, box.y+box.height*0.62);
  await page.mouse.move(box.x+box.width*0.5, box.y+box.height*0.62);
  await page.mouse.down();
  let snap='';
  for(let i=0;i<40;i++){
    const s=await page.evaluate(()=>{window.CastwardPlay.advance(0.25,true);return window.CastwardPlay.state();});
    if(s.phase==='lost'){snap=s.reason;break;}
  }
  await page.mouse.up();
  assert.equal(snap,'snap');
  assert.match(await page.locator('#cc-hint').innerText(),/Let go when the bar turns red/);
  await page.evaluate(()=>localStorage.clear());await page.reload();if(await rejectPlay.isVisible())await rejectPlay.click();await page.waitForFunction(()=>window.CastwardPlay);
  const boxL=await page.locator('#cc-canvas').boundingBox();
  const fishL=await page.evaluate(()=>window.CastwardPlay.state().fish[0]);
  await page.mouse.click(boxL.x+fishL.x, boxL.y+fishL.y);
  await page.evaluate(()=>window.CastwardPlay.advance(0.7));
  phase=await page.evaluate(()=>{for(let i=0;i<40&&window.CastwardPlay.state().phase!=='strike';i++)window.CastwardPlay.advance(0.1);return window.CastwardPlay.state().phase;});
  assert.equal(phase,'strike');
  await page.mouse.click(boxL.x+boxL.width*0.5, boxL.y+boxL.height*0.62);
  await page.mouse.move(boxL.x+boxL.width*0.5, boxL.y+boxL.height*0.62);
  for(let i=0;i<350;i++){
    const s=await page.evaluate(()=>window.CastwardPlay.state());
    if(s.phase==='landed'||s.phase==='lost'){phase=s.phase;break;}
    const release=s.mode==='run'||s.jump>0.12||s.tension>(s.kind==='deep'?0.64:0.7);
    if(release) await page.mouse.up(); else await page.mouse.down();
    await page.evaluate(()=>window.CastwardPlay.advance(0.1,true));
  }
  await page.mouse.up();
  await page.evaluate(()=>window.CastwardPlay.advance(1));
  assert.equal(await page.evaluate(()=>window.CastwardPlay.state().phase),'landed');
  assert.match(await page.locator('#cc-card-real').getAttribute('href'),/\/environments\/rivers-streams\//);
  assert.match(await page.locator('[data-log-count]').first().innerText(),/1 of 34/);
  await page.locator('#cc-card').screenshot({path:path.join(out,'game-catch-1440.png')});
  const best=await page.locator('#cc-best').innerText();await page.reload();await page.waitForFunction(()=>window.CastwardPlay);assert.equal(await page.locator('#cc-best').innerText(),best);
  await page.locator('#cc-sound').click();assert.equal(await page.locator('#cc-sound').getAttribute('aria-pressed'),'true');await page.locator('#cc-sound').click();assert.equal(await page.locator('#cc-sound').getAttribute('aria-pressed'),'false');
  await page.locator('#cc-tackle-btn').click();assert.equal(await page.locator('[data-cast-game]').getAttribute('data-paused'),'true');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('[data-cast-game]').dataset.paused==='false');
  await context.close();
  const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const m=await phone.newPage();await m.goto(base+'/play/');await m.locator('#cc-canvas').tap();await m.waitForFunction(()=>['cast','wait','strike'].includes(document.querySelector('[data-cast-game]').dataset.phase));await m.locator('#cc-log-btn').tap();await m.locator('[data-close]').last().tap();await m.waitForFunction(()=>document.querySelector('[data-cast-game]').dataset.paused==='false');assert.equal(await m.locator('[data-cast-game]').getAttribute('data-paused'),'false');await phone.close();
  const nojs=await browser.newContext({javaScriptEnabled:false});const n=await nojs.newPage();await n.goto(base+'/fishing-lingo/');assert.equal(await n.locator('[data-lingo-term]').count(),157);await n.goto(base+'/play/');assert.match(await n.locator('main noscript').innerText(),/needs JavaScript/);await nojs.close();
  const denied=await browser.newContext();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));const d=await denied.newPage();await d.goto(base+'/play/');await d.waitForFunction(()=>window.CastwardPlay);assert.equal(await d.locator('#cc-canvas').isVisible(),true);assert.match(await d.locator('#cc-hint').innerText(),/tap the water/i);await denied.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({screenshots:out,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
