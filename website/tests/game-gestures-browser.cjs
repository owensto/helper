/* Input-only Playwright journeys. The render observer reads state but never changes it. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const H=require('./game-test-helpers.cjs');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8057',out=process.env.SCREENSHOT_DIR||path.resolve('test-results/action-shots');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const errors=[],checks=[];fs.mkdirSync(out,{recursive:true});
 try{
  for(const touch of [false,true]){
   const context=await browser.newContext({viewport:{width:touch?360:1440,height:touch?900:1100},isMobile:touch,hasTouch:touch});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/play/');const reject=p.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();await p.waitForFunction(()=>document.querySelector('[data-fishing-game]').dataset.rendererReady);await p.locator('#expedition-open').click();await p.locator('#career-travel').click();await p.locator('.game-scene').scrollIntoViewIfNeeded();await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+1000));await H.observe(p);await p.clock.runFor(40);
   let box=await p.locator('#fishing-canvas').boundingBox();const cdp=await context.newCDPSession(p);let down=false;
   const move=async(x,y,ms=20)=>{box=await p.locator('#fishing-canvas').boundingBox();if(touch){if(down)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+x*box.width,y:box.y+y*box.height,id:1}]});}else await p.mouse.move(box.x+x*box.width,box.y+y*box.height);await p.clock.runFor(ms);};
   const start=async(x,y)=>{box=await p.locator('#fishing-canvas').boundingBox();if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+x*box.width,y:box.y+y*box.height,id:1}]});else{await p.mouse.move(box.x+x*box.width,box.y+y*box.height);await p.mouse.down();}down=true;};
   const end=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();down=false;};
   const tap=async(x,y)=>{await start(x,y);await end();};
   const snap=async(name)=>{await p.locator('.game-scene').screenshot({path:path.join(out,`${touch?'phone':'desktop'}-${name}.png`)});};
   await snap('01-ready');await start(.5,.58);await move(.5,.67,90);await move(.5,.79,90);await move(.51,.7,45);await snap('02-cast-arc');await move(.52,.58,50);await end();assert.equal(await H.state(p),'wait');
   if(!touch){fs.mkdirSync(path.join(out,'cast-frames'),{recursive:true});for(let frame=0;frame<12;frame++){await p.clock.runFor(40);await p.locator('.game-scene').screenshot({path:path.join(out,'cast-frames',String(frame).padStart(2,'0')+'.png')});}}
   await p.clock.runFor(200);await snap('03-flight');await p.clock.runFor(100);
   let w=await p.evaluate(()=>window.__water);for(let i=0;i<15&&w.phase==='flight';i++){await p.clock.runFor(100);w=await p.evaluate(()=>window.__water);}assert.equal(w.phase,'retrieve');const landed={...w.lure};assert.ok(landed.x>.5&&landed.x<.8);
   // Slow sweeps, real pointer taps, and visible curiosity lead to a strike.
   const seen=new Set();for(let i=0;i<65&&await H.state(p)==='wait';i++){
    w=await p.evaluate(()=>window.__water);w.fish.forEach(f=>seen.add(f.stage));
    if(i<5){await start(w.lure.x,w.lure.y);await move(w.lure.x+.006,w.lure.y+.004,150);await end();}else await tap(w.lure.x,w.lure.y);
    await p.clock.runFor(180);if(i===6)await snap('04-follow');if(!touch&&w.camera==='underwater'&&i===22){for(let f=0;f<5;f++){await p.clock.runFor(50);await snap('underwater-'+f);}}
   }
   assert.equal(await H.state(p),'bite');assert.ok(seen.has('follow'));await snap('05-bite');w=await p.evaluate(()=>window.__water);
   await start(w.lure.x,w.lure.y+.08);await move(w.lure.x,w.lure.y-.1,55);await end();assert.equal(await H.state(p),'reel');await p.clock.runFor(100);await snap('06-hook');
   let capturedJump=false,capturedFight=false;
   for(let i=0;i<500&&await H.state(p)==='reel';i++){
    w=await p.evaluate(()=>window.__water);
    if(w.jump>0&&!w.bowed){if(!capturedJump){await p.clock.runFor(250);await snap('08-jump');capturedJump=true;}await tap(.52,.72);}
    await start(.5,.75);await move(w.run>0?.26:.69,.75,16);await end();
    if(w.tension<.63){
     if(touch){await start(.91,.82);for(let j=1;j<=6;j++)await move(.84+Math.cos(j*Math.PI/3)*.07,.82+Math.sin(j*Math.PI/3)*.055,16);await end();}
     else{await p.mouse.move(box.x+box.width*.84,box.y+box.height*.82);await p.mouse.wheel(0,85);}
    }
    await p.clock.runFor(100);if(!capturedFight&&i>12){await snap('07-fight');capturedFight=true;}
   }
   assert.equal(await H.state(p),'net');assert.ok(capturedJump);await snap('09-net');w=await p.evaluate(()=>window.__water);await tap(w.screenLure.x,w.screenLure.y);await p.clock.runFor(40);assert.equal(await H.state(p),'caught');await p.clock.runFor(900);await snap('10-landed');assert.equal(await p.locator('#game-log li').count(),1);
   await p.locator('#game-catch').screenshot({path:path.join(out,`${touch?'phone':'desktop'}-catch-card.png`)});
   assert.match(await p.locator('#career-level').innerText(),/LV [2-9]/);
   await p.locator('#shop-open').click();await p.locator('[data-buy=rod]').click();assert.equal(await p.locator('[data-buy=rod]').innerText(),'Equipped');await p.locator('[data-panel=map]').click();await p.locator('#career-destination').selectOption('na-ca-mb-002');await p.locator('#career-travel').click();assert.equal(await p.locator('#expedition-name').textContent(),'Lake Winnipeg');assert.match(await p.locator('#career-reward').innerText(),/XP/);
   await p.locator('.game-scene').scrollIntoViewIfNeeded();await p.clock.runFor(500);await snap('11-career-ice');
   // A reload retains the catch. The next cast pauses without consuming any world time.
   const best=await p.locator('#game-best').innerText();await p.reload();assert.equal(await p.locator('#game-best').innerText(),best);await H.observe(p);await p.locator('#fishing-canvas').focus();await p.keyboard.press('1');await p.clock.runFor(1000);assert.equal(await p.locator('[data-spot="0"]').getAttribute('aria-pressed'),'true');
   await H.cast(p);await p.locator('.game-scene').scrollIntoViewIfNeeded();await p.locator('#fishing-canvas').focus();await p.clock.runFor(100);await p.keyboard.press('p');const before=await p.evaluate(()=>window.__water.clock);await p.clock.runFor(5000);assert.equal(await p.evaluate(()=>window.__water.clock),before);await p.keyboard.press('p');assert.equal(await p.locator('[data-fishing-game]').getAttribute('data-paused'),'false');await p.clock.runFor(250);assert.ok(await p.evaluate(t=>window.__water.clock>t,before));
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push(`${touch?'360px touch':'Desktop mouse'}: flick, arc, lure sweep, AI follow, bite swipe, ${touch?'circular':'wheel'} reel, rod, jump bow, net, catch persistence, licence, XP unlock, gear purchase, travel, spot and pause`);await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'gesture-results.json'),JSON.stringify({passed:true,checks,errors},null,2));console.log(JSON.stringify({passed:true,checks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
