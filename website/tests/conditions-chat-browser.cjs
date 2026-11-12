/* Uses an existing Playwright runtime; adds no application dependencies. */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TEST_ORIGIN || 'http://127.0.0.1:8058';
(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context = await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const page = await context.newPage(), errors=[], requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const start = Math.floor(Date.now()/86400000)*86400, iso=t=>new Date(t*1000).toISOString().slice(0,16).replace('T',' ');
  const reply=(route,data)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  await context.route('https://api.open-meteo.com/**',route=>{
    const q=new URL(route.request().url()).searchParams, days=Number(q.get('forecast_days')), us=q.get('temperature_unit')==='fahrenheit';
    const time=Array.from({length:(days+1)*24},(_,i)=>start-86400+i*3600), daily=Array.from({length:days+1},(_,i)=>start-86400+i*86400);
    return reply(route,{timezone:'Etc/UTC',hourly:{time,...Object.fromEntries(Object.entries({temperature_2m:us?75:24,wind_speed_10m:us?10:16,wind_gusts_10m:us?18:29,wind_direction_10m:90,precipitation:0.1,cloud_cover:30,pressure_msl:1010}).map(([k,v])=>[k,time.map((_,i)=>k==='pressure_msl'?v-i*0.2:v)]))},daily:{time:daily,...Object.fromEntries(Object.entries({temperature_2m_max:us?80:27,temperature_2m_min:us?66:19,wind_speed_10m_max:us?15:24,wind_gusts_10m_max:us?25:40,wind_direction_10m_dominant:90,precipitation_sum:0.2}).map(([k,v])=>[k,daily.map(()=>v)])),sunrise:daily.map(t=>t+21600),sunset:daily.map(t=>t+64800)}});
  });
  await context.route('https://marine-api.open-meteo.com/**',route=>{
    const q=new URL(route.request().url()).searchParams, time=Array.from({length:Number(q.get('forecast_days'))*24},(_,i)=>start+i*3600);
    return reply(route,{latitude:Number(q.get('latitude')),longitude:Number(q.get('longitude')),timezone:'Etc/UTC',hourly:{time,wave_height:time.map(()=>1),wave_period:time.map(()=>8),sea_surface_temperature:time.map(()=>24),sea_level_height_msl:time.map((_,i)=>Math.sin(i*Math.PI/6))}});
  });
  let stationRequests=0;
  await context.route('https://api.tidesandcurrents.noaa.gov/mdapi/**',route=>{stationRequests++;return reply(route,{stations:[{id:'8724580',name:'KEY WEST',lat:24.55,lng:-81.8,type:'R'}]});});
  await context.route('https://api.tidesandcurrents.noaa.gov/api/**',route=>{
    const q=new URL(route.request().url()).searchParams;
    assert.equal(q.get('datum'),'MLLW');assert.equal(q.get('time_zone'),'lst_ldt');assert.equal(q.get('range'),'72');
    const hilo=q.get('interval')==='hilo';return reply(route,{predictions:Array.from({length:hilo?12:721},(_,i)=>({t:iso(start+i*(hilo?21600:360)),v:String(2+Math.sin(i*(hilo?Math.PI:Math.PI/60))),...(hilo?{type:i%2?'L':'H'}:{})}))});
  });
  await context.route('https://geocoding-api.open-meteo.com/**',route=>reply(route,{results:[{name:'Key West',country:'United States',latitude:24.55,longitude:-81.8}]}));
  await context.route('**/api/chat',route=>route.fulfill({contentType:'text/event-stream',body:'event: links\ndata: ["/tools/weather/"]\n\ndata: '+JSON.stringify({choices:[{delta:{content:'Bring a rain shell.\n- [Weather](/tools/weather/)\n<img src=x onerror=alert(1)>\n[Fake](/made-up/)\nCheck local regulations and licences.'}}]})+'\n\ndata: [DONE]\n\n'}));
  await context.addInitScript(()=>{window.geoCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success){window.geoCalls++;success({coords:{latitude:24.55,longitude:-81.8}});}}});});
  async function rejectCookies(){const b=page.getByRole('button',{name:'Reject non-essential',exact:true});if(await b.isVisible())await b.click();}
  try {
    await page.goto(base+'/tools/weather/');
    assert.equal(await page.evaluate(()=>window.geoCalls),0);assert.equal(requests.filter(u=>u.includes('/assets/chat.js')).length,0);
    const launch=await page.locator('[data-chat-launch]').boundingBox(),banner=await page.locator('#cookie-banner').boundingBox();
    if(banner)assert.ok(launch.y+launch.height<=banner.y,'Chat launcher clears cookie banner');
    await rejectCookies();await page.locator('#place-search').fill('Key West');await page.locator('.conditions-search').getByRole('button',{name:'Search',exact:true}).click();
    await page.locator('[data-place-results] button').click();await page.waitForSelector('.forecast-days article');
    assert.equal(await page.locator('.forecast-days article').count(),7);assert.match(await page.locator('.conditions-now').innerText(),/75°F/);
    await page.locator('#conditions-units').selectOption('metric');await page.waitForFunction(()=>document.querySelector('.conditions-now')?.textContent.includes('24°C'));
    assert.match(await page.locator('[data-other-tool]').getAttribute('href'),/lat=24.55/);
    await page.locator('[data-locate]').click();assert.equal(await page.evaluate(()=>window.geoCalls),1);
    await page.waitForSelector('.forecast-days article');
    for(const width of [360,768,1024,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Weather overflow '+width);}
    await page.setViewportSize({width:360,height:800});await page.screenshot({path:'test-results/weather-mobile.png'});
    await page.goto(base+'/tools/tides/?lat=24.55&lon=-81.8&name=Key+West');await page.waitForSelector('.tide-chart');
    assert.equal(await page.locator('.tide-chart').count(),3);assert.match(await page.locator('[data-conditions-output]').innerText(),/MLLW/);
    await page.locator('#conditions-units').selectOption('metric');await page.waitForFunction(()=>document.querySelector('.tide-chart figcaption')?.textContent.includes('· m'));
    assert.equal(stationRequests,1,'Station list is cached');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Tide page fits mobile');
    await page.screenshot({path:'test-results/tides-mobile.png'});
    await page.goto(base+'/tools/tides/?lat=-18&lon=178&name=Fiji');await page.waitForSelector('.tide-chart');
    assert.match(await page.locator('[data-conditions-output]').innerText(),/Modelled sea-level estimate/);
    assert.equal(stationRequests,1);
    const catalog=JSON.parse(fs.readFileSync('api/_chat-index.json'));const trip=catalog.find(x=>x.url.includes('/florida/')&&x.url.includes('flats'))||catalog.find(x=>x.url.includes('/north-america/'));
    const before=requests.filter(u=>u.includes('/assets/conditions.js')).length;
    await page.setViewportSize({width:360,height:500});await page.goto(base+trip.url);await page.waitForSelector('[data-conditions-card]');
    assert.equal(requests.filter(u=>u.includes('/assets/conditions.js')).length,before,'Conditions JS stays lazy');
    await page.locator('[data-conditions-card]').scrollIntoViewIfNeeded();await page.waitForSelector('.conditions-now');
    assert.equal(requests.filter(u=>u.includes('/assets/conditions.js')).length,before+1);
    await page.locator('[data-chat-launch]').click();await page.waitForSelector('#castward-chat[open]');
    assert.equal(requests.filter(u=>u.includes('/assets/chat.js')).length,1);
    assert.equal(await page.locator('.chat-starters button').count(),3);
    await page.locator('.chat-starters button').first().click();await page.locator('.chat-form [type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('.chat-status').textContent.startsWith('Answer complete'));
    assert.equal(await page.locator('.chat-message img').count(),0);assert.equal(await page.locator('.chat-message a').count(),1);
    assert.equal(await page.locator('.chat-message a').getAttribute('href'),'/tools/weather/');
    const sheet=await page.locator('#castward-chat').boundingBox();assert.equal(sheet.width,360);assert.equal(sheet.height,500);
    await page.screenshot({path:'test-results/chat-mobile.png'});
    await page.keyboard.press('Escape');assert.equal(await page.locator('#castward-chat').isVisible(),false);
    await page.waitForFunction(()=>document.activeElement.hasAttribute('data-chat-launch'));
    await page.reload();await page.locator('[data-chat-launch]').click();await page.waitForSelector('#castward-chat[open]');assert.equal(await page.locator('.chat-message').count(),2);
    await page.locator('[data-chat-clear]').click();assert.equal(await page.locator('.chat-starters button').count(),3);
    // Replace the success route with a real non-success status for the retry path.
    await context.unroute('**/api/chat');
    await context.route('**/api/chat',route=>route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:'Please wait one minute.'})}));
    await page.locator('#chat-input').fill('Keep this question');await page.locator('.chat-form [type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('.chat-status').textContent.includes('one minute'));
    assert.equal(await page.locator('#chat-input').inputValue(),'Keep this question');
    assert.equal(await page.locator('.chat-message[data-role=user]').count(),0);
    await page.keyboard.press('Escape');
    await context.unroute('https://api.open-meteo.com/**');
    await context.route('https://api.open-meteo.com/**',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.goto(base+'/tools/weather/?lat=24.55&lon=-81.8');
    await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
    assert.match(await page.locator('[data-conditions-status]').innerText(),/unavailable/);
    assert.deepEqual(errors,[]);
    fs.writeFileSync('test-results/conditions-chat-browser.json',JSON.stringify({passed:true,checks:['weather search and units','click-only location','7 daily forecasts','3 NOAA tide curves','station cache','model fallback','mobile overflow','lazy conditions and chat','cookie clearance','escaped streaming markdown','history and clear','focus and Escape']},null,2));
    console.log('Browser checks passed.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
