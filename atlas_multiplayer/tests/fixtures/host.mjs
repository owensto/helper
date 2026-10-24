/** Linear-motion fixture, not boat physics. Never copy this controller into CORE. */
export class FixtureController {
  constructor(){this.p=[0,0,0];this.q=[0,0,0,1];this.velocity=[0,0];this.elapsed=0;this.epoch=0;}
  step(dt){
    this.elapsed+=dt;this.p[0]+=this.velocity[0]*dt;this.p[2]+=this.velocity[1]*dt;
    this.p[1]=Math.sin(this.elapsed*1.1)*.08;
    if(Math.hypot(...this.velocity)>0){const heading=Math.atan2(this.velocity[1],this.velocity[0]);this.q=[0,Math.sin(-heading/2),0,Math.cos(heading/2)];}
  }
  pose(){const moving=Math.hypot(...this.velocity)>0;return {p:[...this.p],q:[...this.q],engine:moving,rpm:moving?1000:0,gear:moving?1:0};}
  apply(pose){this.epoch++;this.p=[...pose.p];this.q=[...pose.q];this.velocity=[0,0];}
  clock(){return {domain:'client-simulation',epoch:this.epoch,seconds:this.elapsed};}
  snapshot(){return {...this.pose(),elapsed:this.elapsed,velocity:[...this.velocity]};}
}
export function regressionScenario(){
  const c=new FixtureController();for(let i=0;i<600;i++){c.velocity=i<300?[4,1]:[-1,2];c.step(1/60);}return c.snapshot();
}
