const B=require('../site/physics.js'),assert=require('assert'),fs=require('fs');const tests=[];
function run(n,f){f();tests.push({name:n,passed:true});}
const step=(b,t)=>{for(let i=0;i<Math.round(t*60);i++)b.step(1/60)};
run('engine-off calm water does not accelerate',()=>{let b=new B();step(b,20);assert(Math.abs(b.x+8)<1e-9&&Math.abs(b.z)<1e-9)});
run('startup interlock',()=>{let b=new B();b.gear=1;assert(!b.start());b.gear=0;assert(b.start());assert(b.startTimer>0);step(b,3);assert(b.rpm>600)});
run('forward thrust and helm turning',()=>{let b=new B();b.engine=true;b.gear=1;b.throttle=.55;step(b,8);assert(b.u>4&&b.x>0);b.steer=.7;step(b,5);assert(b.heading>.1&&Math.abs(b.v)>.1)});
run('neutral coasts rather than brakes',()=>{let b=new B();b.engine=true;b.gear=1;b.throttle=.6;step(b,8);const v=b.u,x=b.x;b.neutral();b.step(1/60);assert(b.u>v*.98);step(b,6);assert(b.u<v&&b.x>x+6)});
run('reverse steering reverses yaw response',()=>{let b=new B();b.engine=true;b.gear=-1;b.throttle=.45;b.steer=.6;step(b,8);assert(b.u<-.8&&b.heading<-.07)});
run('neutral current drift and through-water speed',()=>{let b=new B();b.setEnvironment('breeze');step(b,20);assert(b.z>2&&b.speedOverGround>.15);assert(Math.abs(b.u)<.25)});
run('trim influences simulated bow attitude',()=>{let a=new B(),b=new B();for(const x of [a,b]){x.engine=true;x.gear=1;x.throttle=.7;}a.trim=.1;b.trim=.6;step(a,14);step(b,14);assert(b.pitch>a.pitch+.012)});
run('shared wave samples are finite',()=>{for(let t=0;t<100;t+=.5)assert(Number.isFinite(B.surface(t,t*.5,t,'chop')))});
run('conservative dock contact response',()=>{let b=new B();b.heading=-Math.PI/2;b.engine=true;b.gear=1;b.throttle=.4;let hit=false;for(let i=0;i<900;i++){b.step(1/60,[{x0:-27,x1:22,z0:-9.7,z1:-6}]);hit=hit||b.contact;}assert(hit&&b.z>-6)});
run('fine-step convergence',()=>{let a=new B(),b=new B();for(const x of[a,b]){x.engine=true;x.gear=1;x.throttle=.4;x.steer=.2;}step(a,10);for(let i=0;i<1200;i++)b.step(1/120);assert(Math.hypot(a.x-b.x,a.z-b.z)<.3)});
run('reset preserves requested conditions but clears helm',()=>{let b=new B();b.setEnvironment('chop');b.gear=1;b.throttle=1;b.trim=1;b.reset();assert(b.environment==='chop'&&!b.engine&&b.gear===0&&b.trim===.18)});
console.log(JSON.stringify({passed:true,physics_calibrated:false,tests},null,2));
