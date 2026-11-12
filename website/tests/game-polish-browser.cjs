/* Screenshot review and map/first-catch regression checks. Game input stays in the UI. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const H=require('./game-test-helpers.cjs');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8057',out=process.env.SCREENSHOT_DIR||'test-results/game4/polish';
async function separated(p){const boxes=await p.locator('.map-pin').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height}}));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(Math.hypot(a.x+a.w/2-b.x-b.w/2,a.y+a.h/2-b.y-b.h/2)>=(a.w+b.w)/2+3,'Map targets must not overlap');}}
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const errors=[],results=[];
 try{for(const width of [1440,390]){
  const context=await b.newContext({viewport:{width,height:width===390?900:1100},hasTouch:width===390,isMobile:width===390});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.goto(base+'/play/');const reject=p.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();await p.waitForFunction(()=>document.querySelector('[data-fishing-game]')?.dataset.rendererReady==='3d');
  const outward=await p.evaluate(async()=>{const {fishModel}=await import(document.querySelector('[data-fishing-game]').dataset.renderer);const fish=fishModel(CastwardGame.species.find(s=>s.id==='rainbow-trout')),g=fish.children[0].geometry,positions=g.attributes.position,normals=g.attributes.normal;let top=0;for(let i=1;i<positions.count;i++)if(positions.getY(i)>positions.getY(top))top=i;const y=normals.getY(top);fish.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return y;});assert.ok(outward>.8,'The fish body must face outward and occlude the far eye');
  await p.locator('#expedition-open').click();await p.waitForTimeout(100);await separated(p);
  await p.locator('#expedition-dialog').screenshot({path:path.join(out,`map-${width}.png`)});
  if(width===390){assert.equal(await p.locator('[data-region]').count(),6);await p.locator('[data-region="North America"]').click();await separated(p);await p.locator('#expedition-dialog').screenshot({path:path.join(out,`map-region-${width}.png`)});assert.ok(await p.locator('#map-reset').isVisible());await p.locator('#map-reset').click();}
  else{assert.equal(await p.locator('[data-place]').count(),25);const pin=p.locator('[data-place="na-us-mt-001"]');await pin.focus();assert.equal(await pin.locator('.pin-tooltip').evaluate(e=>getComputedStyle(e).visibility),'visible');}
  await p.locator('#career-destination').selectOption('belize-reef');assert.ok(await p.locator('#career-travel').isDisabled());assert.match(await p.locator('#career-travel').innerText(),/level 3/);await p.locator('#career-destination').selectOption('na-us-mt-001');await p.locator('#career-travel').click();
  // A first cast with no lure input must strike within 1.2 seconds.
  await p.locator('.game-scene').scrollIntoViewIfNeeded();await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+1000));await H.observe(p);await H.cast(p);await p.clock.runFor(1000);
  assert.equal(await H.state(p),'wait');assert.equal(await p.evaluate(()=>CastwardPlay.snapshot().camera),'underwater');await p.locator('.game-scene').screenshot({path:path.join(out,`chase-${width}.png`)});
  await p.clock.runFor(100);assert.equal(await H.state(p),'bite');await p.locator('#fishing-canvas').focus();await p.keyboard.press('Enter');
  let held=false,jump=false;for(let i=0;i<300&&await H.state(p)==='reel';i++){
   const w=await p.evaluate(()=>CastwardPlay.snapshot());
   if(w.jump>0&&!w.bowed){if(!jump){await p.clock.runFor(350);await p.locator('.game-scene').screenshot({path:path.join(out,`jump-${width}.png`)});jump=true;}await p.keyboard.press('b');}
   const direction=w.run>0?'ArrowLeft':'ArrowRight';await p.keyboard.up(direction==='ArrowLeft'?'ArrowRight':'ArrowLeft');await p.keyboard.down(direction);
   if(w.tension>.65&&held){await p.keyboard.up('Space');held=false;}else if(w.tension<.3&&!held){await p.keyboard.down('Space');held=true;}
   await p.clock.runFor(100);
  }
  await p.keyboard.up('Space');await p.keyboard.up('ArrowLeft');await p.keyboard.up('ArrowRight');assert.equal(await H.state(p),'net');assert.ok(jump);await p.keyboard.press('n');await p.clock.runFor(1100);assert.equal(await H.state(p),'caught');
  await p.locator('.game-scene').screenshot({path:path.join(out,`celebration-${width}.png`)});await p.locator('#view-catch').click();await p.clock.runFor(800);await p.locator('#game-catch').screenshot({path:path.join(out,`catch-card-${width}.png`)});
  assert.match(await p.locator('#catch-earned').innerText(),/COINS/);assert.match(await p.locator('#catch-next').innerText(),/Next:/);assert.equal(await p.evaluate(()=>CastwardExpedition.state().firstCastUsed),true);
  await p.locator('#game-menu').click();await p.locator('#game-time').selectOption('dusk');await p.locator('#game-quality').selectOption(width===1440?'high':'auto');await p.locator('[data-close-menu]').last().click();
  for(const water of ['river','lake','ice','flats','offshore','reef']){await p.locator(`[data-water=${water}]`).click();await p.locator('.game-scene').scrollIntoViewIfNeeded();await p.clock.runFor(900);await p.locator('.game-scene').screenshot({path:path.join(out,`${water}-golden-hour-${width}.png`)});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await p.locator('#game-menu').click();await p.locator('#game-reduced').check();await p.locator('[data-close-menu]').last().click();assert.equal(await p.locator('#game-action').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  results.push({width,mapPinsSeparated:true,mobileRegionZoom:width===390,instantFirstBite:true,catchCard:true,waters:6});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'polish-results.json'),JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,results,errors}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
