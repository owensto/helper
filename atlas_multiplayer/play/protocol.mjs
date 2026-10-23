/** Peer-hosted casual playtest. This is NOT the existing atlas-net-3 server protocol. */
import {WORLD,VESSEL_ID} from '../standalone/world.mjs';
import {validatePose,validateSourceClock} from '../shared/world.mjs';
export const VERSION='atlas-browser-room-1';
export const LIMIT=8;
const ID=/^ow-[a-f0-9]{32}$/;
const KEY=/^[a-f0-9]{48}$/;
export function randomId(){return 'ow-'+crypto.randomUUID().replaceAll('-','');}
export function secret(){return [...crypto.getRandomValues(new Uint8Array(24))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function nameOf(value){if(typeof value!=='string'||!value.trim()||[...value].length>24||/[<>\x00-\x1f\x7f]/.test(value))throw Error('BAD_NAME');return value.trim().normalize('NFC');}
export function parseMessage(raw,max=16384){if(typeof raw!=='string'||raw.length>max)throw Error('BAD_MESSAGE');const v=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v)||v.v!==VERSION)throw Error('VERSION_MISMATCH');return v;}
export function inviteURL(base,room,key){if(!ID.test(room)||!KEY.test(key))throw Error('BAD_INVITE');const u=new URL('multiplayer.html',base);u.search='';u.hash=new URLSearchParams({room,key}).toString();return u.href;}
export function parseInvite(value,base){const u=new URL(value,base),q=new URLSearchParams(u.hash.slice(1)),room=q.get('room'),key=q.get('key');if(!ID.test(room||'')||!KEY.test(key||''))throw Error('BAD_INVITE');return {room,key};}
export function sampleOf(value){
  if(!value||value.vesselId!==VESSEL_ID)throw Error('VESSEL_MISMATCH');
  const pose=validatePose(value.pose),clock=validateSourceClock(value.clock);
  if(!clock||Math.hypot(pose.p[0],pose.p[2])>WORLD.bounds.radiusM+1)throw Error('BAD_POSE');
  return {pose,clock};
}
function follows(previous,next){if(previous&&(next.epoch<previous.epoch||(next.epoch===previous.epoch&&next.seconds<previous.seconds)))throw Error('CLOCK_REGRESSION');}
export class HostRoom {
  constructor({id,key,name,now=()=>performance.now()}){
    if(!ID.test(id)||!KEY.test(key))throw Error('BAD_ID');this.id=id;this.key=key;this.now=now;this.serial=0;this.players=new Map();
    this.players.set(id,this.player(id,name,0));
  }
  player(id,name,slot){return {id,entityId:id,vesselId:VESSEL_ID,name:nameOf(name),slot,connected:true,seq:-1,pose:null,clock:null,updatedAt:null,windowAt:this.now(),messages:0};}
  add(id,hello){
    if(!ID.test(id)||id===this.id||this.players.has(id))throw Error('IDENTITY_CONFLICT');
    if(hello.type!=='hello'||hello.v!==VERSION||hello.key!==this.key||hello.world!==WORLD.worldRevision)throw Error('INVITE_REJECTED');
    if(this.players.size>=LIMIT)throw Error('ROOM_FULL');
    // Reserve distinct launch slots and avoid current boat positions. No shared collision physics.
    const used=new Set([...this.players.values()].map(p=>p.slot));
    const slots=WORLD.vessels[VESSEL_ID].spawns;
    const slot=slots.findIndex((s,i)=>!used.has(i)&&[...this.players.values()].every(p=>!p.pose||Math.hypot(s.p[0]-p.pose.p[0],s.p[2]-p.pose.p[2])>=14));
    if(slot<0)throw Error('SPAWN_OCCUPIED');
    this.players.set(id,this.player(id,hello.name,slot));
    return {v:VERSION,type:'welcome',id,host:this.id,slot,world:WORLD.worldRevision,spawn:structuredClone(slots[slot])};
  }
  update(id,message){
    const p=this.players.get(id);if(!p)throw Error('NOT_JOINED');
    if(this.now()-p.windowAt>=1000){p.windowAt=this.now();p.messages=0;}if(++p.messages>35)throw Error('RATE_LIMIT');
    if(message.type!=='state'||message.v!==VERSION||!Number.isSafeInteger(message.seq)||message.seq<0||Object.keys(message).some(k=>!['v','type','seq','sample'].includes(k)))throw Error('BAD_STATE');
    if(message.seq<=p.seq)return false;const {pose,clock}=sampleOf(message.sample);follows(p.clock,clock);
    Object.assign(p,{pose,clock,seq:message.seq,updatedAt:this.now()});return true;
  }
  remove(id){if(id!==this.id)this.players.delete(id);}
  snapshot(){return {v:VERSION,type:'snapshot',world:WORLD.worldRevision,host:this.id,serial:++this.serial,serverTime:this.now(),players:[...this.players.values()].map(({windowAt,messages,...p})=>structuredClone(p))};}
}
export function checkedSnapshot(s,{host,self,previousSerial=-1}){
  if(!s||s.v!==VERSION||s.type!=='snapshot'||s.host!==host||s.world!==WORLD.worldRevision||!Number.isSafeInteger(s.serial)||s.serial<=previousSerial||!Number.isFinite(s.serverTime)||s.serverTime<0||!Array.isArray(s.players)||s.players.length<1||s.players.length>LIMIT)throw Error('BAD_SNAPSHOT');
  const ids=new Set(),slots=new Set();
  for(const p of s.players){
    if(!p||!ID.test(p.id)||p.entityId!==p.id||p.vesselId!==VESSEL_ID||p.connected!==true||!Number.isInteger(p.slot)||p.slot<0||p.slot>=LIMIT||ids.has(p.id)||slots.has(p.slot)||!Number.isSafeInteger(p.seq)||p.seq< -1)throw Error('BAD_IDENTITY');
    nameOf(p.name);ids.add(p.id);slots.add(p.slot);
    if(p.pose!==null){sampleOf(p);if(!Number.isFinite(p.updatedAt)||p.updatedAt<0||p.updatedAt>s.serverTime)throw Error('BAD_TIME');}
    else if(p.seq!==-1||p.clock!==null||p.updatedAt!==null)throw Error('BAD_EMPTY_POSE');
  }
  if(!ids.has(host)||!ids.has(self))throw Error('MISSING_PLAYER');return structuredClone(s);
}
