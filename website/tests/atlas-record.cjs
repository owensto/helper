/* Record actual browser interactions, then retain two compact 20-second webm clips. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const base=process.env.TEST_ORIGIN||'https://castward.app';
const out=process.env.ATLAS_TEST_OUTPUT||path.resolve(__dirname,'../../runs/castward-atlas');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});
 for(const phone of [false,true]){
  const size=phone?{width:390,height:844}:{width:1280,height:900};
  const ctx=await browser.newContext({viewport:size,isMobile:phone,hasTouch:phone,recordVideo:{dir:out+'/raw',size}});
  const page=await ctx.newPage();await page.goto(base+'/atlas/');
  const reject=page.getByRole('button',{name:'Reject non-essential',exact:true});if(await reject.isVisible())await reject.click();await page.waitForSelector('[data-ready=true]');
  await page.locator('.atlas-map-stage').scrollIntoViewIfNeeded();const started=Date.now();
  await page.waitForTimeout(1100);await page.locator('[data-region=Alaska]').click();await page.waitForTimeout(1400);
  await page.locator('[data-region=Florida]').click();await page.waitForTimeout(1400);
  const marker=page.locator('.atlas-single').first();
  if(await marker.count()){await marker.click();await page.waitForTimeout(1600);await page.locator('.atlas-close').click();}
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.waitForTimeout(600);
  if(phone){
   const cdp=await ctx.newCDPSession(page);const b=await page.locator('.atlas-map').boundingBox();const x=Math.round(b.x+b.width/2),y=Math.round(Math.max(180,Math.min(600,b.y+b.height/2)));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-25,y,id:1},{x:x+25,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-55,y,id:1},{x:x+55,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   const b=await page.locator('.atlas-map').boundingBox();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.55);await page.mouse.down();await page.mouse.move(b.x+b.width*.65,b.y+b.height*.6,{steps:15});await page.mouse.up();
  }
  await page.waitForTimeout(600);await page.locator('[data-reset]').click();await page.waitForTimeout(700);
  if(phone)await page.locator('[data-filter-toggle]').click();
  await page.locator('[name=water]').selectOption('Saltwater');await page.waitForTimeout(650);
  await page.locator('[name=style]').selectOption('inshore-flats');await page.waitForTimeout(650);
  await page.locator('[name=search]').fill('tarpon');await page.waitForTimeout(700);
  if(phone)await page.locator('[data-filter-toggle]').click();
  await page.locator('.atlas-map-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(650);
  await page.locator('[data-clear]').click();await page.locator('[data-region=Norway]').click();await page.waitForTimeout(900);
  await page.locator('[data-region=Australia]').click();await page.waitForTimeout(Math.max(1300,21000-(Date.now()-started)));
  const video=page.video();await ctx.close();const raw=await video.path();
  const name=phone?'atlas-phone-20s.webm':'atlas-desktop-20s.webm';
  // Keep the last 20 seconds, after navigation and consent, to show the map actions.
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',raw],{encoding:'utf8'}).trim());
  execFileSync('ffmpeg',['-y','-ss',String(Math.max(0,duration-20)),'-i',raw,'-t','20','-an','-vf',phone?'fps=20':'fps=20,scale=960:-2','-c:v','libvpx-vp9','-crf','38','-b:v','0',out+'/'+name],{stdio:'ignore'});fs.unlinkSync(raw);
  console.log(name,fs.statSync(out+'/'+name).size+' bytes');
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
