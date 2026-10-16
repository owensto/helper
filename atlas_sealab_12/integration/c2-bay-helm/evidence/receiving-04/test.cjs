'use strict';
// One bounded offline receiving test suite. No rig, browser, host loop or baseline audit.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),cp=require('node:child_process');
const K=require('./geometry-contract.cjs'),C=require('./contract.json');
const out=process.env.CLOSURE_OUT||path.join(__dirname,'../derived');
const E=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(out,'frozen-export.json.gz'))));
const checks=[];let failed=0;
function test(name,fn){try{fn();checks.push({name,passed:true});}catch(e){failed++;checks.push({name,passed:false,error:e.stack});}}
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const point=(t,g=0)=>[-(.016+g),.165*Math.sin(t),.165*Math.cos(t)];
const grip=(p,hand='left',arcId='port')=>K.gripPoint(p,{arcId,hand,bodySurface:'palm'});
const p3=(a,i)=>a.slice(i*3,i*3+3),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function guardCheck(matrix){
 const tri=[[0,0,0],[1,0,0],[.25,0,1]],g=K.vesselTriangleGuard(tri,matrix);let volume=0;const edges=new Map();
 for(let i=0;i<g.indices.length;i+=3){const f=g.indices.slice(i,i+3);volume+=dot(p3(g.positions,f[0]),cross(p3(g.positions,f[1]),p3(g.positions,f[2])))/6;for(let k=0;k<3;k++){const a=f[k],b=f[(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');const old=edges.get(key)||[0,0];old[0]++;old[1]+=a<b?1:-1;edges.set(key,old);}}
 assert(volume>0);for(const [n,w]of edges.values()){assert.equal(n,2);assert.equal(w,0);}
 for(let i=0;i<3;i++){const a=p3(g.positions,i),b=p3(g.positions,i+3),center=g.sourceTriangleVessel[i];assert(Math.abs(dot(sub(b,a),g.unitNormalVessel)-.004)<1e-12);assert(Math.abs(dot(sub(b,center),g.unitNormalVessel)-.002)<1e-12);assert(Math.abs(dot(sub(a,center),g.unitNormalVessel)+.002)<1e-12);}
 return g;
}
test('coordinator branch-cut example is port/left member, not literal interval',()=>{const p=[-.016,-.0164725137467,-.1641756872709];assert(Math.atan2(p[1],p[2])<0);assert(grip(p).pointEligible);assert(!grip(p,'right','port').pointEligible);});
test('port arc on both sides of atan2 branch cut',()=>{for(const t of [Math.PI-.1,Math.PI+.1,-Math.PI+.1,-Math.PI-.1,Math.PI,-Math.PI])assert(K.arcMembership(t,'port','left').inside);});
test('four exact closed arc endpoints',()=>{for(const center of [0,Math.PI])for(const sign of [-1,1]){const a=K.arcMembership(center+sign*.25,center===0?'starboard':'port',center===0?'right':'left');assert(a.inside&&a.atNumericalEndpoint);}});
test('explicit angular roundoff band and outside rejection',()=>{assert(K.arcMembership(.25+5e-13,'starboard','right').inside);assert(!K.arcMembership(.25+2e-12,'starboard','right').inside);});
test('wrapped periodic equivalents',()=>{for(let k=-4;k<=4;k++)assert(K.arcMembership(Math.PI+.1+2*Math.PI*k,'port','left').inside);});
test('center and nonmember angular cases',()=>{assert(K.arcMembership(0,'starboard','right').inside);assert(!K.arcMembership(Math.PI/2,'port','left').inside);assert(!K.arcMembership(Math.PI/2,'starboard','right').inside);});
test('anatomical assignments not camera names',()=>{assert(grip(point(0),'right','starboard').pointEligible);assert(!grip(point(0),'left','starboard').pointEligible);assert(!grip(point(Math.PI),'right','port').pointEligible);});
test('positive gap explicit 2mm bound',()=>{assert(grip(point(Math.PI,.0019)).pointEligible);assert(!grip(point(Math.PI,.0021)).pointEligible);});
test('negative compression retains 1mm limit',()=>{assert(grip(point(Math.PI,-.0009)).pointEligible);assert(!grip(point(Math.PI,-.0011)).pointEligible);});
test('contact gap is analytic torus distance and unit normal',()=>{const q=grip(point(Math.PI+.12,.001));assert(Math.abs(q.normalGapM-.001)<1e-14);assert(Math.abs(Math.hypot(...q.normal)-1)<1e-14);const s=q.analyticSurfacePoint;assert(Math.abs(s[0]**2+(Math.hypot(s[1],s[2])-.165)**2-.016**2)<1e-16);assert.equal(q.wholeElementAccepted,false);});
test('complete tube circumference remains bounded to assigned arc',()=>{for(const phi of [0,.5,1.5,3,4,5]){const x=.016*Math.cos(phi),rho=.165+.016*Math.sin(phi);assert(grip([x,0,-rho]).pointEligible);}});
test('nonfinite, sparse and nonanatomical inputs reject',()=>{for(const p of [[NaN,0,1],[0,Infinity,1],new Array(3)])assert.throws(()=>grip(p));assert.throws(()=>K.arcMembership(0,'port','camera-left'));assert.throws(()=>K.gripPoint(point(0),{hand:'right',arcId:'starboard',bodySurface:'forearm'}));});
test('ambiguous torus axis/centerline projection rejects',()=>{assert.throws(()=>grip([.016,0,0]));assert.throws(()=>grip([0,0,-.165]));});
test('no automatic choreography/full range/profile',()=>{assert.equal(C.grips.materialLocked,false);assert.equal(C.grips.automaticRegripOrFullRangeSupport,false);assert.equal(C.grips.choreography,null);assert.equal(C.acceptance.humanFitAuthorized,false);});
test('back optional; seat plus both soles mandatory',()=>{assert.equal(E.supportSurfaces.find(s=>s.id==='back').mandatoryLoadSupport,false);assert.deepEqual(E.supportSurfaces.filter(s=>s.mandatoryLoadSupport).map(s=>s.id),['seat','leftFoot','rightFoot']);});
test('original flat bounds and compression limits remain',()=>{for(const s of E.supportSurfaces){assert.deepEqual(s.normalIntervalM,{seat:[-.003,.005],back:[-.002,.01],leftFoot:[0,.005],rightFoot:[0,.005]}[s.id]);}});
test('all retained interior face sets explicitly unknown, not empty',()=>{assert.equal(E.survivingOriginalSources.length,130);for(const s of E.survivingOriginalSources){assert.equal(s.interiors.status,'UNKNOWN_UNCLASSIFIED');assert.equal(s.interiors.closedComponentFaceSets,null);assert(s.collisionParticipation&&s.interiors.noPositiveVolumeClearance);}assert(C.retainedInteriors.unknownIsNotEmpty);});
test('source/prism identity guard closure and thickness',()=>guardCheck(I));
test('uniform source scale does not scale guard thickness',()=>guardCheck([5,0,0,0,0,5,0,0,0,0,5,0,1,2,3,1]));
test('nonuniform source scale produces 4mm in vessel metres',()=>guardCheck([.2,0,0,0,0,8,0,0,0,0,3,0,1,2,3,1]));
test('rotated source produces symmetric metre-normal guards',()=>guardCheck([1,0,0,0,0,0,1,0,0,-1,0,0,1,2,3,1]));
test('sheared source normal is recomputed after transform',()=>guardCheck([1,.2,.3,0,.4,2,.1,0,.6,.5,3,0,1,2,3,1]));
test('reflected source remains closed positive oriented guard',()=>guardCheck([-1,0,0,0,0,1,0,0,0,0,1,0,1,2,3,1]));
test('source-space extrusion would be wrong under scale',()=>{const m=[1,0,0,0,0,8,0,0,0,0,1,0,0,0,0,1];const naive=Math.abs(K.transform([0,.002,0],m)[1]-K.transform([0,-.002,0],m)[1]);assert.equal(naive,.032);const q=guardCheck(m);assert.equal(q.totalThicknessM,.004);});
test('degenerate/singular/nonaffine/malformed guards reject',()=>{assert.throws(()=>K.vesselTriangleGuard([[0,0,0],[0,0,0],[1,0,0]],I));const m=I.slice();m[0]=0;assert.throws(()=>guardCheck(m));m[0]=1;m[3]=.01;assert.throws(()=>guardCheck(m));assert.throws(()=>K.vesselTriangleGuard([,,],I));});
test('ordinary separation uses guard boundary not midplane',()=>{assert.equal(C.guard.ordinarySeparationM,.002);assert.equal(C.guard.halfThicknessM+.002,.004);assert.equal(C.guard.ordinaryPenetrationM,0);});
test('frozen authority fields cannot masquerade as live stamps',()=>{for(const k of ['hostFrameId','hostSeconds','simulationEpoch','activationEpoch','runtimeScope','vesselInstance','humanInstance'])assert.equal(E.snapshotContext[k],null);assert.equal(E.snapshotContext.mode,'FROZEN_DESIGN');assert.equal(E.snapshotContext.consumedDtSeconds,0);assert.equal(E.snapshotContext.liveBindingAvailable,false);assert(E.historicalEvidence.every(h=>h.currentFrameAuthority===false));});
test('zero control pose includes both foot hinges and world identity',()=>{assert.deepEqual(E.frozenState.footHingeAnglesZRad,[0,0]);assert.equal(E.frozenState.wheelAngleXRad,0);assert.equal(E.frozenState.throttleAngleZRad,0);assert.deepEqual(E.frozenState.vesselToFrozenWorld,I);});
test('complete immutable geometry and contact hashes',()=>{const sh=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(sh(fs.readFileSync(path.join(__dirname,'contract.json'))),E.receivingContractSHA256);assert.equal(sh(fs.readFileSync(path.join(__dirname,'geometry-contract.cjs'))),E.geometryContractCodeSHA256);assert.equal(E.bindings.reviewedCandidateManifestSHA256,'56481a7c21bf13e119b2b7fb9da86a5b52eade4b5142bd3d8c2d3e63c272a16e');assert.equal(E.bindings.inputRecordSHA256['geometry/source-ledger.json'],'b7062ef558793742a30b6c8b88bd8383a54c8de1c7d598559785203009f1e09c');});
test('complete original/new/support transform coverage',()=>{assert.equal(new Set(E.survivingOriginalSources.map(s=>s.id)).size,130);assert.equal(new Set(E.newParts.map(s=>s.id)).size,25);assert.equal(E.supportSurfaces.length,4);for(const p of E.newParts)K.affine(p.partToVessel);for(const s of E.survivingOriginalSources)K.affine(s.sourceToVessel);for(const s of E.supportSurfaces)K.affine(s.contactToVessel);});
test('frozen whole domain cannot pass from guards or optional back alone',()=>{assert.equal(C.retainedInteriors.positiveVolumeClearanceAvailable,false);assert.equal(E.acceptance.fullBody,false);assert.equal(E.acceptance.gameplay,false);assert.equal(E.acceptance.liveCoupling,false);assert.equal(E.geometryChanged,false);});
test('normal interval endpoints inclusive without increasing bounds',()=>{assert(K.normalGapClassification(-.001).inside);assert(K.normalGapClassification(.002).inside);});
test('outside roundoff cannot silently widen compression/gap',()=>{for(const g of [-.001-1e-10,.002+1e-10]){const q=K.normalGapClassification(g);assert(!q.inside);assert.equal(q.status,'NUMERIC_OUTSIDE_UNAVAILABLE');}});
test('nonfinite scalar gaps reject',()=>{assert.throws(()=>K.normalGapClassification(NaN));assert.throws(()=>K.normalGapClassification(Infinity));});
test('arc hand eligibility remains separate from angle membership',()=>{const q=K.arcMembership(Math.PI,'port','right');assert(q.inside&&!q.eligible);});
test('wrong arc rejects geometrically even for its assigned hand',()=>{assert(!grip(point(0),'left','port').pointEligible);assert(!grip(point(Math.PI),'right','starboard').pointEligible);});
test('fixed grip frame round trip uses one inverse',()=>{const m=E.gripFrame.partToVessel,mi=E.gripFrame.vesselToPart,p=point(Math.PI+.1),w=K.transform(p,m),back=K.transform(w,mi);assert(back.every((x,i)=>Math.abs(x-p[i])<1e-14));assert(grip(back).pointEligible);});
test('retained face coverage not dropped when interiors unknown',()=>{let faces=0;for(const s of E.survivingOriginalSources)for(const [a,b]of s.sourceFaceRangesInclusive){assert(a>=0&&b<s.originalTriangleCount&&a<=b);faces+=b-a+1;}assert.equal(faces,356774);});
test('original model/rig bytes are not transferred in metadata',()=>{assert.equal(E.originalGeometryArraysIncluded,false);assert.equal(E.rigOrAnimationAssetsIncluded,false);for(const s of E.survivingOriginalSources){assert.equal(s.positions,undefined);assert.equal(s.indices,undefined);}});
const report={revision:'station03-receiving-contract-tests/1',passed:failed===0,passedCount:checks.length-failed,failedCount:failed,checks,scope:'Offline receiving math/metadata only; no full-body fit, live host or baseline audit'};
fs.writeFileSync(path.join(out,'contract-tests.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));process.exitCode=failed?1:0;
