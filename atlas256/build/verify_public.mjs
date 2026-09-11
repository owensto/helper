import fs from 'node:fs';import path from 'node:path';import {chromium} from '@playwright/test';
const sha=process.argv[2],out=path.resolve(process.argv[3]);if(!/^[0-9a-f]{40}$/.test(sha))throw Error('Invalid commit');
const url=`https://raw.githack.com/owensto/helper/${sha}/atlas256/v2/index.html`;const result={url,commit:sha,scope:'Real public network load in headless Chromium; mobile viewport emulation, not a physical iPhone',results:[]};let browser;
try{browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const device of [{name:'desktop',viewport:{width:1440,height:960},deviceScaleFactor:1},{name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}]){
 const context=await browser.newContext(device),page=await context.newPage(),errors=[],assets=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.url().includes('/atlas256/v2/'))assets.push({url:r.url(),status:r.status()});});
 let response;for(let attempt=0;attempt<3;attempt++){response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});if(response.status()===200)break;await page.waitForTimeout(2000);}
 if(response.status()!==200)throw Error('Public page status '+response.status());
 await page.waitForFunction(()=>window.ATLAS?.ready===true,null,{timeout:120000});await page.screenshot({path:path.join(out,'public_'+device.name+'.png')});
 const stats=await page.evaluate(()=>({firstFrameMs:window.ATLAS.firstFrameMs,triangles:window.ATLAS.triangles,drawCalls:window.ATLAS.drawCalls,overflow:document.documentElement.scrollWidth>innerWidth}));
 if(errors.length||stats.overflow||assets.some(r=>r.status>=400))throw Error(JSON.stringify({errors,stats,assets}));
 await page.locator('[data-view="pool"]').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'public_'+device.name+'_pool.png')});
 result.results.push({device:device.name,...stats,errors,assets});await context.close();}
 result.success=true;
} catch(e){result.success=false;result.error=String(e);throw e;}finally{fs.writeFileSync(path.join(out,'public_validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(browser)await browser.close();}
