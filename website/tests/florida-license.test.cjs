const {test}=require('node:test');const assert=require('node:assert/strict');
const {decide}=require('../public/assets/florida-license.js');
const base={age:'adult',outing:'shore',covered:'yes',period:'3'};
test('shore and rental boats never inherit a charter exemption',()=>{
 for(const outing of ['shore','private']) assert.match(decide({...base,outing}),/personal nonresident saltwater license: \$17/);
});
test('unknown charter coverage does not assert exemption',()=>{
 assert.match(decide({...base,outing:'charter',covered:'unknown'}),/Coverage is not confirmed/);
 assert.match(decide({...base,outing:'charter'}),/for this outing/);
});
test('children and freshwater do not receive an adult saltwater price',()=>{
 assert.doesNotMatch(decide({...base,age:'child'}),/\$17/);
 assert.match(decide({...base,outing:'fresh'}),/freshwater license/);
 assert.doesNotMatch(decide({...base,outing:'fresh'}),/\$17/);
});
