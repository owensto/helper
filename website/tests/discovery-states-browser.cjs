const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8067';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const start=Math.floor(Date.now()/86400000)*86400,reply=(route,value)=>route.fulfill({contentType:'application/json',body:JSON.stringify(value)});let fail=false,calls=0;
 await context.route('https://api.open-meteo.com/**',route=>{
  calls++;if(fail)return route.fulfill({status:503,body:'Unavailable'});
  const q=new URL(route.request().url()).searchParams,us=q.get('temperature_unit')==='fahrenheit',days=Number(q.get('forecast_days')),hourly={time:Array.from({length:(days+1)*24},(_,i)=>start-86400+i*3600)},daily={time:Array.from({length:days+1},(_,i)=>start-86400+i*86400)};
  for(const [key,v] of Object.entries({temperature_2m:us?75:24,apparent_temperature:us?78:26,weather_code:2,wind_speed_10m:us?10:16,wind_gusts_10m:us?15:24,wind_direction_10m:90,precipitation:us?.02:.5,cloud_cover:35,pressure_msl:1014}))hourly[key]=hourly.time.map((_,i)=>key==='temperature_2m'?v+Math.sin(i/3)*5:key==='pressure_msl'?v-i*.1:v);
  for(const [key,v] of Object.entries({temperature_2m_max:us?80:27,temperature_2m_min:us?65:18,wind_speed_10m_max:us?15:24,wind_gusts_10m_max:us?25:40,wind_direction_10m_dominant:90,precipitation_sum:us?.1:2.5}))daily[key]=daily.time.map(()=>v);
  daily.sunrise=daily.time.map(t=>t+21600);daily.sunset=daily.time.map(t=>t+64800);
  return reply(route,{timezone:'Etc/UTC',hourly,daily});
 });
 await context.route('https://marine-api.open-meteo.com/**',route=>{const q=new URL(route.request().url()).searchParams,time=Array.from({length:168},(_,i)=>start+i*3600);return reply(route,{latitude:Number(q.get('latitude')),longitude:Number(q.get('longitude')),timezone:'Etc/UTC',hourly:{time,wave_height:time.map(()=>1.2),swell_wave_period:time.map(()=>7.8),wave_period:time.map(()=>8),sea_surface_temperature:time.map(()=>23)}});});
 await context.addInitScript(()=>{window.locationCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success){window.locationCalls++;success({coords:{latitude:24.55,longitude:-81.8}});}}});});
 try{
  await p.clock.install();await p.goto(base+'/tools/weather/?lat=24.55&lon=-81.8&name=Key+West');await p.waitForSelector('.marine-metrics');
  const reject=p.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();
  assert.equal(await p.evaluate(()=>window.locationCalls),0);assert.equal(await p.locator('.forecast-days article').count(),7);
  await p.locator('[data-forecast-day="4"]').click();assert.equal(await p.locator('[data-forecast-day="4"]').getAttribute('aria-pressed'),'true');
  await p.locator('[data-hour-slider]').fill('18');assert.match(await p.locator('[data-hour-readout]').innerText(),/6:00 PM/);
  await p.locator('[data-save-place]').click();await p.reload();await p.waitForSelector('.marine-metrics');assert.equal(await p.locator('[data-save-place]').getAttribute('aria-pressed'),'true');
  const before=calls;await p.clock.fastForward(900001);await p.waitForFunction(()=>!document.querySelector('[data-conditions-output]').hasAttribute('aria-busy'));assert.ok(calls>before,'Refresh after 15 minutes');
  fail=true;await p.clock.fastForward(900001);await p.getByRole('button',{name:'Try again',exact:true}).waitFor();assert.ok(await p.locator('.forecast-hero').count(),'Stale forecast stays visible after a refresh failure');assert.match(await p.locator('[data-conditions-status]').innerText(),/out of date/);
  fail=false;await p.getByRole('button',{name:'Try again',exact:true}).click();await p.waitForSelector('.marine-metrics');
  await p.goto(base+'/search/?q=tarpon&type=Trips&water=Saltwater');await p.waitForSelector('.search-card');assert.equal(await p.locator('[data-filter=type]').inputValue(),'Trips');assert.equal(await p.locator('[data-filter=water]').inputValue(),'Saltwater');
  await p.locator('[data-search-clear]').click();await p.locator('[data-search-near]').click();await p.waitForFunction(()=>document.querySelector('.search-count').textContent.includes('Nearest'));assert.equal(await p.evaluate(()=>window.locationCalls),1);assert.match(await p.locator('.search-card').first().innerText(),/km away/);
  await p.locator('[data-search-clear]').click();await p.locator('#page-search').fill('tarpon');await p.locator('.discovery-form button').click();await p.locator('#page-search').blur();await p.keyboard.press('/');await p.waitForSelector('#search-dialog[open]');assert.ok(await p.locator('[data-query=tarpon]').count());await p.locator('[data-clear-recent]').click();assert.equal(await p.locator('[data-clear-recent]').count(),0);
  assert.deepEqual(errors,[]);fs.writeFileSync('test-results/discovery-states-browser.json',JSON.stringify({passed:true,checks:['7 daily cards','day selection','hour scrubber','saved place survives reload','15 minute refresh','stale forecast retained and retry','no automatic location request','search URL filters','nearby trip ranking','recent search clear'],errors},null,2));console.log('Discovery state checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
