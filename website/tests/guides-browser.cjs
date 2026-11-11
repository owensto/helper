const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {AxeBuilder}=require(process.env.AXE_MODULE || '@axe-core/playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const out=process.env.GUIDE_TEST_OUTPUT || root+'/test-results/guides-browser';fs.mkdirSync(out,{recursive:true});
const base=process.env.TEST_ORIGIN || 'http://127.0.0.1:8041';
const c=JSON.parse(fs.readFileSync(root+'/src/guides.json'));const w=JSON.parse(fs.readFileSync(root+'/src/world.json'));
const routes=[...Object.entries(c.trips).map(([id,g])=>({path:w.trips.find(t=>t.id===id).canonicalPath,g})),...c.articles.map(g=>({path:'/guides/'+g.slug+'/',g}))];
(async()=>{const browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});const p=await ctx.newPage();const errors=[],failures=[],overflow=[],checks=[];p.on('pageerror',e=>errors.push(e.message));
try{
for(const [i,r] of routes.entries()){
 await p.goto(base+r.path);await p.waitForFunction(()=>!!window.AtlasEngine);
 const reject=p.getByRole('button',{name:'Reject non-essential'});if(await reject.isVisible())await reject.click();
 assert.equal(await p.locator('h1').textContent(),r.g.title);
 await p.locator('.guide-hero img').evaluate(img=>img.decode());
 const faq=p.locator('.guide-faq').first();await faq.locator('summary').click();assert.equal(await faq.getAttribute('open'),'');
 const qa=await new AxeBuilder({page:p}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 for(const v of qa.violations)failures.push({path:r.path,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)});
 for(const width of [375,768,1440]){await p.setViewportSize({width,height:950});const bad=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(bad)overflow.push({path:r.path,width});}
 if(i===0){await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:out+'/islamorada-desktop.png'});await p.setViewportSize({width:375,height:900});await p.screenshot({path:out+'/islamorada-mobile.png'});await p.locator('#choose').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/islamorada-table-mobile.png'});}
 if(r.g.slug==='first-offshore-fishing-charter-checklist'){await p.setViewportSize({width:1440,height:1000});await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:out+'/offshore-desktop.png'});}
 await p.getByRole('link',{name:'Plan this trip ↗',exact:true}).first().click();await p.waitForSelector('#plan-destination');assert.equal(await p.locator('#plan-destination').inputValue(),r.g.destination);
 checks.push(r.path+' → '+r.g.destination);
}
await p.goto(base+'/plan/?destination=na-us-fl-001');await p.waitForSelector('[data-gear-status]');
const item=p.locator('[data-gear-status]').first();const id=await item.getAttribute('id');await item.selectOption('owned');await p.reload();await p.waitForSelector('#'+id);assert.equal(await p.locator('#'+id).inputValue(),'owned');checks.push('Owned gear persists after reload');
const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'Export text'}).click();const download=await downloadPromise;await download.saveAs(out+'/guide-planner-export.txt');assert.match(fs.readFileSync(out+'/guide-planner-export.txt','utf8'),/Islamorada/);checks.push('Planner exports correct destination');
await p.goto(base+'/guides/');await p.setViewportSize({width:1440,height:1000});await p.screenshot({path:out+'/hub-desktop.png'});await p.setViewportSize({width:375,height:900});await p.screenshot({path:out+'/hub-mobile.png'});assert.equal(await p.locator('.world-card').count(),40);assert.equal(await p.locator('.article-card').count(),11);
await p.goto(base+routes[0].path);await p.locator('video').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('video').readyState>=2);await p.locator('video').evaluate(async v=>{v.muted=true;await v.play();});await p.waitForFunction(()=>document.querySelector('video').currentTime>0);checks.push('Embedded reel plays');
assert.deepEqual(errors,[]);assert.deepEqual(overflow,[]);assert.deepEqual(failures,[]);
console.log(JSON.stringify({passed:true,pages:routes.length,viewports:[375,768,1440],checks,errors,overflow,accessibilityViolations:failures},null,2));
}catch(e){console.log(JSON.stringify({passed:false,error:e.message,checks,errors,overflow,accessibilityViolations:failures},null,2));process.exitCode=1;}finally{await browser.close();}})();
