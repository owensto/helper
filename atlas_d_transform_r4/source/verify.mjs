import {chromium} from 'playwright';
import fs from 'node:fs';
const url=process.env.BASE_URL||'http://127.0.0.1:8764/index.html';
const dir=process.env.REVIEW_DIR||'/tmp/atlas-r4-review/local';fs.mkdirSync(dir,{recursive:true});
const result={url,revision:4,passed:false,physicalIPhoneTest:false,engineeringValidated:false,tests:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 for(const [label,width,height] of [['desktop',1440,1000],['phone',430,932]]) {
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const row={label,errors:[],assetFailures:[],poses:[]};result.tests.push(row);
  page.on('pageerror',e=>row.errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400&&/ATLAS_D_R4|runtime\.js|viewer\.js|style\.css/.test(r.url()))row.assetFailures.push({url:r.url(),status:r.status()});});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  if(url.includes('githack')){
   await page.waitForTimeout(1500);
   const confirm=page.getByRole('button',{name:'Open the page',exact:true});
   if(await confirm.isVisible()){row.hostConfirmationRequired=true;await confirm.click();}
  }
  await page.waitForFunction(()=>window.ATLAS_D?.ready,{},{timeout:90000});
  for(const p of [0,.38,.62,1]){
   await page.evaluate(p=>{ATLAS_D.seek(p);ATLAS_D.setView('profile');},p);
   await page.waitForTimeout(700);
   row.poses.push(await page.evaluate(()=>{
    const a=ATLAS_D,roof=a.model.getObjectByName('Forward_leisure_canopy_roof'),t=a.model.getObjectByName('Starboard_terrace_hinge');
    return{progress:a.progress,depth:a.depth,roofLocalY:roof.position.y,terraceQuaternion:t.quaternion.toArray(),scaleTracks:a.clip.tracks.filter(t=>t.name.endsWith('.scale')).length,modelMeshes:a.renderer.info.render.calls,...a.diagnostics()};
   }));
   await page.screenshot({path:`${dir}/${label}_${p===0?'surface':p===.62?'ready':p===1?'submerged':'mid'}.png`,timeout:90000});
  }
  const drop=row.poses[0].roofLocalY-row.poses[2].roofLocalY;
  if(Math.abs(drop-5.16)>.01)throw new Error('Forward canopy did not physically lower 5.16 m');
  if(row.poses[2].depth>.01)throw new Error('Dive-ready comparison is not held at the surface');
  if(row.poses.some(p=>p.scaleTracks!==0))throw new Error('Structural scale tracks found');
  row.canopyDropMetres=drop;
  await page.evaluate(()=>ATLAS_D.reset());await page.locator('#compare').click();
  await page.waitForFunction(()=>Math.abs(ATLAS_D.progress-.62)<.002);
  await page.locator('#compare').click();await page.waitForFunction(()=>ATLAS_D.progress===0);
  // Test pause and the dedicated transformation stop without a long wall-clock wait.
  await page.locator('#transform').click();await page.waitForTimeout(1200);
  if(!await page.evaluate(()=>ATLAS_D.transitioning))throw new Error('Transform control did not start');
  await page.locator('#play').click();if(await page.evaluate(()=>ATLAS_D.transitioning))throw new Error('Pause failed');
  await page.locator('#transform').click();await page.evaluate(()=>{ATLAS_D.seek(.619);ATLAS_D.play()});await page.waitForFunction(()=>Math.abs(ATLAS_D.progress-.62)<.001&&!ATLAS_D.transitioning,{},{timeout:10000});row.automaticSurfaceStop=true;await page.evaluate(()=>{ATLAS_D.seek(.62);ATLAS_D.setView('mechanism')});
  await page.waitForTimeout(600);await page.screenshot({path:`${dir}/${label}_canopies.png`,timeout:90000});
  await page.locator('[data-view=stern]').click();await page.waitForTimeout(600);await page.screenshot({path:`${dir}/${label}_stern.png`,timeout:90000});
  await page.evaluate(()=>{ATLAS_D.setXray(true);ATLAS_D.setSystem('pressure')});await page.waitForTimeout(500);
  await page.screenshot({path:`${dir}/${label}_pressure.png`,timeout:90000});
  row.controls=['Before / Ready','Transform only','Pause','Canopies','Stern','Pressure-core inspection'];row.passed=row.errors.length===0&&row.assetFailures.length===0;
  if(!row.passed)throw new Error('Browser or model asset errors');
  await page.close();
 }
 result.passed=true;
} catch(e){result.failure=String(e);console.error(e);process.exitCode=1;}
finally{fs.writeFileSync(`${dir}/validation.json`,JSON.stringify(result,null,2));await browser.close();}
