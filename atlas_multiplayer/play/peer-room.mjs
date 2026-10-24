import {WORLD} from '../standalone/world.mjs';
import {RemoteBuffer} from '../client/interpolation.mjs';
import {VERSION,LIMIT,RESUME_MS,HostRoom,randomId,secret,nameOf,parseMessage,parseInvite,inviteURL,checkedSnapshot} from './protocol.mjs';
import {loadScript} from './assets.mjs';
export async function browserPeer(id){
  if(!globalThis.RTCPeerConnection)throw Error('WEBRTC_UNAVAILABLE');
  await loadScript('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',{test:()=>typeof globalThis.Peer==='function'});
  return new globalThis.Peer(id,{host:'0.peerjs.com',port:443,path:'/',key:'peerjs',secure:true,debug:0});
}
const friendly={
  WEBRTC_UNAVAILABLE:'WebRTC is unavailable in this browser. Solo sailing still works.',
  CONNECT_TIMEOUT:'Could not reach the host. Keep both tabs open; this network or the public relay may block the connection.',
  SCRIPT_DOWNLOAD_FAILED:'The connection library could not load. Solo sailing still works.',
  SCRIPT_TIMEOUT:'The connection library download timed out. Solo sailing still works.',
  HOST_LEFT:'The host ended the room. You are back in solo sailing.',
  BAD_INVITE:'Use a new Crew 8 invitation copied from this version.',
  BAD_NAME:'Enter a name of 1–24 characters without markup.',
  ROOM_FULL:'All eight seats are occupied or reserved for reconnecting players.',
  SPAWN_OCCUPIED:'The launch positions are occupied. Ask the other boats to move clear.',
  INVITE_REJECTED:'This invitation was not accepted. Ask the host for a new link.',
  SESSION_EXPIRED:'Your reconnect reservation expired. Use Join room for a fresh seat.',
  SESSION_ACTIVE:'That captain is already connected.',
  VERSION_MISMATCH:'Everyone must use the same Crew 8 build and a fresh invitation.',
  'peer-unavailable':'The host is offline. Ask them to open a new room.',
  'unavailable-id':'The connection address is in use. Create a new room.',
  'browser-incompatible':'Your browser does not support this WebRTC connection.'
};
const closeQuietly=c=>{try{c.close();}catch{}};
/** Host-star topology: seven guest channels, no full-mesh connection explosion.
 * Injected transport tests are not native WebRTC/cloud acceptance.
 */
