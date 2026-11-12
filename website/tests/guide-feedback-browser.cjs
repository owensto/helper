/* All authored guides: source navigation, shopping links, layout, and screenshots. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const shots=process.env.SHOTS_DIR||path.resolve(root,'../../shots');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8046';
const data=JSON.parse(fs.readFileSync(root+'/src/guides.json'));
const world=JSON.parse(fs.readFileSync(root+'/src/world.json'));
const overrides=JSON.parse(fs.readFileSync(root+'/src/title-overrides.json'));
for(const [id,override] of Object.entries(overrides.trips||{}))if(data.trips[id])data.trips[id].title=override.title;
const guides=[...data.articles.map(g=>({route:'/guides/'+g.slug+'/',slug:g.slug,title:g.title})),...Object.entries(data.trips).map(([id,g])=>({route:world.trips.find(t=>t.id===id).canonicalPath,slug:id,title:g.title}))];
fs.mkdirSync(shots,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});const errors=[];const report=[];
 try{
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   for(const g of guides.filter(g=>!process.env.GUIDE_FILTER||process.env.GUIDE_FILTER.split(',').includes(g.slug))){
    await page.goto(base+g.route,{waitUntil:'networkidle'});
    const reject=page.getByRole('button',{name:'Reject non-essential'});if(await reject.isVisible())await reject.click();
    await page.locator('main img').evaluateAll(async imgs=>{imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode().catch(()=>{})))});
    assert.equal(await page.locator('h1').textContent(),g.title);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,g.route+' overflow');
    assert.deepEqual(await page.locator('main img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).map(i=>i.src)),[],g.route+' broken images');
    assert.doesNotMatch(await page.locator('main').innerText(),/\bowner(?:s|ship)?\b/i,g.route+' internal role');
    const disclosure=page.locator('.guide-sources details');
    assert.equal(await disclosure.count(),1,g.route);
    assert.equal(await disclosure.getAttribute('open'),null,g.route+' must start closed');
    const file=part=>shots+'/feedback-'+g.slug+'-'+width+'-'+part+'.png';
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:file('top')});await page.screenshot({path:file('full'),fullPage:true});
    const first=page.locator('.gr-section,.guide-section').first();
    await first.evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-100));await page.screenshot({path:file('content')});
    const faq=page.locator('.guide-faq').first();await faq.locator('summary').click();assert.equal(await faq.getAttribute('open'),'');await faq.locator('summary').click();
    const cite=page.locator('.guide-citations a').first();const hash=await cite.getAttribute('href');
    await cite.focus();await page.keyboard.press('Enter');
    assert.equal(await disclosure.getAttribute('open'),'');
    assert.equal(await page.evaluate(()=>document.activeElement.id),hash.slice(1));
    const source=page.locator(hash);assert.ok(await source.isVisible());
    assert.ok((await source.boundingBox()).y>=70,g.route+' citation under header');
    await page.waitForFunction(hash=>location.hash===hash,hash);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.locator('#sources').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-100));await page.screenshot({path:file('sources')});
    const sourceLinks=page.locator('.source-group li');
    assert.equal(await disclosure.locator('summary').textContent(),'Sources ('+await sourceLinks.count()+')');
    assert.equal(await disclosure.locator('.source-checked').textContent(),'Checked November 2026');
    assert.deepEqual(await page.locator('main a[href^="#"]').evaluateAll(links=>links.filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)),[],g.route+' broken anchors');
    for(const card of await page.locator('.gr-product,.gr-link-product').all()){
     assert.equal(await card.locator('a[href*="amazon.com"]').count(),1);
     assert.equal((await card.locator('.gr-buy').innerText()).replace('↗','').trim(),'Check price');
     if(width===390)assert.ok((await card.boundingBox()).width>=300,g.route+' narrow card');
    }
    assert.deepEqual(await page.locator('main a[href*="amazon.com"]').evaluateAll(links=>links.filter(a=>!new URL(a.href).searchParams.get('tag')||!a.rel.includes('sponsored')).map(a=>a.href)),[]);
    const products=page.locator('#shopping-list');
    if(await products.count()){
     await products.evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-100));await page.screenshot({path:file('products')});
    }
    // Same-hash links work after the reader closes the disclosure.
    await disclosure.locator('summary').click();await cite.click();assert.equal(await disclosure.getAttribute('open'),'');
    await page.reload({waitUntil:'networkidle'});assert.equal(await disclosure.getAttribute('open'),'');
    report.push({...g,width,sources:await sourceLinks.count()});console.log(width+' '+g.slug);
   }
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'no-preference'});
  const page=await context.newPage();await page.goto(base+'/guides/merino-wool-fishing-base-layers/',{waitUntil:'networkidle'});
  await page.locator('[data-action="menu"]').click();assert.equal(await page.locator('#main').evaluate(el=>el.inert),true);
  await page.locator('[data-action="menu"]').click();assert.equal(await page.locator('#main').evaluate(el=>el.inert),false);
  assert.deepEqual(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/gsap|ScrollTrigger|lenis/.test(r.name)).map(r=>r.name)),[]);
  await context.close();assert.deepEqual(errors,[]);
  fs.writeFileSync(root+'/test-results/guide-feedback-browser'+(process.env.GUIDE_FILTER?'-focused':'')+'.json',JSON.stringify({passed:true,report,errors},null,2));
  console.log('PASS '+report.length+' guide/viewport checks');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
