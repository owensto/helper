const assert=require('assert'),World=require('./site/world09.js'),Motion=require('./site/command-motion.js');
function state(){const s=new Motion();s.configure({physics:'seamanship',location:'basin',conditions:'breeze'});s.setEnvironment('breeze');s.x=-140;s.z=-300;return s;}
function run(s,n){for(let i=0;i<n*60;i++){s.step(1/60,[]);for(const k of ['x','z','vx','vz','heave','pitch','roll'])assert(Number.isFinite(s[k]),k+' is nonfinite');}return s;}
const reports=[];
let s=state();s.start();run(s,2);s.gear=1;s.throttle=1;run(s,30);const before=s.speedOverGround;s.gear=-1;const oldX=s.x;run(s,20);reports.push({test:'forward_to_reverse',forwardKnots:before*3600/1852,endingU:s.u,positionDelta:s.x-oldX,passed:s.u<0});assert(s.u<0);
s=state();s.x=0;s.z=-40;s.heading=0;s.setEnvironment('calm');s.start();run(s,2);s.gear=1;s.throttle=.6;run(s,45);reports.push({test:'sandbar_contact',hits:s.bottomHitCount,clearance:s.bottomClearance,x:s.x,z:s.z,speed:s.speedOverGround,part:s.bottomPart,passed:s.bottomHitCount>0});assert(s.bottomHitCount>0);
const atHit=s.x;s.gear=-1;s.throttle=.6;run(s,25);reports.push({test:'back_off_sandbar',delta:s.x-atHit,passed:s.x<atHit-5});assert(s.x<atHit-5);
s=state();let range=[Infinity,-Infinity],roll=[Infinity,-Infinity];for(let i=0;i<2400;i++){run(s,1/60);range=[Math.min(range[0],s.heave),Math.max(range[1],s.heave)];roll=[Math.min(roll[0],s.roll),Math.max(roll[1],s.roll)];}reports.push({test:'rest_bobbing',heaveRange:range[1]-range[0],rollRange:roll[1]-roll[0],passed:range[1]-range[0]>.12&&range[1]-range[0]<1});assert(reports.at(-1).passed);
reports.push({test:'depth_shared',sandbar:World.sample(85,-40),deep:World.sample(-8,0),passed:World.sample(85,-40).depth<.2&&World.sample(-8,0).depth>4});assert(reports.at(-1).passed);
console.log(JSON.stringify({passed:true,physicsValidated:false,tests:reports},null,2));
