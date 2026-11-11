const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {AxeBuilder}=require(process.env.AXE_MODULE||'@axe-core/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=process.env.TEST_ORIGIN||'http://127.0.0.1:8053';
const out=process.env.ATLAS_TEST_OUTPUT||path.resolve(root,'../runs/castward-atlas');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});const checks=[],errors=[],violations=[];
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const p=await ctx.newPage();
 p.on('pageerror',e=>errors.push(e.message));let requests=[];p.on('request',r=>requests.push(r.url()));
 async function go(route){await p.goto(base+route);const reject=p.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();}
 async function ready(){await p.waitForSelector('[data-ready=true]');}
 async function count(n){await p.waitForFunction(n=>Number(document.querySelector('[data-atlas]').dataset.matches)===n,n);}
 try{
  await go('/');await p.waitForTimeout(700);assert.equal(requests.filter(u=>/atlas-map.js|atlas-data-|countries-110m/.test(u)).length,0);checks.push('Home defers the bundle, geography and map catalog until the section approaches');
  await p.locator('[data-atlas]').scrollIntoViewIfNeeded();await ready();await count(801);
  const data=await p.evaluate(async()=>await(await fetch(document.querySelector('[data-atlas]').dataset.catalog)).json());
  assert.equal(data.trips.length,801);await p.screenshot({path:out+'/home-atlas-desktop.png'});
  await go('/atlas/');await ready();assert.equal(await p.locator('.site-header a[href="/plan/"]').count(),1);
  for(const [field,value,predicate] of [
   ['water','Saltwater',t=>t.waters.includes('Saltwater')],['water','Freshwater',t=>t.waters.includes('Freshwater')],['water','Brackish',t=>t.waters.includes('Brackish')],['water','Ice',t=>t.ice],
   ['style','fly-fishing',t=>t.styles.includes('fly-fishing')],['month','6',t=>t.months.includes(6)],['month','12,1,2',t=>t.months.some(m=>[12,1,2].includes(m))]
  ]){await p.locator(`[name="${field}"]`).selectOption(value);await count(data.trips.filter(predicate).length);await p.locator('[data-clear]').click();}
  checks.push('All water choices, trip style, month and three-month windows match catalog membership');
  await p.locator('[name=style]').selectOption('fly-fishing');await p.locator('[name=water]').selectOption('Saltwater');await count(data.trips.filter(t=>t.styles.includes('fly-fishing')&&t.waters.includes('Saltwater')).length);
  await p.locator('[name=search]').fill('no-such-fish-zzzz');await count(0);await p.locator('.atlas-list summary').click();assert.match(await p.locator('.atlas-list-content').innerText(),/No matching/);await p.locator('[data-clear]').click();await count(801);checks.push('Combined filters, empty state and clear filters work');
  await p.locator('[name=search]').fill('tarpon');assert.ok(Number(await p.locator('[data-atlas]').getAttribute('data-matches'))>0);await p.locator('[data-clear]').click();
  const firstLinks=await p.locator('.atlas-list-content li a').allTextContents();await p.locator('[data-page=next]').click();assert.notDeepEqual(await p.locator('.atlas-list-content li a').allTextContents(),firstLinks);await p.locator('[data-page=previous]').click();assert.deepEqual(await p.locator('.atlas-list-content li a').allTextContents(),firstLinks);checks.push('Accessible list pagination preserves access to the full result set');
  for(const region of ['Alaska','Florida','Norway','Australia']){await p.locator(`[data-region="${region}"]`).click();await p.waitForFunction(()=>Number(document.querySelector('[data-atlas]').dataset.zoom)>1);}
  await p.locator('[data-reset]').click();await p.waitForFunction(()=>Number(document.querySelector('[data-atlas]').dataset.zoom)===1);
  await p.getByRole('button',{name:'Zoom in',exact:true}).click();await p.waitForFunction(()=>Number(document.querySelector('[data-atlas]').dataset.zoom)>1);await p.getByRole('button',{name:'Zoom out',exact:true}).click();
  const surface=p.locator('.atlas-map');await surface.focus();await p.keyboard.press('+');const before=await p.locator('.atlas-geography').getAttribute('transform');await p.keyboard.press('ArrowLeft');await p.waitForTimeout(80);assert.notEqual(await p.locator('.atlas-geography').getAttribute('transform'),before);await p.keyboard.press('Home');
  await surface.hover();await p.mouse.wheel(0,-250);await p.waitForTimeout(350);assert.ok(Number(await p.locator('[data-atlas]').getAttribute('data-zoom'))>1);
  const box=await surface.boundingBox();const dragBefore=await p.locator('.atlas-geography').getAttribute('transform');await p.mouse.move(box.x+box.width*.6,box.y+box.height*.65);await p.mouse.down();await p.mouse.move(box.x+box.width*.7,box.y+box.height*.7,{steps:8});await p.mouse.up();await p.waitForTimeout(80);assert.notEqual(await p.locator('.atlas-geography').getAttribute('transform'),dragBefore);checks.push('Region fly-to, reset, buttons, keyboard, wheel and drag work');
  await p.locator('[data-clear]').click();await p.locator('[name=search]').fill('Situk');await p.locator('.atlas-list-content [data-show]').first().click();assert.equal(await p.locator('.atlas-preview').isVisible(),true);assert.match(await p.locator('.atlas-preview').innerText(),/Open trip/);assert.ok(await p.locator('.atlas-preview img').getAttribute('src'));await p.keyboard.press('Escape');assert.equal(await p.locator('.atlas-preview').isVisible(),false);checks.push('List selection opens the trip image and link; Escape closes the card');
  await p.locator('[data-clear]').click();await p.locator('.atlas-list summary').click();await p.screenshot({path:out+'/atlas-desktop.png'});
  for(const route of ['/atlas/','/trip-types/','/trip-types/fly-fishing/','/local-classics/']){
   await go(route);if(route==='/atlas/')await ready();
   const axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();violations.push(...axe.violations.map(v=>({route,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})));
   for(const width of [375,768,1440]){await p.setViewportSize({width,height:950});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' '+width);}
  }
  await go('/trip-types/fly-fishing/');await p.locator('#style-search').fill('Florida');assert.ok(await p.locator('[data-style-trip]:visible').count()>0);await p.locator('#style-search').fill('zzzz-nothing');assert.equal(await p.locator('[data-style-trip]:visible').count(),0);checks.push('Style pages filter all matching destinations and retain the empty state');
  await go('/atlas/?style=ice-fishing');await ready();assert.equal(await p.locator('[name=style]').inputValue(),'ice-fishing');await count(data.trips.filter(t=>t.styles.includes('ice-fishing')).length);checks.push('Shared atlas URLs retain the style filter');
  const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const m=await phone.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(base+'/atlas/');await m.getByRole('button',{name:'Reject non-essential',exact:true}).click();await m.waitForSelector('[data-ready=true]');
  await m.locator('[data-filter-toggle]').click();await m.locator('[name=water]').selectOption('Ice');assert.ok(Number(await m.locator('[data-atlas]').getAttribute('data-matches'))>0);await m.locator('[data-clear]').click();await m.locator('[data-filter-toggle]').click();
  await m.locator('[data-region=Alaska]').click();await m.locator('.atlas-map-stage').scrollIntoViewIfNeeded();await m.screenshot({path:out+'/atlas-phone.png'});
  const cdp=await phone.newCDPSession(m);const mb=await m.locator('.atlas-map').boundingBox();const prior=Number(await m.locator('[data-atlas]').getAttribute('data-zoom'));
  const x=Math.round(mb.x+mb.width/2),y=Math.round(Math.max(150,Math.min(600,mb.y+mb.height/2)));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1},{x:x+30,y,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-70,y,id:1},{x:x+70,y,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.waitForTimeout(100);assert.ok(Number(await m.locator('[data-atlas]').getAttribute('data-zoom'))>prior);checks.push('Phone filters, region tap and two-finger pinch work');
  assert.equal(await m.locator('.atlas-map').count(),1);assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await m.getByRole('button',{name:'Toggle navigation'}).click();assert.equal(await m.locator('#site-nav a[href="/plan/"]').count(),1);assert.equal(await m.locator('#site-nav a[href="/atlas/"]').isVisible(),true);checks.push('Phone navigation has one plan link and an Atlas link');
  await phone.close();
  const nojs=await browser.newContext({javaScriptEnabled:false});const n=await nojs.newPage();await n.goto(base+'/atlas/');assert.equal(await n.locator('.atlas-list-content li a').count(),801);checks.push('All 801 destination links remain available without JavaScript');await nojs.close();
  assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);checks.push('No script errors, layout overflow or automated WCAG A/AA violations');
  fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:true,base,checks,errors,violations},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,errors,violations}));
 }catch(error){fs.writeFileSync(out+'/browser-results.json',JSON.stringify({passed:false,error:error.stack,checks,errors,violations},null,2));console.error(error);process.exitCode=1;}
 finally{await browser.close();}
})();
