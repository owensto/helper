/* Run against a preview server. PLAYWRIGHT_MODULE/CHROMIUM_PATH can use a local runtime. */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TEST_ORIGIN || 'http://127.0.0.1:8057';
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
  const errors = [], checks = [];
  const context = await browser.newContext({viewport:{width:1440,height:1100}, reducedMotion:'reduce'});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  const reject = async p => {const b = p.getByRole('button',{name:'Reject non-essential',exact:true}); if(await b.isVisible()) await b.click();};
  const count = async n => page.waitForFunction(n => Number(document.querySelector('[data-atlas-gl]').dataset.matches) === n, n);
  const gameState = () => page.locator('[data-fishing-game]').getAttribute('data-state');
  const helpers=require('./game-test-helpers.cjs');const cast=()=>helpers.cast(page),bite=()=>helpers.bite(page);
  try {
    await page.goto(base+'/atlas/'); await reject(page);
    await page.waitForSelector('[data-ready=true]',{timeout:45000});
    const data = await page.evaluate(async()=> (await (await fetch(document.querySelector('[data-atlas-gl]').dataset.catalog)).json()).trips);
    await count(data.length);
    for (const water of ['Freshwater','Saltwater','Ice','Brackish']) {
      await page.locator(`[data-water="${water}"]`).click();
      await count(data.filter(t=>water==='Ice'?t.ice:t.waters.includes(water)).length);
    }
    await page.locator('[data-clear]').click();
    for (const [field,value,predicate] of [
      ['environment','Offshore', t=>t.environments.includes('Offshore')],
      ['species','Rainbow trout',t=>t.species.includes('Rainbow trout')],
      ['month','6',t=>t.months.includes(6)],
      ['style','fly-fishing',t=>t.styles.includes('fly-fishing')]
    ]) {await page.locator(`[name=${field}]`).selectOption(value); await count(data.filter(predicate).length); await page.locator('[data-clear]').click();}
    await page.locator('[name=search]').fill('nothing-zzzzz'); await count(0);
    assert.match(await page.locator('.atlas-list-content').innerText(),/No matching trips/);
    await page.locator('[data-clear]').click();
    const first = await page.locator('.atlas-list-content li a').first().innerText();
    await page.getByRole('button',{name:'Next',exact:true}).click();
    assert.notEqual(await page.locator('.atlas-list-content li a').first().innerText(),first);
    await page.locator('[name=search]').fill('Situk');
    await page.getByRole('button',{name:'Find on map ↗'}).click();
    await page.locator('.atlas-list-content li button').first().click();
    assert.equal(await page.locator('.atlas-trip-panel').isVisible(),true);
    assert.ok(await page.getByRole('link',{name:'View trip ↗'}).getAttribute('href'));
    await page.locator('.atlas-trip-panel img').evaluate(img=>img.decode());
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.atlas-trip-panel').isVisible(),false);
    await page.evaluate(() => {
      window.locationCalls=0;
      Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success){window.locationCalls++;success({coords:{latitude:45,longitude:-110}});}}});
    });
    assert.equal(await page.evaluate(()=>window.locationCalls),0);
    await page.locator('[data-near]').click();assert.equal(await page.evaluate(()=>window.locationCalls),1);
    checks.push('Atlas catalog, water/environment/species/month/style filters, search, list pages, card, image, Escape and click-only geolocation');
    for(const width of [360,768,1024,1440]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), 'Atlas overflow '+width);
    }
    await page.goto(base+'/atlas/?style=ice-fishing');await page.waitForSelector('[data-ready=true]');
    await count(data.filter(t=>t.styles.includes('ice-fishing')).length);
    checks.push('Atlas shared filter URL and 360–1440px layouts');
    await page.goto(base+'/play/');await reject(page);
    await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
    await page.evaluate(()=>{Math.random=()=>.45;});
    assert.equal(await page.locator('#game-sound').getAttribute('aria-pressed'),'false');
    for(const water of ['river','lake','ice','flats','offshore']) {
      await page.locator(`[data-water=${water}]`).click();
      assert.equal(await page.locator(`[data-water=${water}]`).getAttribute('aria-pressed'),'true');
    }
    await cast(); await page.keyboard.press('Enter'); assert.equal(await gameState(),'wait');await bite();await page.clock.runFor(3400);assert.equal(await gameState(),'lost');
    await cast(); await bite(); await page.clock.runFor(2600); assert.equal(await gameState(),'lost');
    await cast(); await bite(); await page.keyboard.press('Space'); await page.keyboard.down('Space'); await page.clock.runFor(5000); await page.keyboard.up('Space');
    assert.equal(await gameState(),'lost');assert.match(await page.locator('#game-status').innerText(),/snapped/);
    await cast(); await bite(); await page.keyboard.press('Enter');assert.equal(await gameState(),'reel');
    await helpers.fight(page);
    assert.equal(await page.locator('#catch-trip').getAttribute('href'),'/environments/offshore/');
    assert.equal(await page.locator('#game-log li').count(),1);
    const best = await page.locator('#game-best').innerText();assert.match(best,/kg/);
    await page.reload();assert.equal(await page.locator('#game-best').innerText(),best);
    checks.push('Game keyboard cast, early/missed bite, snapped line, controlled reel, catch card, matching trip link and persistent personal best');
    await page.locator('#game-action').click();
    assert.equal(await gameState(),'aim');
    await page.locator('#game-pause').click();assert.equal(await page.locator('[data-fishing-game]').getAttribute('data-paused'),'true');
    await page.clock.runFor(4000);assert.equal(await gameState(),'aim');
    await page.locator('#game-pause').click();
    for(const width of [360,768,1024,1440]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'Game overflow '+width);
    }
    checks.push('Game mouse input, pause and 360–1440px layouts');
    const nojs = await browser.newContext({javaScriptEnabled:false}); const n = await nojs.newPage();
    await n.goto(base+'/atlas/');assert.equal(await n.locator('.atlas-list-content li a').count(),data.length);
    await n.goto(base+'/play/');assert.match(await n.locator('main noscript').innerText(),/needs JavaScript/);await nojs.close();
    checks.push('No-JavaScript atlas list and game explanation');
    const offline=await browser.newContext();const f=await offline.newPage();
    await f.route('https://unpkg.com/**',route=>route.abort());await f.goto(base+'/atlas/');await reject(f);
    await f.waitForFunction(()=>Number(document.querySelector('[data-atlas-gl]').dataset.matches)>0);
    await f.locator('[data-water=Ice]').click();
    assert.ok(Number(await f.locator('[data-atlas-gl]').getAttribute('data-matches'))>0);
    assert.match(await f.locator('.atlas-map-message').innerText(),/map is unavailable/);await offline.close();
    checks.push('Map library failure preserves filters and trip list');
    const phone=await browser.newContext({viewport:{width:360,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const m=await phone.newPage(); m.on('pageerror',e=>errors.push(e.message));
    await m.goto(base+'/play/');await reject(m);await m.locator('#game-action').tap();
    assert.equal(await m.locator('[data-fishing-game]').getAttribute('data-state'),'aim');
    await m.locator('#game-action').tap();assert.equal(await m.locator('[data-fishing-game]').getAttribute('data-state'),'wait');
    await m.goto(base+'/atlas/');await m.waitForSelector('[data-ready=true]');
    await m.locator('.atlas-gl-stage').scrollIntoViewIfNeeded();
    const cdp=await phone.newCDPSession(m), box=await m.locator('#atlas-map').boundingBox();
    const x=Math.round(box.x+box.width/2), y=Math.round(Math.min(650,box.y+box.height*.65));
    const before=await m.evaluate(()=>scrollY);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    for(let step=1;step<=6;step++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*30,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await m.waitForTimeout(500);
    assert.ok(await m.evaluate(()=>scrollY)>before,'One-finger map gesture must scroll the page');
    await phone.close();checks.push('Phone tap controls and native one-finger page scroll over the map');
    assert.deepEqual(errors,[]);
    fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/atlas-game-browser.json',JSON.stringify({passed:true,checks,errors},null,2));
    console.log(JSON.stringify({passed:true,checks,errors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
