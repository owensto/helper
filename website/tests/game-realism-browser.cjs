/* Repeatable visual review through public game controls. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const H=require('./game-test-helpers.cjs');
(async()=>{
 const out=process.env.SCREENSHOT_DIR||'test-results/realism';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const errors=[];
 try{for(const width of [390,1440]){
  const c=await browser.newContext({viewport:{width,height:width===390?900:1100},isMobile:width===390,hasTouch:width===390}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.goto((process.env.TEST_ORIGIN||'http://127.0.0.1:8057')+'/play/');const reject=p.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();await p.waitForFunction(()=>CastwardPlay.snapshot().renderer==='3d');
  await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+500));await H.cast(p);await p.clock.runFor(1100);await p.locator('#fishing-canvas').focus();await p.keyboard.press('Enter');await p.clock.runFor(250);assert.equal(await H.state(p),'reel');
  if(width===390){const hud=await p.evaluate(()=>({height:parseFloat(getComputedStyle(document.querySelector('.tension-track')).height),background:getComputedStyle(document.getElementById('game-live-hint')).backgroundColor,reelBottom:document.getElementById('game-action').getBoundingClientRect().bottom,viewport:innerHeight}));assert.ok(hud.height>=14,'Phone tension bar must be readable');assert.equal(hud.background,'rgb(19, 44, 39)');assert.ok(hud.reelBottom<=hud.viewport,'The reel must stay in the phone viewport');}
  await p.locator('.game-scene').screenshot({path:path.join(out,`fight-${width}.png`)});await p.screenshot({path:path.join(out,`fight-hud-${width}.png`)});
  await c.close();
 }assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,errors}));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
