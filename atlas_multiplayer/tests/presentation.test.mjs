import test from 'node:test';
import assert from 'node:assert/strict';
import {controlState} from '../client/invite-controls.mjs';
const state=(patch={})=>({state:'idle',error:null,players:0,rttMs:null,cleanupIncomplete:false,...patch});
test('cleanup failure cannot be presented as restored single-player or offer unsafe rejoin',()=>{
 const p=controlState(state({state:'error',error:'HOST_EXIT_FAILED',cleanupIncomplete:true}));
 assert.match(p.statusMessage,/cleanup incomplete/);assert.ok(!p.statusMessage.includes('single-player available'));
 assert.equal(p.joinDisabled,true);assert.equal(p.copyDisabled,true);assert.match(p.errorMessage,/could not be cleared/);
});
test('incomplete cleanup takes precedence over an inconsistent connected flag',()=>{
 const p=controlState(state({state:'connected',cleanupIncomplete:true}));
 assert.ok(p.statusMessage.startsWith('Offline'));assert.equal(p.copyDisabled,true);assert.equal(p.joinDisabled,true);
});
test('ordinary connected and reconnecting states have truthful distinct controls',()=>{
 const live=controlState(state({state:'connected',players:2,rttMs:42}));
 assert.equal(live.statusMessage,'Connected · 2 boats · 42 ms');assert.equal(live.copyDisabled,false);assert.equal(live.leaveDisabled,false);
 const lost=controlState(state({state:'reconnecting'}));assert.match(lost.statusMessage,/Connection lost/);
 assert.equal(lost.copyDisabled,true);assert.equal(lost.leaveDisabled,false);assert.equal(lost.joinDisabled,true);
});
test('unknown errors do not leak host messages and clean idle restores room controls',()=>{
 const bad=controlState(state({state:'error',error:'PRIVATE_HOST_SECRET'}));assert.ok(!JSON.stringify(bad).includes('PRIVATE_HOST_SECRET'));
 const clean=controlState(state());assert.equal(clean.joinDisabled,false);assert.equal(clean.errorMessage,'');assert.equal(clean.statusMessage,'Single-player');
});
