import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const site=path.resolve(process.env.SITE_DIR||'/tmp/atlas-d/site');
const out=path.resolve(process.env.REVIEW_DIR||'/tmp/atlas-d/review');await mkdir(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.glb':'model/gltf-binary','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const p=path.resolve(site,'.'+(name==='/'?'/index.html':name));if(!p.startsWith(site+path.sep))throw Error('path');const data=await readFile(p);res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(data);}catch(e){res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(8765,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const [name,width,height] of [['desktop',1600,1000],['phone',430,932]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>failed.push(r.url()));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle',timeout:90000});
  await page.waitForFunction(()=>window.ATLAS_D?.ready,{},{timeout:90000});await page.waitForTimeout(1800);
  const initial=await page.evaluate(()=>({state:ATLAS_D.state,firstFrameMs:ATLAS_D.firstFrameMs,visible:ATLAS_D.visibleMeshes,triangles:ATLAS_D.renderer.info.render.triangles,calls:ATLAS_D.renderer.info.render.calls,report:ATLAS_D.report}));
  assert.equal(initial.state,'surface');assert.ok(initial.visible>15);assert.ok(initial.triangles>40000);assert.ok(initial.report.source_meshes>1000);
  await page.screenshot({path:path.join(out,name+'_surface.png')});
  await page.locator('[data-view="profile"]').click();await page.waitForTimeout(700);await page.screenshot({path:path.join(out,name+'_profile.png')});
  await page.locator('[data-mode="submerged"]').click();await page.waitForFunction(()=>ATLAS_D.state==='submerged'&&!ATLAS_D.transitioning,{},{timeout:20000});await page.waitForTimeout(700);
  assert.ok(await page.evaluate(()=>ATLAS_D.visibleMeshes>5));await page.screenshot({path:path.join(out,name+'_submerged.png')});
  await page.locator('[data-mode="cutaway"]').click();await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>ATLAS_D.state),'cutaway');await page.screenshot({path:path.join(out,name+'_cutaway.png')});
  await page.locator('[data-system="I_Energy"]').click();await page.waitForTimeout(500);
  await page.locator('[data-mode="surface"]').click();await page.locator('[data-view="stern"]').click();await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,name+'_stern.png')});
  await page.locator('[data-view="fleet"]').click();await page.waitForTimeout(700);await page.screenshot({path:path.join(out,name+'_tenders.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);results.push({viewport:name,width,height,...initial,errors,failedRequests:failed,passed:true});await page.close();
 }
 await writeFile(path.join(out,'browser_validation.json'),JSON.stringify({passed:true,tests:results,physicalIPhoneTest:false},null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server.close();}
