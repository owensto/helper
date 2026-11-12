const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8067',shots=path.resolve(__dirname,'../../shots');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const errors=[],report={screens:[],checks:[]};
 try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',isMobile:width===390,hasTouch:width===390});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  const go=async route=>{await p.goto(base+route);const reject=p.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();};
  const shot=async name=>{await p.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));window.scrollTo(0,0);});await p.waitForTimeout(350);await p.screenshot({path:shots+'/'+name+'-'+width+'.png',fullPage:true});await p.screenshot({path:shots+'/'+name+'-viewport-'+width+'.png'});report.screens.push(name+'-'+width+'.png');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow: '+name+' '+width);};
  await go('/tools/weather/?lat=24.55&lon=-81.8&name=Key+West%2C+Florida');
  await p.waitForFunction(()=>document.querySelector('.forecast-days')||document.querySelector('[data-conditions-output] button.btn'),{timeout:30000});
  if(await p.locator('.forecast-days').count()){
   assert.equal(await p.locator('.forecast-days article').count(),7);await p.locator('[data-forecast-day="2"]').click();await p.locator('[data-hour-slider]').fill('12');
   await p.locator('[data-save-place]').click();assert.match(await p.locator('[data-places]').innerText(),/Saved/i);await p.locator('#conditions-units').selectOption('metric');await p.waitForFunction(()=>document.querySelector('.conditions-now')?.textContent.includes('°C'));
   await p.locator('#conditions-units').selectOption('us');await p.waitForFunction(()=>document.querySelector('.conditions-now')?.textContent.includes('°F'));report.checks.push('Live weather, seven days, scrubber, save, units at '+width);
  }else report.checks.push('Live weather unavailable at '+width);
  if(await p.locator('[data-marine-output]').count())await p.waitForFunction(()=>!document.querySelector('[data-marine-output]').textContent.includes('Check coastal data'),null,{timeout:25000});
  await shot('weather');
  await go('/tools/tides/?lat=24.55&lon=-81.8&name=Key+West%2C+Florida');
  await p.waitForFunction(()=>document.querySelector('.tide-chart')||document.querySelector('[data-conditions-output] button.btn'),{timeout:30000});await shot('tides');
  await go('/search/?q=alazka');await p.waitForSelector('.search-card');assert.ok(await p.locator('.search-card').count()>0);await shot('search');
  await p.locator('[data-filter=type]').selectOption('Trips');await p.locator('[data-filter=water]').selectOption('Freshwater');assert.ok(await p.locator('.search-card').count()>0);
  await p.locator('#page-search').fill('xyz-no-such-place');await p.waitForSelector('.search-empty');await p.locator('[data-search-clear]').click();
  await p.locator('#page-search').blur();await p.keyboard.press('/');await p.waitForSelector('#search-dialog[open]');await p.locator('#header-search').fill('tarpon');await p.waitForSelector('.search-hit');
  await p.keyboard.press('ArrowDown');assert.ok(await p.locator('.search-hit.active').count());await p.locator('.search-hit img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>{i.loading='eager';return i.decode().catch(()=>{});}));});await p.screenshot({path:shots+'/search-overlay-'+width+'.png'});await p.keyboard.press('Escape');assert.equal(await p.locator('#search-dialog').isVisible(),false);report.checks.push('Search typo, filters, empty state, keyboard and dialog at '+width);
  await go('/atlas/?water=Saltwater');await p.waitForFunction(()=>document.querySelector('[data-atlas-gl]').dataset.ready==='true',{timeout:30000});
  assert.ok(await p.locator('[data-water=Saltwater][aria-pressed=true]').count());
  await p.locator(width===390?'.atlas-swipe-card button':'.atlas-list-content li button').first().click();await p.waitForSelector('.atlas-trip-panel:not([hidden])');assert.match(p.url(),/trip=/);await p.keyboard.press('Escape');
  if(width===390){await p.locator('[data-view-toggle]').click();assert.equal(await p.locator('#atlas-map').isVisible(),false);await p.locator('[data-view-toggle]').click();assert.equal(await p.locator('#atlas-map').isVisible(),true);}
  await p.locator('[data-fit]').click();await p.waitForTimeout(500);await shot('atlas');report.checks.push('Live map, water deep link, trip select, list switch at '+width);
  if(width===1440){await p.locator('.atlas-gl-stage').scrollIntoViewIfNeeded();await p.screenshot({path:shots+'/atlas-detail-'+width+'.png'});}
  await go('/trips/?q=alaska');await p.waitForTimeout(300);await shot('trips');
  await context.close();
 }
 assert.deepEqual(errors,[]);report.errors=errors;fs.writeFileSync('test-results/discovery-browser.json',JSON.stringify(report,null,2));console.log(report);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