export class PeerRoom {
  constructor({read,onSpawn,onResume=()=>{},onState=()=>{},peerFactory=browserPeer,now=()=>performance.now(),visible=()=>!globalThis.document?.hidden,base=globalThis.location?.href||'https://example.invalid/play/multiplayer.html',tickMs=100}){
    Object.assign(this,{read,onSpawn,onResume,onState,peerFactory,now,visible,base,tickMs});this.generation=0;this.connections=new Map();this.buffer=new RemoteBuffer({staleMs:1800});this.peer=null;this.timer=null;this.timeout=null;this.room=null;this.host=null;this.id=null;this.link='';this.roster=[];this.info={state:'solo',message:'Solo sailing',players:1,connected:1,capacity:LIMIT,roster:[]};this.serial=-1;this.lastSnapshot=null;this.lastSnapshotAt=null;this.offset=0;this.seq=0;this.rtt=null;this.signaling=false;this.everJoined=false;this.recoveryUntil=null;this.retryAt=0;this.retryCount=0;this.signalRetryAt=0;this.pingAt=0;this.pendingPing=null;this.slot=null;this.metrics={sent:0,received:0,dropped:0,retries:0,maxBytes:0};
  }
  publish(state,message){
    const roster=this.roster.map(p=>({id:p.id,name:p.name,slot:p.slot,connected:p.connected,visible:p.visible,host:p.id===this.host,self:p.id===this.id}));
    this.info={state,message,players:roster.length||1,connected:roster.filter(p=>p.connected).length||(!this.host?1:0),capacity:LIMIT,roster,latencyMs:this.rtt===null?null:Math.round(this.rtt),signaling:this.signaling,reconnectSeconds:this.recoveryUntil===null?null:Math.max(0,Math.ceil((this.recoveryUntil-this.now())/1000))};
    try{this.onState(structuredClone(this.info));}catch{} // Observer failure never owns the room.
  }
  send(c,value,{volatile=false}={}){
    if(!c?.open)return false;const entry=this.connections.get(c.peer);
    if((c.dataChannel?.bufferedAmount||0)>65536||(c.bufferSize||0)>8){
      this.metrics.dropped++;if(entry){entry.backedUpAt??=this.now();if(this.now()-entry.backedUpAt>5000)entry.close();}
      if(volatile)return false;entry?.close();return false;
    }
    if(entry)entry.backedUpAt=null;
    try{const text=JSON.stringify(value);c.send(text);this.metrics.sent++;this.metrics.maxBytes=Math.max(this.metrics.maxBytes,new TextEncoder().encode(text).length);return true;}
    catch{entry?.close();if(!entry)closeQuietly(c);return false;}
  }
  async start({name,invite=null}={}){
    name=nameOf(name);const joining=invite?parseInvite(invite,this.base):null;this.leave(false);
    const generation=this.generation,live=()=>generation===this.generation;this.id=randomId();this.name=name;this.joining=joining;this.resumeKey=secret();this.seq=0;this.everJoined=false;this.slot=null;this.startedAt=this.now();this.metrics={sent:0,received:0,dropped:0,retries:0,maxBytes:0};
    this.publish('connecting',joining?'Opening your connection…':'Creating your eight-person room…');
    try{
      const peer=await this.peerFactory(this.id);if(!live()){peer.destroy();return;}this.peer=peer;
      this.timeout=setTimeout(()=>{if(live()&&!this.room&&!this.everJoined)this.fail('CONNECT_TIMEOUT');},25000);
      peer.on('call',closeQuietly); // Data only; never requests media permissions.
      peer.on('connection',c=>{if(!live()||!this.room){closeQuietly(c);return;}this.accept(c,live);});
      peer.on('close',()=>{if(live())this.fail('HOST_LEFT');});
      peer.on('error',e=>{
        if(!live())return;const code=e.type||e.message;
        if(['browser-incompatible','invalid-id','unavailable-id','invalid-key','ssl-unavailable'].includes(code)){this.fail(code);return;}
        // PeerJS may emit a connection error at Peer level. A single guest must not end everyone else's room.
        if(this.room){this.publish('hosting','A connection needs attention; other captains can continue.');return;}
        if(this.everJoined){const entry=this.connections.get(this.host);if(code==='peer-unavailable'||!entry?.joined)entry?.close();this.recover(live);}
        else if(code==='peer-unavailable')this.fail(code);
      });
      peer.on('disconnected',()=>{if(!live())return;this.signaling=false;this.signalRetryAt=this.now();this.publish(this.room?'hosting':this.everJoined?'stale':'connecting','Signaling reconnecting; existing boat connections may continue.');});
      peer.on('open',()=>{
        if(!live())return;this.signaling=true;
        if(this.timer){if(this.room)this.publish('hosting','Room open · share the invitation');return;}
        try{
          if(joining){this.host=joining.room;this.dial(live);}
          else{this.room=new HostRoom({id:this.id,key:secret(),name,now:this.now});this.host=this.id;this.slot=0;this.onSpawn(structuredClone(WORLD.vessels['atlas-open-water-bay'].spawns[0]));this.link=inviteURL(this.base,this.id,this.room.key);clearTimeout(this.timeout);this.ingest(this.room.snapshot());this.publish('hosting','Room open · share the invitation');}
          this.timer=setInterval(()=>{if(live())this.tick();},this.tickMs);
        }catch(e){this.fail(e.message);}
      });
    }catch(e){if(live())this.fail(e.message);}
  }
  accept(c,live){
    if(this.connections.size>=16||this.connections.has(c.peer)){closeQuietly(c);return;}
    const entry={c,joined:false,lastRx:this.now(),pendingAt:this.now(),backedUpAt:null,windowAt:this.now(),inbound:0};this.connections.set(c.peer,entry);
    entry.close=(abandon=false)=>{if(this.connections.get(c.peer)!==entry)return;this.connections.delete(c.peer);clearTimeout(entry.wait);clearTimeout(entry.rejectTimer);if(live()&&entry.joined){if(abandon)this.room?.remove(c.peer);else this.room?.disconnect(c.peer);}closeQuietly(c);};
    entry.wait=setTimeout(()=>entry.close(),8000);
    c.on('close',()=>entry.close());c.on('error',()=>entry.close());
    c.on('data',raw=>{
      if(!live()||this.connections.get(c.peer)!==entry||entry.rejecting)return;
      try{
        if(this.now()-entry.windowAt>=1000){entry.windowAt=this.now();entry.inbound=0;}if(++entry.inbound>50)throw Error('RATE_LIMIT');
        const m=parseMessage(raw,4096);entry.lastRx=this.now();this.metrics.received++;
        if(!entry.joined){const welcome=this.room.add(c.peer,m);entry.joined=true;clearTimeout(entry.wait);this.send(c,welcome);this.ingest(this.room.snapshot());this.publish('hosting','Room open · share the invitation');}
        else if(m.type==='leave')entry.close(true);
        else if(m.type==='ping'){if(!Number.isFinite(m.at)||m.at<0)throw Error('BAD_MESSAGE');this.send(c,{v:VERSION,type:'pong',at:m.at,serverTime:this.now()});}
        else this.room.update(c.peer,m);
      }catch(e){entry.rejecting=true;this.send(c,{v:VERSION,type:'error',code:friendly[e.message]?e.message:'BAD_MESSAGE'});entry.rejectTimer=setTimeout(()=>entry.close(true),80);}
    });
  }
  dial(live){
    if(!live()||!this.peer||this.connections.has(this.host)||this.peer.disconnected)return;
    let c;try{c=this.peer.connect(this.host,{serialization:'raw',reliable:true});}catch{this.recover(live);return;}
    const entry={c,joined:false,pendingAt:this.now(),backedUpAt:null};this.connections.set(c.peer,entry);
    entry.close=()=>{if(this.connections.get(c.peer)!==entry)return;this.connections.delete(c.peer);closeQuietly(c);if(live())this.recover(live);};
    c.on('open',()=>{if(live()&&this.connections.get(c.peer)===entry)this.send(c,{v:VERSION,type:'hello',world:WORLD.worldRevision,key:this.joining.key,name:this.name,resumeKey:this.resumeKey,resume:this.everJoined});});
    c.on('close',()=>entry.close());c.on('error',()=>entry.close());
    c.on('data',raw=>{
      if(!live()||this.connections.get(c.peer)!==entry)return;
      try{
        const m=parseMessage(raw);this.metrics.received++;if(m.type==='error')throw Error(m.code);if(m.type==='leave')throw Error('HOST_LEFT');
        if(!entry.joined){
          if(m.type!=='welcome'||m.id!==this.id||m.host!==this.host||m.world!==WORLD.worldRevision||!Number.isInteger(m.slot)||m.slot<1||m.slot>=LIMIT||typeof m.resumed!=='boolean'||!Number.isSafeInteger(m.nextSequence)||m.nextSequence<0||JSON.stringify(m.spawn)!==JSON.stringify(WORLD.vessels['atlas-open-water-bay'].spawns[m.slot])||(this.everJoined&&(!m.resumed||m.slot!==this.slot)))throw Error('BAD_WELCOME');
          if(!this.everJoined)this.onSpawn(m.spawn);else this.onResume();
          this.slot=m.slot;this.everJoined=true;this.seq=Math.max(this.seq,m.nextSequence);entry.joined=true;this.lastSnapshotAt=this.now();this.recoveryUntil=null;this.retryCount=0;clearTimeout(this.timeout);this.publish('connecting','Connection open · waiting for the fleet');
        }else if(m.type==='pong'){
          if(this.pendingPing!==null&&m.at===this.pendingPing){const elapsed=this.now()-m.at;if(elapsed>=0&&elapsed<15000)this.rtt=this.rtt===null?elapsed:this.rtt*.7+elapsed*.3;this.pendingPing=null;}
        }else{
          const s=checkedSnapshot(m,{host:this.host,self:this.id,previousSerial:this.serial,previous:this.lastSnapshot});this.offset=s.serverTime-this.now();this.lastSnapshotAt=this.now();this.ingest(s);
          this.publish('connected',s.players.find(p=>p.id===this.host).visible?'Fleet connected':'Host tab is in the background · updates may pause');
        }
      }catch(e){this.fail(e.message);}
    });
  }
  recover(live){
    if(!live()||!this.joining)return;
    if(!this.everJoined){this.retryAt=this.now()+1500;return;}
    if(this.recoveryUntil===null){this.recoveryUntil=this.now()+RESUME_MS;try{this.onResume();}catch{};}
    this.retryAt=this.now()+Math.min(4000,500*2**Math.min(this.retryCount,3));this.publish('reconnecting','Connection interrupted · reserving your boat for 30 seconds');
  }
  ingest(s){this.serial=s.serial;this.lastSnapshot=s;this.roster=s.players;this.buffer.ingest(s,this.id);}
  tick(){
    try{
      const t=this.now();
      if(this.peer?.disconnected&&t>=this.signalRetryAt){this.signalRetryAt=t+3000;try{this.peer.reconnect();}catch{}}
      if(this.room){
        this.room.update(this.id,{v:VERSION,type:'state',seq:this.seq++,sample:this.read(),visible:this.visible()});
        for(const e of [...this.connections.values()])if(e.joined&&t-e.lastRx>8000)e.close();
        const s=this.room.snapshot();this.lastSnapshotAt=t;this.offset=0;this.ingest(s);
        for(const {c,joined} of [...this.connections.values()])if(joined)this.send(c,s,{volatile:true});
        this.publish('hosting',this.visible()?'Room open · keep this host tab visible':'Host tab backgrounded · bring it forward to keep sailing');
      }else if(this.host){
        if(this.recoveryUntil!==null&&t>=this.recoveryUntil){this.fail('SESSION_EXPIRED');return;}
        const e=this.connections.get(this.host);
        if(e?.joined){
          this.send(e.c,{v:VERSION,type:'state',seq:this.seq++,sample:this.read(),visible:this.visible()},{volatile:true});
          if(t>=this.pingAt){this.pingAt=t+1500;this.pendingPing=t;this.send(e.c,{v:VERSION,type:'ping',at:t},{volatile:true});}
          const age=t-(this.lastSnapshotAt??t);if(age>6000)e.close();else if(age>1800)this.publish('stale','Host updates are delayed · keep both tabs visible');
        }else if(e&&t-e.pendingAt>8000)e.close();
        else if(!e&&t>=this.retryAt&&this.signaling){this.retryCount++;this.metrics.retries++;const generation=this.generation;this.dial(()=>generation===this.generation);}
        if(this.recoveryUntil!==null)this.publish('reconnecting','Reconnecting to the same boat…');
      }
    }catch(e){this.fail(e.message);}
  }
  remotes(){return this.buffer.sample(this.now()+this.offset,['hosting','connected'].includes(this.info.state)).map(r=>({...r,slot:this.roster.find(p=>p.id===r.id)?.slot??0}));}
  fail(code){const message=friendly[code]||'Connection failed. Solo works; use a fresh invitation to try again.';this.leave(false);this.publish('error',message);}
  leave(notify=true){
    this.generation++;clearInterval(this.timer);clearTimeout(this.timeout);this.timer=null;this.timeout=null;
    const entries=[...this.connections.values()];this.connections.clear();
    for(const e of entries){clearTimeout(e.wait);clearTimeout(e.rejectTimer);try{if(e.c.open)e.c.send(JSON.stringify({v:VERSION,type:'leave'}));}catch{}}
    const peer=this.peer;this.peer=null;const finish=()=>{entries.forEach(e=>closeQuietly(e.c));try{peer?.destroy();}catch{}};
    // Best-effort flush of the leave notice. Save old resources; never destroy a newly opened room.
    if(notify&&entries.length)setTimeout(finish,120);else finish();
    this.room=null;this.host=null;this.link='';this.buffer.clear();this.roster=[];this.serial=-1;this.lastSnapshot=null;this.lastSnapshotAt=null;this.offset=0;this.recoveryUntil=null;this.rtt=null;this.pendingPing=null;this.signaling=false;this.joining=null;this.resumeKey=null;
    this.info={state:'solo',message:'Solo sailing',players:1,connected:1,capacity:LIMIT,roster:[]};if(notify)this.publish('solo','Solo sailing');
  }
}
