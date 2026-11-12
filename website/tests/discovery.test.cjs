const test=require('node:test'),assert=require('node:assert/strict');
const {outlook,moon}=require('../public/assets/conditions.js');
const {score,distance}=require('../public/assets/search.js');
test('outlook handles missing values and penalizes strong wind and rain',()=>{
 assert.equal(outlook(null,10,0).score,null);
 assert.equal(outlook(0,10,0).score,100);
 assert.equal(outlook(-2,10,0).score,90);
 assert.equal(outlook(2,40,10).score,20);
});
test('moon phase follows the known new-moon epoch and half cycle',()=>{
 const epoch=Date.UTC(2000,0,6,18,14);assert.equal(moon(epoch).name,'New moon');assert.equal(moon(epoch).light,0);
 assert.equal(moon(epoch+29.530588853/2*86400000).name,'Full moon');assert.equal(moon(epoch+29.530588853/2*86400000).light,100);
});
test('search ranks exact titles before fuzzy terms and rejects unrelated tokens',()=>{
 const r={title:'Alaska salmon',place:'Yakutat',water:['Freshwater']};
 assert.ok(score(r,'alaska')>score(r,'alaska'.replace('s','z')));assert.ok(score(r,'salomn')>=0);
 assert.equal(score(r,'unrelated'),-1);assert.ok(score(r,'freshwater')>=0);
 assert.equal(score(r,'alaska unrelated'),-1);
});
test('nearby ranking uses distance across the date line',()=>{
 assert.ok(distance([179.9,0],[-179.9,0])<23);
});
