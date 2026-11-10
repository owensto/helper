/* Run with an installed Playwright module: PLAYWRIGHT_MODULE=/path/to/playwright node tests/trip-types-browser.cjs */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const T=require('../src/trip-types.json').types;
const W=require('../src/world.json');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'runs/castward-lingo');
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8766';
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];const checks=[];const overflow=[];
  page.on('pageerror',e=>errors.push(e.message));
  const go=async url=>{await page.goto(base+url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.AtlasEngine);};
  const ok=(value,label)=>{assert.ok(value,label);checks.push(label);};
  try{
    await go('/trip-types/');
    const reject=page.getByRole('button',{name:'Reject non-essential'});if(await reject.isVisible())await reject.click();
    await page.locator('.type-index-image img').evaluate(img=>img.decode());
    await page.screenshot({path:path.join(out,'index-1440.png')});
    await page.locator('#type-search').fill('specks');
    ok(await page.locator('[data-type-card]:visible').count()===1,'Type index resolves local glossary terms');
    await page.locator('#type-search').fill('Texas Slam');
    ok(await page.locator('[data-type-card]:visible').count()===1,'Type index resolves the requested Texas name');
    await go('/trips/');
    // Every name and alias must expose every mapped destination in the site search.
    for(const t of T){
      for(const query of [t.name,...t.aliases]){
        await page.locator('#trip-search').fill(query);
        const matches=await page.locator('#trip-grid [data-trip-card]:not([hidden]) h3 a').evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));
        for(const id of t.profileIds)assert.ok(matches.includes(W.trips.find(p=>p.id===id).canonicalPath),query+' → '+id);
      }
    }
    checks.push('All local names and aliases match their mapped destinations in site search');
    await page.getByRole('button',{name:'Clear filters'}).click();
    for(const t of T){
      await page.locator('#filter-type').selectOption(t.slug);
      assert.equal(await page.locator('#trip-grid [data-trip-card]:not([hidden])').count(),t.profileIds.length,t.slug);
    }
    checks.push('Every trip-type filter returns exactly its mapped destination profiles');
    await go('/trips/?type=lowcountry-inshore-grand-slam');
    ok(await page.locator('#filter-type').inputValue()==='lowcountry-inshore-grand-slam','Type filter hydrates from the hub URL');
    await page.locator('#filter-state').selectOption('South Carolina');
    ok(await page.locator('#trip-grid [data-trip-card]:not([hidden])').count()===2,'Local type combines with state filters');
    await page.getByRole('button',{name:'Clear filters'}).click();
    ok(await page.locator('#trip-grid [data-trip-card]:not([hidden])').count()===24,'Clear filters restores library pagination');
    await go('/trip-types/lowcountry-inshore-grand-slam/');
    await page.locator('.type-landscape img').evaluate(img=>img.decode());
    await page.screenshot({path:path.join(out,'lowcountry-1440.png')});
    ok(await page.locator('video').count()===1,'Matching Charleston reel appears on the Lowcountry hub');
    await page.getByRole('link',{name:'Customize this trip-type preset'}).click();
    await page.waitForSelector('.type-preset-note');
    ok(await page.locator('#plan-trip-type').inputValue()==='lowcountry-inshore-grand-slam','Hub opens the correct named planner preset');
    ok((await page.locator('#inquiry-text').innerText()).includes('Lowcountry Inshore Grand Slam'),'Guide inquiry retains the local trip name');
    ok(await page.locator('[data-gear-status^="type-lowcountry-inshore-grand-slam-"]').count()===6,'Planner shows personal kit and provision questions for the type');
    await page.locator('#gear-status-type-lowcountry-inshore-grand-slam-1').selectOption('provided');
    await page.reload();await page.waitForSelector('.type-preset-note');
    ok(await page.locator('#gear-status-type-lowcountry-inshore-grand-slam-1').inputValue()==='provided','Saved type inventory survives reload');
    const snapshot=await page.evaluate(()=>{
      const p=JSON.parse(localStorage.getItem('fishing-atlas.plan.v1'));
      return btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    });
    await go('/plan/#p='+snapshot);
    ok(await page.locator('#plan-trip-type').inputValue()==='lowcountry-inshore-grand-slam','Shared snapshot retains the local trip type');
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export text'}).click();
    const download=await downloadPromise;const exportFile=path.join(out,'planner-export.txt');await download.saveAs(exportFile);
    ok(fs.readFileSync(exportFile,'utf8').includes('Lowcountry Inshore Grand Slam'),'Offline export retains the local trip name');
    await page.locator('#plan-destination').selectOption('quepos-offshore');await page.getByRole('button',{name:'Update my plan'}).click();
    ok(await page.locator('#plan-trip-type').inputValue()==='','A destination change clears an incompatible type');
    await page.locator('#plan-trip-type').selectOption('costa-rica-fad-marlin');await page.getByRole('button',{name:'Update my plan'}).click();
    ok((await page.locator('#inquiry-text').innerText()).includes('Costa Rica FAD marlin trip'),'A type selected inside the planner reaches its inquiry');
    await go('/glossary/');await page.locator('#glossary-search').fill('albie blitz');
    ok(await page.locator('[data-glossary-term]:visible').count()===1,'Glossary term filter works');
    ok((await page.locator('[data-glossary-term]:visible a').getAttribute('href')).includes('montauk-fall-run'),'Albie blitz links to its supported Montauk type');
    const routes=['/trip-types/','/glossary/',...T.map(t=>'/trip-types/'+t.slug+'/'),'/trips/?type=texas-slam','/plan/?destination=na-us-mn-001&tripType=lake-of-the-woods-sleeper-house'];
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:width===390?844:1000});
      for(const route of routes){
        await go(route);
        const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length}));
        assert.equal(dims.h1,1,route);
        if(dims.scroll>dims.width+1)overflow.push({route,width,scroll:dims.scroll});
      }
      if(width===390){
        await go('/trip-types/');await page.locator('.type-index-image img').evaluate(img=>img.decode());
        await page.screenshot({path:path.join(out,'index-390.png')});
        await page.getByRole('button',{name:'Toggle navigation'}).click();
        ok(await page.locator('#site-nav').getByRole('link',{name:'Trip types',exact:true}).isVisible(),'Mobile navigation exposes Trip types');
        await go('/trip-types/lowcountry-inshore-grand-slam/');await page.screenshot({path:path.join(out,'lowcountry-390.png')});
        await page.locator('#species').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'lowcountry-species-390.png')});
        await go('/glossary/');await page.screenshot({path:path.join(out,'glossary-390.png')});
      }
    }
    ok(overflow.length===0,'No horizontal overflow on every type hub at desktop and phone widths');
    ok(errors.length===0,'No page JavaScript errors');
    const report={passed:true,base,checks,routeViewportChecks:routes.length*2,errors,overflow};
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
