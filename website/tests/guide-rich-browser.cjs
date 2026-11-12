/* Visual and functional QA for the rich guide schema. Run against a local static server. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const shots=process.env.SHOTS_DIR||path.resolve(root,'../../shots');
fs.mkdirSync(shots,{recursive:true});fs.mkdirSync(root+'/test-results',{recursive:true});
const guides=JSON.parse(fs.readFileSync(root+'/src/guides.json')).articles.filter(g=>g.rich);
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8046';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const errors=[];const report=[];
 try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  for(const g of guides){
   console.log(width+' '+g.slug);
   await page.goto(base+'/guides/'+g.slug+'/',{waitUntil:'networkidle'});
   const reject=page.getByRole('button',{name:'Reject non-essential'});if(await reject.isVisible())await reject.click();
   await page.locator('.guide-hero img').evaluate(el=>el.decode());
   assert.equal(await page.locator('h1').textContent(),g.title);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,g.slug+' overflow '+width);
   const broken=await page.locator('.guide-rich img').evaluateAll(async imgs=>{imgs.forEach(img=>img.loading='eager');await Promise.race([Promise.all(imgs.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,10000))]);return imgs.filter(img=>!img.naturalWidth).map(img=>img.src)});
   assert.deepEqual(broken,[],g.slug+' images');
   if(width===390){for(const card of await page.locator('.gr-product').all())assert.ok((await card.boundingBox()).width>300,g.slug+' mobile product width');}
   const faq=page.locator('.guide-faq').first();await faq.locator('summary').click();assert.equal(await faq.getAttribute('open'),'');await faq.locator('summary').click();
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:shots+'/'+g.slug+'-'+width+'.png'});
   await page.screenshot({path:shots+'/'+g.slug+'-'+width+'-full.png',fullPage:true});
   for(const id of (g.slug==='fishing-waders-buying-guide'?['size-chart','shopping-list']:g.slug==='merino-wool-fishing-base-layers'?['shopping-list']:g.slug.startsWith('how-to-tie')?['steps']:[])){
    await page.locator('#'+id).evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-100));await page.screenshot({path:shots+'/'+g.slug+'-'+id+'-'+width+'.png'});
   }
   const invalid=await page.locator('.guide-rich a[href^="#"]').evaluateAll(links=>links.filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash));assert.deepEqual(invalid,[]);
   const notTagged=await page.locator('.guide-rich a[href*="amazon.com"]').evaluateAll(links=>links.filter(a=>new URL(a.href).searchParams.get('tag')!=='mediaatlas08-20').map(a=>a.href));assert.deepEqual(notTagged,[]);
   report.push({slug:g.slug,width,images:await page.locator('.guide-rich img').count(),overflow:false});
  }
  await context.close();
 }
 // Normal motion must also preserve native scrolling and the mobile navigation.
 const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'no-preference'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/guides/fishing-waders-buying-guide/',{waitUntil:'networkidle'});
 await page.locator('[data-action="menu"]').click();
 assert.equal(await page.locator('#main').evaluate(el=>el.inert),true);
 await page.locator('[data-action="menu"]').click();
 assert.equal(await page.locator('#main').evaluate(el=>el.inert),false);
 await page.setViewportSize({width:1440,height:1000});
 await page.reload({waitUntil:'networkidle'});
 assert.deepEqual(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/gsap|ScrollTrigger|lenis/.test(r.name)).map(r=>r.name)),[]);
 assert.equal(await page.locator('.guide-hero img').evaluate(el=>getComputedStyle(el).transform),'none');
 await context.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(root+'/test-results/guide-rich-browser.json',JSON.stringify({passed:true,pages:report,errors},null,2));console.log('Passed: '+report.length+' guide/viewport checks.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
