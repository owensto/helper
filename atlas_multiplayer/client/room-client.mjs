import {PROTOCOL,PLAYER_ID,ROOM_ID,finite,canonical,validatePose,validateWorld,worldFingerprint} from '../shared/world.mjs';
import {inviteLink,parseInvite} from './invite.mjs';
const err=code=>Object.assign(new Error(code),{code});
const nameOK=name=>typeof name==='string'&&name.trim()&&[...name].length<=24&&!/[\x00-\x1f\x7f<>]/.test(name);
const closeQuietly=(ws,code=1000,reason='LEFT')=>{try{if(ws&&ws.readyState<2)ws.close(code,reason);}catch{}};
export async function createRoomClient(options) {
  const world=validateWorld(options.world,{allowFixture:options.allowFixture});
  const hash=await worldFingerprint(world);
  return new RoomClient({...options,world,hash});
}
class RoomClient extends EventTarget {
  #session=null;#ws=null;#epoch=0;#seq=0;#stopped=true;#settle=null;#plan=null;
  #sendTimer=null;#watchTimer=null;#pingTimer=null;#retryTimer=null;#connectTimer=null;
  #abort=null;#lossAt=null;#retry=0;#fatal=false;#welcomed=false;#snapshotTime=-1;
  #lastSnapshot=0;#lastSent=-Infinity;#offset=0;#roomOrigin=0;#lastAge=0;#pings=new Map();#rttSamples=[];
  #info={state:'idle',players:0,error:null,rttMs:null,playerId:null,entityId:null,vesselId:null,roomId:null};
  constructor({world,hash,endpoint,baseUrl,onWelcome,readPose,now=()=>performance.now(),webSocketFactory=url=>new WebSocket(url)}) {
    super();
    const url=new URL(endpoint);
    if(!['ws:','wss:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/ws'||url.search||url.hash)throw err('BAD_ENDPOINT');
    if(url.protocol==='ws:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw err('INSECURE_ENDPOINT');
    if(globalThis.location?.protocol==='https:'&&url.protocol!=='wss:')throw err('INSECURE_ENDPOINT');
    if(typeof onWelcome!=='function'||typeof readPose!=='function')throw err('HOST_ADAPTER_REQUIRED');
    Object.assign(this,{world,worldHash:hash,endpoint:url.href,baseUrl,onWelcome,readPose,now,webSocketFactory});
    this.stats={sent:0,snapshots:0,reconnects:0};
  }
  get info(){return {...this.#info};}
  get connected(){return this.#info.state==='connected';}
  get serverNow(){return this.now()+this.#offset;}
  get roomAgeSeconds(){
    if(!this.#session)return null;
    this.#lastAge=Math.max(this.#lastAge,(this.serverNow-this.#roomOrigin)/1000);
    return this.#lastAge;
  }
  invite(){if(!this.#session||!this.connected)throw err('NOT_CONNECTED');return inviteLink(this.baseUrl,this.#session,this.worldHash);}
  #event(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  #status(state,error=null){this.#info={...this.#info,state,error};this.#event('status',this.info);}
  create({name,vesselId}){return this.#start({action:'create',name,vesselId});}
  join({name,vesselId,invite}){return this.#start({action:'join',name,vesselId,...parseInvite(invite,this.baseUrl,this.worldHash)});}
  #start(plan) {
    if(!['idle','error','offline'].includes(this.#info.state)||this.#session)throw err('ALREADY_ACTIVE');
    if(!nameOK(plan.name)||!Object.hasOwn(this.world.vessels,plan.vesselId||''))throw err('BAD_NAME_OR_VESSEL');
    this.#stopped=false;this.#fatal=false;this.#retry=0;this.#lossAt=null;this.#lastAge=0;this.#rttSamples=[];this.#lastSent=-Infinity;this.#plan={...plan,name:plan.name.normalize('NFC').trim()};
    const promise=new Promise((resolve,reject)=>{this.#settle={resolve,reject};});
    this.#dial(false);return promise;
  }
  #clearConnectionTimers(){
    clearInterval(this.#sendTimer);clearInterval(this.#watchTimer);clearInterval(this.#pingTimer);clearTimeout(this.#connectTimer);
    this.#sendTimer=this.#watchTimer=this.#pingTimer=this.#connectTimer=null;this.#pings.clear();
  }
  #dial(resume) {
    if(this.#stopped)return;
    this.#clearConnectionTimers();const epoch=++this.#epoch;
    this.#abort?.abort();this.#abort=new AbortController();this.#welcomed=false;this.#snapshotTime=-1;
    this.#status(resume?'reconnecting':'connecting');
    let ws;
    try{ws=this.webSocketFactory(this.endpoint);}catch{this.#fail('CONNECTION_FAILED');return;}
    this.#ws=ws;
    const current=()=>this.#epoch===epoch&&this.#ws===ws&&!this.#stopped;
    this.#connectTimer=setTimeout(()=>{if(current()){if(this.#session)closeQuietly(ws,4004,'CONNECT_TIMEOUT');else this.#fail('CONNECT_TIMEOUT');}},8000);
    ws.addEventListener('open',()=>{
      if(!current()){closeQuietly(ws);return;}
      const plan=resume?{action:'resume',name:this.#plan.name,vesselId:this.#session.vesselId,
        roomId:this.#session.roomId,key:this.#session.key,playerId:this.#session.playerId,resumeToken:this.#session.resumeToken}:this.#plan;
      ws.send(JSON.stringify({protocol:PROTOCOL,worldId:this.world.worldId,worldRevision:this.world.worldRevision,worldHash:this.worldHash,...plan}));
    });
    ws.addEventListener('message',event=>{
      if(!current())return;
      try {
        if(typeof event.data!=='string'||event.data.length>65536)throw err('BAD_SERVER_MESSAGE');
        const m=JSON.parse(event.data);if(!m||typeof m!=='object'||Array.isArray(m))throw err('BAD_SERVER_MESSAGE');
        if(m.type==='welcome')this.#acceptWelcome(m,epoch,resume).catch(e=>{if(current()&&e.code!=='CANCELLED')this.#fail(e.code||'HOST_PREPARE_FAILED');});
        else if(m.type==='snapshot')this.#acceptSnapshot(m);
        else if(m.type==='pong')this.#acceptPong(m);
        else if(m.type==='error') {
          const code=typeof m.code==='string'&&/^[A-Z_]{1,40}$/.test(m.code)?m.code:'BAD_SERVER_MESSAGE';
          if(code==='SESSION_ACTIVE'&&resume)closeQuietly(ws,4004,'SESSION_ACTIVE');else this.#fail(code);
        } else throw err('BAD_SERVER_MESSAGE');
      }catch(e){this.#fail(e.code||'BAD_SERVER_MESSAGE');}
    });
    ws.addEventListener('error',()=>{}); // Close/timeout supplies one deterministic user-visible failure.
    ws.addEventListener('close',()=>{if(current())this.#lost();});
  }
  async #acceptWelcome(m,epoch,resume) {
    if(this.#welcomed||m.protocol!==PROTOCOL||m.worldHash!==this.worldHash||m.worldId!==this.world.worldId||m.worldRevision!==this.world.worldRevision)throw err('WORLD_MISMATCH');
    if(!PLAYER_ID.test(m.playerId||'')||!PLAYER_ID.test(m.resumeToken||'')||!PLAYER_ID.test(m.key||'')||!ROOM_ID.test(m.roomId||'')||m.entityId!=='boat:'+m.playerId)throw err('BAD_SERVER_MESSAGE');
    if(m.vesselId!==this.#plan.vesselId||!Number.isInteger(m.slot)||m.slot<0||m.slot>=this.world.capacity||
       !finite(m.serverTime,1e15)||!finite(m.roomCreatedAt,1e15)||m.serverTime<m.roomCreatedAt||!Number.isInteger(m.seed)||m.seed<0||m.seed>0xffffffff||
       !Number.isSafeInteger(m.nextSequence)||m.nextSequence<0||!finite(m.graceMs,60000)||m.graceMs<1000||m.resumed!==resume)throw err('BAD_SERVER_MESSAGE');
    if(resume&&(!this.#session||m.playerId!==this.#session.playerId||m.roomId!==this.#session.roomId))throw err('IDENTITY_MISMATCH');
    const pose=validatePose(m.selfPose),spawn=this.world.vessels[m.vesselId].spawns[m.slot];
    if(!m.spawn||canonical(m.spawn)!==canonical(spawn))throw err('SPAWN_MISMATCH');
    this.#welcomed=true;
    this.#session={roomId:m.roomId,key:m.key,playerId:m.playerId,resumeToken:m.resumeToken,vesselId:m.vesselId,graceMs:m.graceMs};
    this.#seq=m.nextSequence;this.#offset=m.serverTime-this.now();this.#roomOrigin=m.roomCreatedAt;this.#lastSnapshot=this.now();
    this.#info={...this.#info,playerId:m.playerId,entityId:m.entityId,vesselId:m.vesselId,roomId:m.roomId};
    this.#status(resume?'reconnecting':'joining');
    const signal=this.#abort.signal;
    const context=Object.freeze({resumed:resume,playerId:m.playerId,entityId:m.entityId,vesselId:m.vesselId,slot:m.slot,
      spawn:structuredClone(spawn),pose,world:this.world,seed:m.seed,signal});
    const accepted=await this.onWelcome(context);
    if(signal.aborted||epoch!==this.#epoch||this.#stopped)throw err('CANCELLED');
    if(accepted!==true)throw err('HOST_RESTORE_REFUSED');
    clearTimeout(this.#connectTimer);this.#retry=0;this.#lossAt=null;
    if(resume)this.stats.reconnects++;
    this.#status('connected');this.#settle?.resolve(this.info);this.#settle=null;
    this.#sendTimer=setInterval(()=>this.#publish(),50);
    this.#watchTimer=setInterval(()=>{
      if(!this.connected)return;
      if(this.now()-this.#lastSnapshot>3000){this.#status('reconnecting','STALE_CONNECTION');closeQuietly(this.#ws,4004,'STALE_CONNECTION');}
    },200);
    this.#pingTimer=setInterval(()=>this.#ping(),1500);this.#ping();
  }
  #acceptSnapshot(m) {
    if(!this.#session||m.protocol!==PROTOCOL||m.roomId!==this.#session.roomId||!finite(m.serverTime,1e15)||
        !Array.isArray(m.players)||m.players.length<1||m.players.length>this.world.capacity)throw err('BAD_SERVER_MESSAGE');
    if(m.serverTime<=this.#snapshotTime)return;
    const ids=new Set(),slots=new Set();
    const players=m.players.map(p=>{
      if(!p||!PLAYER_ID.test(p.id||'')||p.entityId!=='boat:'+p.id||!nameOK(p.name)||
         !Object.hasOwn(this.world.vessels,p.vesselId||'')||typeof p.connected!=='boolean'||
         !Number.isSafeInteger(p.seq)||p.seq< -1||!Number.isInteger(p.slot)||p.slot<0||p.slot>=this.world.capacity||
         !finite(p.updatedAt,1e15)||p.updatedAt>m.serverTime||ids.has(p.id)||slots.has(p.slot))throw err('BAD_SERVER_MESSAGE');
      ids.add(p.id);slots.add(p.slot);
      return {id:p.id,entityId:p.entityId,vesselId:p.vesselId,slot:p.slot,name:p.name,connected:p.connected,
        seq:p.seq,updatedAt:p.updatedAt,pose:validatePose(p.pose)};
    });
    const self=players.find(p=>p.id===this.#session.playerId);
    if(!self||self.vesselId!==this.#session.vesselId||self.entityId!==this.#info.entityId)throw err('IDENTITY_MISMATCH');
    this.#snapshotTime=m.serverTime;this.#lastSnapshot=this.now();this.stats.snapshots++;
    this.#info.players=players.filter(p=>p.connected).length;
    this.#event('snapshot',{serverTime:m.serverTime,players,selfId:this.#session.playerId});
    this.#event('status',this.info);
  }
  #ping(){
    if(!this.connected||this.#ws?.readyState!==1)return;
    const t=this.now();this.#pings.set(t,t);while(this.#pings.size>4)this.#pings.delete(this.#pings.keys().next().value);
    this.#ws.send(JSON.stringify({type:'ping',clientTime:t}));
  }
  #acceptPong(m){
    if(!this.#pings.has(m.clientTime)||!finite(m.serverTime,1e15))return;
    const sent=this.#pings.get(m.clientTime),received=this.now();this.#pings.delete(m.clientTime);
    const rtt=received-sent;if(rtt<0||rtt>5000)return;
    this.#rttSamples.push({rtt,offset:m.serverTime-(sent+received)/2});if(this.#rttSamples.length>8)this.#rttSamples.shift();
    this.#offset=this.#rttSamples.reduce((a,b)=>a.rtt<b.rtt?a:b).offset;this.#info.rttMs=Math.round(rtt);
  }
  #publish(){
    if(!this.connected||this.#ws?.readyState!==1||this.now()-this.#lastSent<45)return;
    if(this.#ws.bufferedAmount>32768){closeQuietly(this.#ws,4008,'SLOW_CONNECTION');return;}
    try{
      const pose=validatePose(this.readPose());
      if(!Number.isSafeInteger(this.#seq))throw err('SEQUENCE_EXPIRED');
      this.#ws.send(JSON.stringify({type:'state',seq:this.#seq++,pose}));this.#lastSent=this.now();this.stats.sent++;
    }catch(e){this.#fail(e.code==='VESSEL_SWITCH_REQUIRES_REJOIN'?e.code:'HOST_SAMPLE_FAILED');}
  }
  #lost(){
    this.#clearConnectionTimers();this.#abort?.abort();
    if(this.#stopped||this.#fatal)return;
    this.#lossAt??=this.now();
    if(!this.#session){this.#fail('CONNECTION_FAILED');return;}
    if(this.now()-this.#lossAt>=this.#session.graceMs){this.#fail('SESSION_EXPIRED');return;}
    this.#status('reconnecting','CONNECTION_LOST');
    const wait=Math.min(3000,350*2**Math.min(this.#retry++,4));
    this.#retryTimer=setTimeout(()=>this.#dial(true),wait);
  }
  #fail(code){
    this.#fatal=true;this.#stopped=true;this.#epoch++;this.#abort?.abort();
    clearTimeout(this.#retryTimer);this.#clearConnectionTimers();
    if(this.#session&&this.#ws?.readyState===1){try{this.#ws.send(JSON.stringify({type:'leave'}));}catch{}}
    closeQuietly(this.#ws,4000,'CLIENT_STOP');this.#ws=null;this.#session=null;
    this.#settle?.reject(err(code));this.#settle=null;this.#info.players=0;
    this.#status('error',code);this.#event('exit',{reason:code});
  }
  leave(){
    this.#stopped=true;this.#epoch++;this.#abort?.abort();clearTimeout(this.#retryTimer);this.#clearConnectionTimers();
    if(this.#session&&this.#ws?.readyState===1){try{this.#ws.send(JSON.stringify({type:'leave'}));}catch{}}
    closeQuietly(this.#ws);this.#ws=null;this.#session=null;this.#lastAge=0;this.#rttSamples=[];
    this.#settle?.reject(err('CANCELLED'));this.#settle=null;
    this.#info={state:'idle',players:0,error:null,rttMs:null,playerId:null,entityId:null,vesselId:null,roomId:null};
    this.#status('idle');this.#event('exit',{reason:'LEFT'});
  }
}
