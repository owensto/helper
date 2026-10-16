'use strict';
// Pure receiving definitions. Not installed in the host, not a hand/IK/clearance solver.
const C = require('./contract.json');
function vector(a, n) {
  if (!Array.isArray(a) || a.length !== n) throw Error('FINITE_DENSE_VECTOR_REQUIRED');
  for (let i=0;i<n;i++) if (!Object.hasOwn(a,i) || !Number.isFinite(a[i])) throw Error('FINITE_DENSE_VECTOR_REQUIRED');
  return a;
}
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function affine(m) {
  vector(m,16);
  if(m[3]!==0||m[7]!==0||m[11]!==0||m[15]!==1) throw Error('AFFINE_METRE_TRANSFORM_REQUIRED');
  const d=dot(m.slice(0,3),cross(m.slice(4,7),m.slice(8,11)));
  if(!Number.isFinite(d)||Math.abs(d)<1e-15) throw Error('NON_SINGULAR_TRANSFORM_REQUIRED');
  return m;
}
function transform(p,m) {
  vector(p,3);affine(m);
  const q=[0,1,2].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);
  vector(q,3);return q;
}
function wrapped(theta, center) {
  if(!Number.isFinite(theta)||!Number.isFinite(center)) throw Error('FINITE_ANGLE_REQUIRED');
  return Math.atan2(Math.sin(theta-center),Math.cos(theta-center));
}
function arcMembership(theta, arcId, hand) {
  const arc=C.grips.arcs.find(a=>a.id===arcId);
  if(!arc) throw Error('UNKNOWN_ARC');
  if(!['left','right'].includes(hand)) throw Error('ANATOMICAL_HAND_REQUIRED');
  const delta=wrapped(theta,arc.centerRad), a=Math.abs(delta), limit=C.grips.halfWidthRad;
  return {eligible:hand===arc.eligibleHand,inside:a<=limit+C.grips.endpointRoundoffRad,
    wrappedDifference:delta,atNumericalEndpoint:Math.abs(a-limit)<=C.grips.endpointRoundoffRad};
}
function normalGapClassification(gap) {
  if(!Number.isFinite(gap)) throw Error('FINITE_NORMAL_GAP_REQUIRED');
  const [lo,hi]=C.grips.signedNormalGapM,inside=gap>=lo&&gap<=hi;
  const near=Math.min(Math.abs(gap-lo),Math.abs(gap-hi))<=C.guard.numericToleranceM;
  return {inside,nearNumericalBoundary:near,status:inside?'WITHIN_CLOSED_INTERVAL':near?'NUMERIC_OUTSIDE_UNAVAILABLE':'OUTSIDE'};
}
function gripPoint(pointWheelLocal, {arcId,hand,bodySurface}) {
  const p=vector(pointWheelLocal,3);
  if(!C.grips.eligibleBodySurface.includes(bodySurface)) throw Error('PALM_OR_FINGERS_ONLY');
  const R=C.grips.majorRadiusM,r=C.grips.tubeRadiusM,rho=Math.hypot(p[1],p[2]);
  if(rho===0) throw Error('NON_UNIQUE_TORUS_PROJECTION');
  const center=[0,R*p[1]/rho,R*p[2]/rho], d=sub(p,center),len=Math.hypot(...d);
  if(len===0) throw Error('NON_UNIQUE_TORUS_NORMAL');
  const a=arcMembership(Math.atan2(p[1],p[2]),arcId,hand), gap=len-r;
  const normal=d.map(v=>v/len),surface=center.map((v,i)=>v+r*normal[i]);
  const nc=normalGapClassification(gap);
  return {pointEligible:a.eligible&&a.inside&&nc.inside,arc:a,normalGapM:gap,normalGapClassification:nc,
    analyticSurfacePoint:surface,normal,wholeElementAccepted:false,fullBodyAccepted:false};
}
function vesselTriangleGuard(tri, sourceToVessel) {
  if(!Array.isArray(tri)||tri.length!==3) throw Error('TRIANGLE_REQUIRED');
  for(let i=0;i<3;i++)if(!Object.hasOwn(tri,i))throw Error('DENSE_TRIANGLE_REQUIRED');
  const p=tri.map(v=>transform(v,sourceToVessel)), c=cross(sub(p[1],p[0]),sub(p[2],p[0])),len=Math.hypot(...c);
  if(!Number.isFinite(len)||len<=1e-15)throw Error('DEGENERATE_GUARD_UNAVAILABLE');
  const n=c.map(v=>v/len),h=C.guard.halfThicknessM;
  const v=[...p.map(q=>q.map((x,i)=>x-h*n[i])),...p.map(q=>q.map((x,i)=>x+h*n[i]))];
  return {positions:v.flat(),indices:[0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5],
    unitNormalVessel:n,sourceTriangleVessel:p,totalThicknessM:2*h,frame:'vessel metres',
    ordinarySeparationM:C.guard.ordinarySeparationM,interiorClearanceAccepted:false};
}
module.exports=Object.freeze({wrapped,arcMembership,normalGapClassification,gripPoint,vesselTriangleGuard,transform,affine});
