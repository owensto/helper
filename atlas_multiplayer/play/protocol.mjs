/** Eight-captain browser rooms. Host owns membership, never another boat's physics. */
import {WORLD,VESSEL_ID} from '../standalone/world.mjs';
import {validatePose,validateSourceClock} from '../shared/world.mjs';
export const VERSION='atlas-browser-room-2';
export const LIMIT=8, RESUME_MS=30000;
export const COLORS=Object.freeze(['#ffd18b','#67d9e8','#f38ca7','#b4a2ff','#a5df88','#f3ab70','#8bb5ff','#e8dced']);
const ID=/^ow-[a-f0-9]{32}$/, KEY=/^[a-f0-9]{48}$/;
export const randomId=()=> 'ow-'+crypto.randomUUID().replaceAll('-','');
export const secret=()=>[...crypto.getRandomValues(new Uint8Array(24))].map(x=>x.toString(16).padStart(2,'0')).join('');
export function nameOf(value){if(typeof value!=='string'||!value.trim()||[...value].length>24||/[<>\x00-\x1f\x7f]/.test(value))throw Error('BAD_NAME');return value.trim().normalize('NFC');}
export function parseMessage(raw,max=16384){if(typeof raw!=='string'||raw.length>max)throw Error('BAD_MESSAGE');const v=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v)||v.v!==VERSION)throw Error('VERSION_MISMATCH');return v;}
export function inviteURL(base,room,key){if(!ID.test(room)||!KEY.test(key))throw Error('BAD_INVITE');const u=new URL('multiplayer.html',base);u.search='';u.hash=new URLSearchParams({v:'2',room,key}).toString();return u.href;}
export function parseInvite(value,base){const u=new URL(value,base),q=new URLSearchParams(u.hash.slice(1)),room=q.get('room'),key=q.get('key');if(q.get('v')!=='2'||!ID.test(room||'')||!KEY.test(key||''))throw Error('BAD_INVITE');return {room,key};}
export function sampleOf(value){
  if(!value||value.vesselId!==VESSEL_ID)throw Error('VESSEL_MISMATCH');
  const pose=validatePose(value.pose),clock=validateSourceClock(value.clock);
  if(!clock||Math.hypot(pose.p[0],pose.p[2])>WORLD.bounds.radiusM+1)throw Error('BAD_POSE');return {pose,clock};
}
function follows(a,b){if(a&&(b.epoch<a.epoch||(b.epoch===a.epoch&&b.seconds<a.seconds)))throw Error('CLOCK_REGRESSION');}
export class HostRoom {
  constructor({id,key,name,now=()=>performance.now()}){
    if(!ID.test(id)||!KEY.test(key))throw Error('BAD_ID');Object.assign(this,{id,key,now,serial:0});this.players=new Map();this.players.set(id,this.player(id,name,0,null));
  }
  player(id,name,slot,resumeKey){return {id,entityId:id,vesselId:VESSEL_ID,name:nameOf(name),slot,connected:true,visible:true,seq:-1,pose:null,clock:null,updatedAt:null,resumeKey,disconnectedAt:null,windowAt:this.now(),messages:0};}
  add(id,h){
    if(!ID.test(id)||id===this.id)throw Error('IDENTITY_CONFLICT');
    if(!h||h.type!=='hello'||h.v!==VERSION||h.key!==this.key||h.world!==WORLD.worldRevision||!KEY.test(h.resumeKey||''))throw Error('INVITE_REJECTED');
    const name=nameOf(h.name);this.sweep();let p=this.players.get(id),resumed=false;
    if(p){if(p.resumeKey!==h.resumeKey)throw Error('SESSION_EXPIRED');if(p.connected)throw Error('SESSION_ACTIVE');p.connected=true;p.disconnectedAt=null;resumed=true;}
    else{
      // A lost reservation may not silently create a second membership from a resume attempt.
      if(h.resume===true)throw Error('SESSION_EXPIRED');if(this.players.size>=LIMIT)throw Error('ROOM_FULL');
      const used=new Set([...this.players.values()].map(p=>p.slot)),slots=WORLD.vessels[VESSEL_ID].spawns;
      const slot=slots.findIndex((s,i)=>!used.has(i)&&[...this.players.values()].every(p=>!p.pose||Math.hypot(s.p[0]-p.pose.p[0],s.p[2]-p.pose.p[2])>=14));
      if(slot<0)throw Error('SPAWN_OCCUPIED');p=this.player(id,name,slot,h.resumeKey);this.players.set(id,p);
    }
    return {v:VERSION,type:'welcome',id,host:this.id,slot:p.slot,world:WORLD.worldRevision,resumed,nextSequence:p.seq+1,graceMs:RESUME_MS,spawn:structuredClone(WORLD.vessels[VESSEL_ID].spawns[p.slot])};
  }
  update(id,m){
    const p=this.players.get(id);if(!p?.connected)throw Error('NOT_JOINED');
    if(this.now()-p.windowAt>=1000){p.windowAt=this.now();p.messages=0;}if(++p.messages>35)throw Error('RATE_LIMIT');
    if(m.type!=='state'||m.v!==VERSION||!Number.isSafeInteger(m.seq)||m.seq<0||Object.keys(m).some(k=>!['v','type','seq','sample','visible'].includes(k))||(m.visible!==undefined&&typeof m.visible!=='boolean'))throw Error('BAD_STATE');
    if(m.seq<=p.seq)return false;const {pose,clock}=sampleOf(m.sample);follows(p.clock,clock);
    Object.assign(p,{pose,clock,seq:m.seq,updatedAt:this.now(),visible:m.visible!==false});return true;
  }
  disconnect(id){const p=this.players.get(id);if(p&&id!==this.id&&p.connected){p.connected=false;p.disconnectedAt=this.now();}}
  remove(id){if(id!==this.id)this.players.delete(id);}
  sweep(){for(const [id,p] of this.players)if(!p.connected&&this.now()-p.disconnectedAt>=RESUME_MS)this.players.delete(id);}
  snapshot(){this.sweep();return {v:VERSION,type:'snapshot',world:WORLD.worldRevision,host:this.id,serial:++this.serial,serverTime:this.now(),players:[...this.players.values()].map(({windowAt,messages,resumeKey,disconnectedAt,...p})=>structuredClone(p))};}
}
export function checkedSnapshot(s,{host,self,previousSerial=-1,previous=null}){
  if(!s||s.v!==VERSION||s.type!=='snapshot'||s.host!==host||s.world!==WORLD.worldRevision||!Number.isSafeInteger(s.serial)||s.serial<=previousSerial||!Number.isFinite(s.serverTime)||s.serverTime<0||!Array.isArray(s.players)||s.players.length<1||s.players.length>LIMIT||(previous&&s.serverTime<previous.serverTime))throw Error('BAD_SNAPSHOT');
  const ids=new Set(),slots=new Set(),old=new Map(previous?.players.map(p=>[p.id,p])||[]);
  for(const p of s.players){
    if(!p||!ID.test(p.id)||p.entityId!==p.id||p.vesselId!==VESSEL_ID||typeof p.connected!=='boolean'||typeof p.visible!=='boolean'||!Number.isInteger(p.slot)||p.slot<0||p.slot>=LIMIT||ids.has(p.id)||slots.has(p.slot)||!Number.isSafeInteger(p.seq)||p.seq< -1||('resumeKey' in p))throw Error('BAD_IDENTITY');
    nameOf(p.name);ids.add(p.id);slots.add(p.slot);if((p.id===host)!==(p.slot===0))throw Error('BAD_IDENTITY');
    if(p.pose!==null){sampleOf(p);if(p.seq<0||!Number.isFinite(p.updatedAt)||p.updatedAt<0||p.updatedAt>s.serverTime)throw Error('BAD_TIME');}
    else if(p.seq!==-1||p.clock!==null||p.updatedAt!==null)throw Error('BAD_EMPTY_POSE');
    const prior=old.get(p.id);if(prior){if(p.slot!==prior.slot||p.name!==prior.name||p.seq<prior.seq)throw Error('ROSTER_REGRESSION');if(p.seq===prior.seq&&JSON.stringify([p.pose,p.clock,p.updatedAt])!==JSON.stringify([prior.pose,prior.clock,prior.updatedAt]))throw Error('STATE_REPLAY');if(prior.clock){if(!p.clock)throw Error('CLOCK_REGRESSION');follows(prior.clock,p.clock);}}
  }
  if(!ids.has(host)||!ids.has(self)||!s.players.find(p=>p.id===host).connected||!s.players.find(p=>p.id===self).connected)throw Error('MISSING_PLAYER');return structuredClone(s);
}
