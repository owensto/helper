import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const base=process.env.BASE_URL||'http://127.0.0.1:8755/';
const out=process.env.REVIEW_DIR||'/tmp/atlas-r3-review';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
for(const [label,width,height] of [['desktop',1440,1000],['phone',430,932]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:label==='phone'});const page=await context.newPage();
 const errors=[],failures=[];page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>{if(/ATLAS_D_R3|viewer.js|runtime.js|style.css/.test(r.url()))failures.push(r.url()+':'+r.failure()?.errorText)});
 try{
 const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});let confirmation=false;
 if(await page.getByRole('button',{name:'Open the page',exact:true}).count()){confirmation=true;await page.getByRole('button',{name:'Open the page',exact:true}).click();}
 await page.waitForFunction(()=>window.ATLAS_D?.ready,{},{timeout:90000});
 const checks=[];for(const progress of [0,.34,.46,.60,.70,.84,1]){await page.evaluate(v=>ATLAS_D.seek(v),progress);checks.push(await page.evaluate(()=>ATLAS_D.diagnostics()))}
 const last=checks.at(-1);if(last.revision!==3||last.scaleTracks!==0||last.hullCount!==6||Math.abs(last.pressureBar-4.0207265)>.0001||last.ratedDepth!==null)throw Error('Physics or continuous-hull validation failed '+JSON.stringify(last));
 if(checks[3].datumDepth!==0||checks.some(c=>c.tenderY!==0||c.waterY!==.012))throw Error('Fixed ocean / staged descent validation failed');
 await page.evaluate(()=>ATLAS_D.reset());await page.locator('#inspect-button').click();await page.locator('#fault').click();
 await page.locator('#timeline').focus();await page.locator('#timeline').press('End');
 const stopped=await page.evaluate(()=>ATLAS_D.diagnostics());if(stopped.progress!==.46||stopped.datumDepth!==0||stopped.pressureHatchesClosed)throw Error('Hatch fault did not inhibit descent '+JSON.stringify(stopped));
 await page.locator('#fault').click();await page.locator('#close-inspector').click();await page.evaluate(()=>ATLAS_D.reset());
 await page.locator('#play').click();await page.waitForTimeout(750);await page.locator('#play').click();if(await page.evaluate(()=>ATLAS_D.progress)<=0)throw Error('Play/pause failed');
 await page.locator('#reverse').click();await page.waitForTimeout(250);await page.evaluate(()=>ATLAS_D.pause());await page.locator('#reset').click();
 await page.waitForTimeout(500);await page.screenshot({path:path.join(out,label+'_surface.png'),timeout:60000});
 await page.evaluate(()=>{ATLAS_D.setXray(true);ATLAS_D.setSystem('pressure')});await page.waitForTimeout(500);await page.screenshot({path:path.join(out,label+'_pressure.png'),timeout:60000});
 await page.evaluate(()=>{ATLAS_D.seek(.84);ATLAS_D.setSystem('ballast')});await page.waitForTimeout(300);await page.screenshot({path:path.join(out,label+'_ballast.png'),timeout:60000});
 await page.evaluate(()=>{ATLAS_D.seek(1);ATLAS_D.setSystem('wet')});await page.waitForTimeout(300);await page.screenshot({path:path.join(out,label+'_wet.png'),timeout:60000});
 await page.evaluate(()=>{ATLAS_D.setXray(false);ATLAS_D.setView('hero')});await page.waitForTimeout(300);await page.screenshot({path:path.join(out,label+'_submerged.png'),timeout:60000});
 await page.evaluate(()=>{ATLAS_D.emergency();ATLAS_D.recovery.started-=19000});await page.waitForFunction(()=>Math.abs(ATLAS_D.depth)<.01);const recovery=await page.evaluate(()=>ATLAS_D.diagnostics());if(!recovery.pressureHatchesClosed)throw Error('Recovery reopened pressure boundary');
 await page.locator('#reset').click();
 results.push({label,width,height,url:page.url(),httpStatus:response.status(),hostConfirmationRequired:confirmation,physicsChecks:checks,hatchFault:stopped,recovery,errors,assetFailures:failures,passed:errors.length===0&&failures.length===0});
 }catch(e){fs.writeFileSync(path.join(out,label+'_error.json'),JSON.stringify({error:String(e),errors,failures,body:await page.locator('body').innerText().catch(()=>''),runtime:await page.evaluate(()=>window.ATLAS_D?.diagnostics?.()||window.ATLAS_D?.error).catch(()=>null)},null,2));await page.screenshot({path:path.join(out,label+'_failure.png'),timeout:15000}).catch(()=>{});throw e}finally{await context.close()}
}
if(results.some(r=>!r.passed))throw Error('Browser errors');
}finally{fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({url:base,passed:results.length===2&&results.every(r=>r.passed),physicalIPhoneTest:false,engineeringValidated:false,tests:results},null,2));await browser.close();}
