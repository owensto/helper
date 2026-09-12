import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const url=process.argv[2];
const output=process.argv[3]||'atlas_d_continuous/release_validation.json';
if(!url)throw new Error('A concrete viewer URL is required');
fs.mkdirSync(path.dirname(output),{recursive:true});
const report={url,passed:false,physicalIPhoneTest:false,tests:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const [label,width,height] of [['desktop',1400,900],['phone',430,932]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const result={label,width,height,errors:[],assetFailures:[],checks:[]};report.tests.push(result);
  page.on('pageerror',e=>result.errors.push(String(e)));
  page.on('requestfailed',r=>{if(/(runtime\.js|viewer\.js|Continuous_Dive\.glb)/.test(r.url()))result.assetFailures.push({url:r.url(),error:r.failure()});});
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});result.httpStatus=response.status();
  if(response.status()!==200)throw new Error('Viewer HTTP '+response.status());
  const confirmation=page.getByRole('button',{name:'Open the page',exact:true});
  result.hostConfirmationRequired=await confirmation.isVisible().catch(()=>false);
  if(result.hostConfirmationRequired)await confirmation.click({timeout:20000});
  await page.waitForFunction(()=>window.ATLAS_D?.ready===true,{},{timeout:120000});
  const revision=await page.evaluate(()=>window.ATLAS_D.revision);
  if(revision!==2)throw new Error('Wrong published model revision: '+revision);
  result.revision=revision;result.finalURL=page.url();
  for(const progress of [0,.34,.54,.70,.85,1]){
   await page.locator('#timeline').evaluate((el,p)=>{el.value=String(Math.round(p*1000));el.dispatchEvent(new Event('input',{bubbles:true}));},progress);
   const d=await page.evaluate(()=>window.ATLAS_D.diagnostics());result.checks.push(d);
   if(Math.abs(d.progress-progress)>.001||!d.hullOpaque||d.alternateEnvelopeNodes!==0||d.animatedScaleTracks!==0||!d.deckAndHullLocalScaleFixed||Math.abs(d.tenderY)>.001||Math.abs(d.waterY-.012)>.001)throw new Error('Continuous-vessel invariant failed: '+JSON.stringify(d));
  }
  await page.locator('#xray').click();
  if(!await page.evaluate(()=>window.ATLAS_D.xray))throw new Error('X-ray did not activate');
  await page.locator('#xray').click();
  await page.locator('[data-view="stern"]').click();
  await page.locator('#reset').click();
  await page.locator('#play').click();
  await page.waitForFunction(()=>window.ATLAS_D.progress>0,{},{timeout:15000});
  await page.locator('#play').click();
  if(await page.evaluate(()=>window.ATLAS_D.transitioning))throw new Error('Pause did not work');
  await page.locator('#timeline').evaluate(el=>{el.value='950';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#reverse').click();
  await page.waitForFunction(()=>window.ATLAS_D.progress<.95,{},{timeout:15000});
  await page.evaluate(()=>window.ATLAS_D.pause());
  await page.locator('#reset').click();
  await page.waitForTimeout(400);
  await page.screenshot({path:path.join(path.dirname(output),'published_'+label+'.png'),timeout:90000});
  if(result.errors.length||result.assetFailures.length)throw new Error('Runtime errors or required asset failures');
  result.controls=['scrubber','play','pause','reverse','reset','closures camera','X-ray'];result.passed=true;
  await context.close();
 }
 report.passed=true;
}catch(e){report.failure=String(e);throw e;}
finally{fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
