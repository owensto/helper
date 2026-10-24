import { validatePose, validateSourceClock } from '../shared/world.mjs';
const mix=(a,b,t)=>a+(b-a)*t;
export function slerp(a,b,t) {
  let dot=a.reduce((s,n,i)=>s+n*b[i],0),end=[...b];
  if(dot<0){dot=-dot;end=end.map(n=>-n);}
  let q;
  if(dot>.9995) q=a.map((n,i)=>mix(n,end[i],t));
  else {const angle=Math.acos(Math.min(1,dot)),den=Math.sin(angle);
    q=a.map((n,i)=>(n*Math.sin((1-t)*angle)+end[i]*Math.sin(t*angle))/den);}
  const norm=Math.hypot(...q);return q.map(n=>n/norm);
}
/** Rendering only: no extrapolation, velocity integration, collision, or physical authority. */
export class RemoteBuffer {
  constructor({delayMs=150,staleMs=750,maxSamples=32,snapDistanceM=50}={}) {
    if(delayMs<0||staleMs<=delayMs||maxSamples<2)throw new Error('BAD_INTERPOLATION_CONFIG');
    Object.assign(this,{delayMs,staleMs,maxSamples,snapDistanceM});this.peers=new Map();
  }
  ingest(snapshot,selfId) {
    const present=new Set();
    for(const player of snapshot.players) {
      if(player.id===selfId)continue;present.add(player.entityId);
      let peer=this.peers.get(player.entityId);
      if(!peer){peer={samples:[],seq:-2,meta:null};this.peers.set(player.entityId,peer);}
      peer.meta={id:player.id,entityId:player.entityId,vesselId:player.vesselId,name:player.name,connected:player.connected};
      // Repeated roster snapshots must not make an old boat pose look fresh.
      if(player.pose && player.seq>peer.seq) {
        const pose=validatePose(player.pose),clock=validateSourceClock(player.clock??null),last=peer.samples.at(-1);
        if(last && (player.updatedAt<last.at || (last.clock?.epoch!==clock?.epoch) || Math.hypot(...pose.p.map((x,i)=>x-last.pose.p[i]))>this.snapDistanceM))peer.samples=[];
        peer.samples.push({at:player.updatedAt,pose,clock});peer.seq=player.seq;
        if(peer.samples.length>this.maxSamples)peer.samples.splice(0,peer.samples.length-this.maxSamples);
      }
    }
    const removed=[];
    for(const id of this.peers.keys())if(!present.has(id)){this.peers.delete(id);removed.push(id);}
    return removed;
  }
  sample(serverNow,connected=true) {
    const result=[],target=serverNow-this.delayMs;
    for(const peer of this.peers.values()) {
      const points=peer.samples;if(!points.length)continue;
      let a=points[0],b=a;
      for(let i=0;i<points.length;i++){a=points[i];b=points[Math.min(i+1,points.length-1)];if(b.at>=target)break;}
      const t=b.at===a.at?0:Math.max(0,Math.min(1,(target-a.at)/(b.at-a.at)));
      const pose={...a.pose,p:a.pose.p.map((x,i)=>mix(x,b.pose.p[i],t)),q:slerp(a.pose.q,b.pose.q,t)};
      if(t>=1){pose.engine=b.pose.engine;pose.rpm=b.pose.rpm;pose.gear=b.pose.gear;}
      result.push({...peer.meta,pose,stale:!connected||!peer.meta.connected||serverNow-points.at(-1).at>this.staleMs});
    }
    return result;
  }
  clear(){const ids=[...this.peers.keys()];this.peers.clear();return ids;}
}
