const B=require('../site/physics.js'),P=require('../site/performance.js');
function crossing(tau){const b=new B();b.accelTau=tau;b.engine=true;b.rpm=700;b.gear=1;b.throttle=1;let v0=0;
 for(let i=0;i<20000;i++){b.step(1/600);b.x=0;b.z=0;const v=b.u/P.C.mphToMps;if(v>=30)return i/600+(1/600)*(30-v0)/(v-v0);v0=v;}}
// Calibrate ONE empirical parameter to ONE published endpoint. The full trace is not measured.
let a=1,b=20;for(let i=0;i<55;i++){const t=(a+b)/2;crossing(t)>7.70?b=t:a=t;}
const tau=(a+b)/2;console.log(JSON.stringify({responseTauSeconds:tau,targetSeconds:7.70,fitDt:1/600,fitSeconds:crossing(tau),method:'Single-endpoint fit, not independent validation'},null,2));
