/* Local GPU, real requestAnimationFrame intervals, 4x CPU slowdown, auto quality.
 * This measures this machine. It is not a physical-phone benchmark.
 */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8057',out=process.env.SCREENSHOT_DIR||'test-results';
async function sample(page,count=360){return page.evaluate(async count=>{
 const frames=[],draws=[],cameras=new Set();let last=performance.now();
 await new Promise(resolve=>{function next(t){frames.push(t-last);last=t;const s=CastwardPlay.snapshot();draws.push(s.drawMs||0);cameras.add(s.camera);if(frames.length<count)requestAnimationFrame(next);else resolve();}requestAnimationFrame(next);});
 const intervals=frames.slice(30),sorted=intervals.slice().sort((a,b)=>a-b),sortedDraws=draws.slice(30).sort((a,b)=>a-b),mean=a=>a.reduce((s,n)=>s+n,0)/a.length,round=n=>Math.round(n*10)/10;
 return{renderer:CastwardPlay.snapshot().renderer,frames:intervals.length,averageFps:round(1000/mean(intervals)),steadyFps:round(1000/mean(frames.slice(count/2))),frameP95Ms:round(sorted[Math.floor(sorted.length*.95)]),longestFrameMs:round(Math.max(...intervals)),drawP95Ms:round(sortedDraws[Math.floor(sortedDraws.length*.95)]),adaptiveScale:CastwardPlay.snapshot().resolution,cameras:[...cameras]};
},count);}
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const results=[],errors=[];let gpu;try{
 const slowdown=Number(process.env.CPU_SLOWDOWN||4);assert.ok(slowdown>=1&&slowdown<=20);
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1100},isMobile:width===390,hasTouch:width===390});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/play/');const reject=page.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();await page.waitForFunction(()=>document.querySelector('[data-fishing-game]')?.dataset.rendererReady==='3d');
  gpu=await page.evaluate(()=>{const gl=document.querySelector('.game-webgl').getContext('webgl2');return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);});
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:slowdown});
  for(const water of ['river','lake','ice','flats','offshore','reef']){
   await page.locator(`[data-water=${water}]`).click();await page.locator('.game-scene').scrollIntoViewIfNeeded();await page.waitForTimeout(1800);
   const result={viewport:width,water,cpuSlowdown:slowdown,quality:'auto',...await sample(page)};results.push(result);console.log(JSON.stringify(result));
  }
  await page.locator('[data-water=river]').click();await page.locator('.game-scene').scrollIntoViewIfNeeded();await page.locator('#fishing-canvas').focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');
  await page.evaluate(()=>{window.__performanceInput=setInterval(()=>{const state=document.querySelector('[data-fishing-game]').dataset.state;if(state==='wait'||state==='bite')document.getElementById('game-action').click();},250);});
  const active={viewport:width,water:'river-first-cast',cpuSlowdown:slowdown,quality:'auto',...await sample(page,480)};results.push(active);console.log(JSON.stringify(active));await page.evaluate(()=>clearInterval(window.__performanceInput));
  await context.close();
 }
 const target=slowdown>=6?45:55;const report={gpu,browser:browser.version(),targetFps:target,passed:results.every(r=>r.renderer==='3d'&&r.averageFps>=target),cpuSlowdown:slowdown,minimumFps:Math.min(...results.map(r=>r.averageFps)),results,errors};fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,`game-performance-${slowdown}x.json`),JSON.stringify(report,null,2));if(slowdown===4)fs.writeFileSync(path.join(out,'game-performance.json'),JSON.stringify(report,null,2));assert.deepEqual(errors,[]);for(const r of results){assert.equal(r.renderer,'3d');assert.ok(r.averageFps>=target,`${r.viewport}px ${r.water}: ${r.averageFps} FPS must reach ${target}`);}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
