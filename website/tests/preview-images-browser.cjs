const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {AxeBuilder}=require(process.env.AXE_MODULE||'@axe-core/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8057';
const out=process.env.PREVIEW_TEST_OUTPUT||path.resolve(__dirname,'../../runs/castward-preview-images');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});const checks=[],errors=[];
 const routes=['/trip-types/','/local-classics/','/environments/','/countries/','/continents/','/north-america/united-states/','/species/','/guides/','/trips/'];
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  for(const route of routes){
   console.log(JSON.stringify({route,width:viewport.width}));
   await p.goto(base+route,{waitUntil:'networkidle'});
   const reject=p.getByRole('button',{name:'Reject non-essential'});if(await reject.count())await reject.click();
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route);
   const cards=p.locator('[data-preview-card]');assert.ok(await cards.count(),route);
   const first=cards.first();await first.scrollIntoViewIfNeeded();
   await p.waitForFunction(()=>[...document.querySelectorAll('[data-preview-card] img')].filter(i=>{const r=i.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.width>0}).every(i=>i.complete&&i.naturalWidth>0));
   assert.equal(await first.locator('img').getAttribute('loading'),'eager');
   const count=await cards.count();const last=cards.last();
   if(await last.isVisible()){
    await last.scrollIntoViewIfNeeded();await last.locator('img').evaluate(i=>i.decode());
    const offscreen = await first.evaluate(c=>{const r=c.getBoundingClientRect();return r.bottom<=0||r.top>=innerHeight;});
    if(offscreen) await p.waitForFunction(()=>getComputedStyle(document.querySelector('[data-preview-card] img')).animationPlayState==='paused');
   }
   await p.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await first.locator('img').evaluate(i=>getComputedStyle(i).animationName),'none');
   await first.scrollIntoViewIfNeeded();assert.ok(await first.locator('img').evaluate(i=>i.naturalWidth>0));
   await p.emulateMedia({reducedMotion:'no-preference'});
   if(route==='/trip-types/'){
    const issues=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.deepEqual(issues.violations.map(v=>v.id),[]);
    await p.emulateMedia({reducedMotion:'reduce'});
    for(const image of await cards.locator('img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(i=>i.decode());}
    await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,viewport.width===390?'trip-types-phone.png':'trip-types-desktop.png'),fullPage:true});
    await p.emulateMedia({reducedMotion:'no-preference'});
   }
   checks.push({route,width:viewport.width,cards:count});
  }
  await context.close();
 }
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();
 await page.goto(base+'/trip-types/');const imgs=page.locator('.type-card img');assert.equal(await imgs.count(),16);await imgs.first().scrollIntoViewIfNeeded();await imgs.first().evaluate(i=>i.decode());assert.equal(await imgs.first().isVisible(),true);await context.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({checks,noJavaScript:true,errors},null,2));console.log(JSON.stringify({pages:checks.length,noJavaScript:true,errors}));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
