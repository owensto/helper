const assert=require('node:assert/strict');
const state=p=>p.locator('[data-fishing-game]').getAttribute('data-state');
async function observe(page){
 await page.evaluate(()=>{if(window.__observesWater)return;window.__observesWater=true;Object.defineProperty(window,'__water',{configurable:true,get:()=>CastwardPlay.snapshot()});});
}
async function cast(page){await page.locator('.game-scene').scrollIntoViewIfNeeded();await page.locator('#game-action').focus();await page.keyboard.press('Enter');assert.equal(await state(page),'aim');await page.clock.runFor(350);await page.keyboard.press('Space');assert.equal(await state(page),'wait');}
async function bite(page){for(let i=0;i<80&&await state(page)==='wait';i++){await page.keyboard.press('Space');await page.clock.runFor(180);}assert.equal(await state(page),'bite');}
async function fight(page){
 await observe(page);await page.locator('#fishing-canvas').focus();let held=false;
 for(let i=0;i<650&&await state(page)==='reel';i++){
  const w=await page.evaluate(()=>window.__water);if(!w){await page.clock.runFor(20);continue;}
  if(w.jump>0&&!w.bowed)await page.keyboard.press('b');
  const direction=w.run>0?'ArrowLeft':'ArrowRight';await page.keyboard.up(direction==='ArrowLeft'?'ArrowRight':'ArrowLeft');await page.keyboard.down(direction);
  if(w.tension>.65&&held){await page.keyboard.up('Space');held=false;}else if(w.tension<.3&&!held){await page.keyboard.down('Space');held=true;}
  await page.clock.runFor(100);
 }
 await page.keyboard.up('Space');await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');assert.equal(await state(page),'net');await page.keyboard.press('n');await page.clock.runFor(30);assert.equal(await state(page),'caught');
}
async function land(page){await cast(page);await bite(page);await page.keyboard.press('Enter');assert.equal(await state(page),'reel');await fight(page);}
module.exports={state,observe,cast,bite,fight,land};
