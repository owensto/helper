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
  const tapAt = (x, y) => page.evaluate(({x, y}) => {
    const canvas = document.querySelector('#cc-canvas');
    const r = canvas.getBoundingClientRect();
    const o = {bubbles:true, cancelable:true, clientX:r.left + x, clientY:r.top + y, button:0, pointerId:1, pointerType:'mouse', isPrimary:true};
    canvas.dispatchEvent(new PointerEvent('pointerdown', o));
    canvas.dispatchEvent(new PointerEvent('pointerup', o));
  }, {x, y});
  const hold = down => page.evaluate(down => {
    const canvas = document.querySelector('#cc-canvas');
    const r = canvas.getBoundingClientRect();
    const o = {bubbles:true, cancelable:true, clientX:r.left + r.width * .5, clientY:r.top + r.height * .62, button:0, pointerId:1, pointerType:'mouse', isPrimary:true};
    canvas.dispatchEvent(new PointerEvent(down ? 'pointerdown' : 'pointerup', o));
  }, down);
  const count = async n => page.waitForFunction(n => Number(document.querySelector('[data-atlas-gl]').dataset.matches) === n, n);
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
    await page.evaluate(()=>localStorage.clear());await page.reload();await reject(page);
    await page.waitForFunction(()=>window.CastwardPlay);
    assert.equal(await page.locator('#cc-sound').getAttribute('aria-pressed'),'false');
    const names={river:'River',lake:'Lake',ice:'Ice edge',flats:'Flats',offshore:'Offshore'};
    for(const water of ['lake','ice','flats','offshore','river']) {
      await page.locator('#cc-water-btn').click();
      await page.locator(`[data-w=${water}]`).click();
      assert.equal((await page.locator('#cc-water-name').innerText()).trim(), names[water]);
    }
    await page.locator('#cc-canvas').scrollIntoViewIfNeeded();
    const fish=await page.evaluate(()=>window.CastwardPlay.state().fish[0]);
    await tapAt(fish.x, fish.y);
    await page.evaluate(()=>window.CastwardPlay.advance(0.7));
    let phase=await page.evaluate(()=>{for(let i=0;i<40 && !['strike','lost','fight'].includes(window.CastwardPlay.state().phase);i++)window.CastwardPlay.advance(0.15);return window.CastwardPlay.state().phase;});
    assert.equal(phase,'strike');
    await page.evaluate(()=>window.CastwardPlay.advance(3.4));
    assert.equal(await page.evaluate(()=>window.CastwardPlay.state().phase),'lost');
    assert.match(await page.locator('#cc-hint').innerText(),/Too late/i);
    assert.match(await page.locator('#cc-hint').innerText(),/float goes under/);
    await page.evaluate(()=>window.CastwardPlay.advance(3.4));
    const fish2=await page.evaluate(()=>window.CastwardPlay.state().fish[0]);
    await tapAt(fish2.x, fish2.y);
    await page.evaluate(()=>window.CastwardPlay.advance(0.7));
    phase=await page.evaluate(()=>{for(let i=0;i<50 && window.CastwardPlay.state().phase!=='strike';i++)window.CastwardPlay.advance(0.15);return window.CastwardPlay.state().phase;});
    assert.equal(phase,'strike');
    await hold(true);
    assert.equal(await page.evaluate(()=>window.CastwardPlay.state().phase),'fight');
    await hold(true);
    let snap='';
    for (let i=0;i<40;i++) {
      const s=await page.evaluate(()=>{window.CastwardPlay.advance(0.25,true);return window.CastwardPlay.state();});
      if (s.phase==='lost') { snap=s.reason; break; }
    }
    await hold(false);
    assert.equal(snap,'snap');
    assert.match(await page.locator('#cc-hint').innerText(),/Let go when the bar turns red/);
    await page.evaluate(()=>localStorage.clear());await page.reload();await reject(page);await page.waitForFunction(()=>window.CastwardPlay);
    const fishL=await page.evaluate(()=>window.CastwardPlay.state().fish[0]);
    await tapAt(fishL.x, fishL.y);
    await page.evaluate(()=>window.CastwardPlay.advance(0.7));
    phase=await page.evaluate(()=>{for(let i=0;i<40 && window.CastwardPlay.state().phase!=='strike';i++)window.CastwardPlay.advance(0.1);return window.CastwardPlay.state().phase;});
    assert.equal(phase,'strike');
    await hold(true);
    await hold(true);
    for(let i=0;i<350;i++){
      const s=await page.evaluate(()=>window.CastwardPlay.state());
      if(s.phase==='landed'||s.phase==='lost'){phase=s.phase;break;}
      const release=s.mode==='run'||s.jump>0.12||s.tension>(s.kind==='deep'?0.64:0.7);
      await hold(!release);
      await page.evaluate(()=>window.CastwardPlay.advance(0.1,true));
      phase=s.phase;
    }
    await hold(false);
    await page.evaluate(()=>window.CastwardPlay.advance(1));
    assert.equal(await page.evaluate(()=>window.CastwardPlay.state().phase),'landed');
    assert.match(await page.locator('#cc-card-real').getAttribute('href'),/\/environments\/rivers-streams\//);
    assert.match(await page.locator('[data-log-count]').first().innerText(),/1 of 34/);
    const best=await page.locator('#cc-best').innerText();assert.match(best,/in/);
    await page.reload();await page.waitForFunction(()=>window.CastwardPlay);
    assert.equal(await page.locator('#cc-best').innerText(),best);
    checks.push('Game cast, missed bite, snapped line, reel, catch card, trip link and saved best');
    await page.locator('#cc-tackle-btn').click();
    assert.equal(await page.locator('[data-cast-game]').getAttribute('data-paused'),'true');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.querySelector('[data-cast-game]').dataset.paused==='false');
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
    await m.goto(base+'/play/');await reject(m);await m.locator('#cc-canvas').tap();
    await m.waitForFunction(()=>['cast','wait','strike'].includes(document.querySelector('[data-cast-game]').dataset.phase));
    await m.goto(base+'/atlas/');await m.waitForSelector('[data-ready=true]');
    await m.locator('.atlas-gl-stage').scrollIntoViewIfNeeded();
    const cdp=await phone.newCDPSession(m), mapBox=await m.locator('#atlas-map').boundingBox();
    const x=Math.round(mapBox.x+mapBox.width/2), y=Math.round(Math.min(650,mapBox.y+mapBox.height*.65));
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
