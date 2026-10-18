'use strict';
/* Executes original test12 assertion bodies twice, once with original waves,
 * once with the new shared field installed. Counts are not unique twice. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=process.env.ATLAS13_ROOT;if(!root)throw Error('Set ATLAS13_ROOT to extracted complete public13 package.');
const original=fs.readFileSync(path.join(root,'source','test12.cjs'),'utf8'),results=[];
for(const refined of [false,true]){let text=original;if(refined){assert.equal(text.split('const Wave=g.Sea12Waves;').length,2);text=text.replace('const Wave=g.Sea12Waves;',`require(${JSON.stringify(path.join(__dirname,'water-refinements.js'))}).installWaves(g.Sea12Waves);const Wave=g.Sea12Waves;`);}let report=null;vm.runInNewContext(text,{require,__dirname:root,console:{log:v=>report=JSON.parse(v)}},{timeout:15000});assert(report?.passed);results.push({refined,report});}
console.log(JSON.stringify({passed:true,scope:'Original 11 assertions run before/after on actual fixed-step model. No rendered gameplay, physical device or sea-trial measurement.',uniqueInheritedAssertions:11,results},null,2));
