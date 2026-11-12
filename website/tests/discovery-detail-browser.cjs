const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8067',shots=path.resolve(__dirname,'../../shots');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const reject=async()=>{const b=p.getByRole('button',{name:'Reject non-essential',exact:true});if(await b.isVisible())await b.click();};
 try{
  await p.goto(base+'/atlas/?search=Situk');await reject();await p.waitForSelector('[data-ready=true]');await p.locator('.atlas-search button').click();await p.waitForSelector('.atlas-trip-panel:not([hidden])');const deep=p.url();assert.match(deep,/trip=/);
  await p.waitForTimeout(1100);await p.keyboard.press('Escape');await p.locator('.atlas-gl-stage').scrollIntoViewIfNeeded();const canvas=p.locator('.maplibregl-canvas'),box=await canvas.boundingBox();await canvas.hover({position:{x:box.width/2,y:box.height/2}});await p.waitForSelector('.atlas-hover-card');await p.locator('.atlas-hover-card img').evaluate(i=>i.decode());await p.screenshot({path:shots+'/atlas-hover-1440.png'});
  await p.goto(deep);await p.waitForSelector('[data-ready=true]');await p.waitForSelector('.atlas-trip-panel:not([hidden])');assert.match(await p.locator('.atlas-trip-panel').innerText(),/Situk/);await p.keyboard.press('Escape');
  await p.locator('[data-search-area]').click();assert.ok(Number(await p.locator('[data-atlas-gl]').getAttribute('data-matches'))>0);
  assert.equal(await p.evaluate(()=>window.ScrollTrigger?.getAll().some(t=>t.vars.scrub||t.vars.pin)||false),false);
  await p.goto(base+'/trips/keys-flats/');await reject();await p.locator('[data-conditions-card]').scrollIntoViewIfNeeded();await p.waitForSelector('[data-card-weather] .forecast-hero');
  for(const width of [1440,390]){await p.setViewportSize({width,height:1000});await p.locator('[data-conditions-card]').scrollIntoViewIfNeeded();await p.waitForTimeout(400);await p.screenshot({path:shots+'/trip-conditions-'+width+'.png'});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);fs.writeFileSync('test-results/discovery-detail-browser.json',JSON.stringify({passed:true,checks:['desktop pin hover image','trip deep link reload','search this area','no pinned or scrubbed animation','live trip conditions at both widths'],errors},null,2));console.log('Discovery detail checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
