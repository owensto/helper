import {WORLD} from '../standalone/world.mjs';
import {RemoteBuffer} from '../client/interpolation.mjs';
import {VERSION,HostRoom,randomId,secret,nameOf,parseMessage,parseInvite,inviteURL,checkedSnapshot} from './protocol.mjs';
import {loadScript} from './assets.mjs';
export async function browserPeer(id){
  if(!globalThis.RTCPeerConnection)throw Error('WEBRTC_UNAVAILABLE');
  await loadScript('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',{test:()=>typeof globalThis.Peer==='function'});
  // Upstream's documented cloud defaults: signaling + STUN/TURN; no user credentials.
  return new globalThis.Peer(id,{host:'0.peerjs.com',port:443,path:'/',key:'peerjs',secure:true,debug:0});
}
const friendly={
  'network':'Signaling disconnected. Leave and rejoin if it does not recover.',
  'peer-unavailable':'That host is offline. Ask them to create a new invitation.',
  'server-error':'The public signaling service is unavailable.',
  'socket-error':'The public signaling service could not be reached.',
  'socket-closed':'The signaling connection closed.',
  'browser-incompatible':'This browser cannot make a WebRTC data connection.',
  'unavailable-id':'Room address was already taken. Try creating again.',
  WEBRTC_UNAVAILABLE:'This browser does not expose WebRTC data channels.',
  CONNECT_TIMEOUT:'The peer connection timed out. This network may block WebRTC.',
  SCRIPT_DOWNLOAD_FAILED:'The multiplayer library could not download. Solo still works.',
  SCRIPT_TIMEOUT:'The multiplayer library download timed out. Solo still works.',
  HOST_LEFT:'The host left. The room ended; you are sailing solo.',
  BAD_INVITE:'The invitation is incomplete or invalid.',ROOM_FULL:'All eight room places are occupied.',SPAWN_OCCUPIED:'Launch positions are occupied. Ask a boat to move clear.',
  INVITE_REJECTED:'The invitation was not accepted. Ask for a fresh link.'
};
/** Actual PeerJS adapter; protocol tests inject event transports, never call them WebRTC proof. */
export class PeerRoom {
  constructor({read,onSpawn,onState=()=>{},peerFactory=browserPeer,now=()=>performance.now(),base=globalThis.location?.href||'https://example.invalid/play/multiplayer.html',tickMs=100}){
    Object.assign(this,{read,onSpawn,onState,peerFactory,now,base,tickMs});this.generation=0;this.connections=new Map();this.buffer=new RemoteBuffer();this.info={state:'solo',players:1,message:'Solo sailing'};this.serial=-1;this.seq=0;this.peer=null;this.room=null;this.host=null;this.id=null;this.link='';this.lastSnapshotAt=0;this.offset=0;this.timer=null;this.timeout=null;
  }
  publish(state,message,players=this.info.players){this.info={state,message,players};try{this.onState({...this.info});}catch{}}
  send(c,value){if(!c?.open)return false;if((c.dataChannel?.bufferedAmount||0)>65536||(c.bufferSize||0)>32){c.close();return false;}c.send(JSON.stringify(value));return true;}
  async start({name,invite=null}={}){
    name=nameOf(name);const joining=invite?parseInvite(invite,this.base):null;this.leave(false);
    const generation=this.generation,id=randomId();this.id=id;this.seq=0;this.serial=-1;
    this.publish('connecting',joining?'Connecting to the host…':'Opening public signaling…',1);
    const live=()=>generation===this.generation;
    try{
      const peer=await this.peerFactory(id);if(!live()){peer.destroy();return;}this.peer=peer;
      this.timeout=setTimeout(()=>{if(live()&&this.info.state==='connecting')this.fail('CONNECT_TIMEOUT');},25000);
      peer.on('error',e=>{if(live())this.fail(e.type||e.message);});
      peer.on('call',c=>c.close()); // Data only; never request camera/microphone.
      peer.on('close',()=>{if(live())this.fail('HOST_LEFT');});
      peer.on('disconnected',()=>{if(!live())return;if(!this.room&&!this.connections.get(this.host)?.joined){this.fail('network');return;}this.publish(this.room?'hosting':'stale','Signaling unavailable; established peers may continue.');try{peer.reconnect();}catch{}});
      peer.on('connection',c=>{if(!live()||!this.room){c.close();return;}this.accept(c,live);});
      peer.on('open',()=>{
        if(!live())return;
        try{
        if(this.timer)return; // signaling reconnection is not a new room or membership.
        if(joining){this.host=joining.room;this.join(peer.connect(joining.room,{serialization:'raw',reliable:true}),joining,name,live);}
        else{
          this.room=new HostRoom({id,key:secret(),name,now:this.now});this.host=id;
          this.onSpawn(structuredClone(WORLD.vessels['atlas-open-water-bay'].spawns[0]));
          this.link=inviteURL(this.base,id,this.room.key);clearTimeout(this.timeout);
          this.publish('hosting','Room ready · keep this host tab open',1);
        }
        this.timer=setInterval(()=>{if(live())this.tick();},this.tickMs);
        }catch(e){this.fail(e.message);}
      });
    }catch(e){if(live())this.fail(e.message);}
  }
  accept(c,live){
    if(this.connections.size>=12||this.connections.has(c.peer)){c.close();return;}
    this.connections.set(c.peer,{c,joined:false});const wait=setTimeout(()=>c.close(),8000);
    c.on('data',raw=>{
      if(!live())return;
      try{
        const m=parseMessage(raw,4096),entry=this.connections.get(c.peer);if(!entry)return;
        if(!entry.joined){const welcome=this.room.add(c.peer,m);entry.joined=true;clearTimeout(wait);this.send(c,welcome);this.publish('hosting','Room live · keep this host tab open',this.room.players.size);}
        else if(m.type==='leave'){c.close();}
        else this.room.update(c.peer,m);
      }catch(e){this.send(c,{v:VERSION,type:'error',code:friendly[e.message]?e.message:'BAD_MESSAGE'});c.close();}
    });
    const cleanup=()=>{clearTimeout(wait);if(!live())return;this.connections.delete(c.peer);this.room?.remove(c.peer);if(this.room)this.publish('hosting','Room ready · keep this host tab open',this.room.players.size);};
    c.on('close',cleanup);c.on('error',()=>{c.close();cleanup();});
  }
  join(c,invite,name,live){
    this.connections.set(c.peer,{c,joined:false});
    c.on('open',()=>{if(live())this.send(c,{v:VERSION,type:'hello',key:invite.key,name,world:WORLD.worldRevision});});
    c.on('data',raw=>{
      if(!live())return;
      try{
        const m=parseMessage(raw);
        if(m.type==='error')throw Error(m.code);if(m.type==='leave')throw Error('HOST_LEFT');
        const entry=this.connections.get(c.peer);
        if(!entry.joined){
          if(m.type!=='welcome'||m.id!==this.id||m.host!==this.host||m.world!==WORLD.worldRevision||!Number.isInteger(m.slot)||m.slot<1||m.slot>7||JSON.stringify(m.spawn)!==JSON.stringify(WORLD.vessels['atlas-open-water-bay'].spawns[m.slot]))throw Error('BAD_WELCOME');
          this.onSpawn(m.spawn);entry.joined=true;this.lastSnapshotAt=this.now();clearTimeout(this.timeout);this.publish('connected','Connected to host',2);
        }else{
          const snapshot=checkedSnapshot(m,{host:this.host,self:this.id,previousSerial:this.serial});this.serial=snapshot.serial;
          this.offset=snapshot.serverTime-this.now();this.lastSnapshotAt=this.now();this.buffer.ingest(snapshot,this.id);
          this.publish('connected','Connected to host',snapshot.players.length);
        }
      }catch(e){this.fail(e.message);}
    });
    c.on('close',()=>{if(live())this.fail('HOST_LEFT');});c.on('error',()=>{if(live())this.fail('CONNECT_TIMEOUT');});
  }
  tick(){
    try{
      const m={v:VERSION,type:'state',seq:this.seq++,sample:this.read()};
      if(this.room){
        this.room.update(this.id,m);const s=this.room.snapshot();this.lastSnapshotAt=this.now();this.offset=0;this.buffer.ingest(s,this.id);
        for(const {c,joined} of this.connections.values())if(joined)this.send(c,s);
      }else{
        const entry=this.connections.get(this.host);if(entry?.joined)this.send(entry.c,m);
        if(this.info.state==='connected'&&this.lastSnapshotAt&&this.now()-this.lastSnapshotAt>3500)this.publish('stale','Host updates stopped · keep both tabs visible',this.info.players);
      }
    }catch(e){this.fail(e.message);}
  }
  remotes(){return this.buffer.sample(this.now()+this.offset,this.info.state==='hosting'||this.info.state==='connected');}
  fail(code){const message=friendly[code]||'Room connection failed. Solo remains available; create or rejoin a room.';this.leave(false);this.publish('error',message,1);}
  leave(notify=true){
    this.generation++;clearInterval(this.timer);clearTimeout(this.timeout);this.timer=null;this.timeout=null;
    const peers=[...this.connections.values()];this.connections.clear();this.room=null;this.host=null;this.link='';this.buffer.clear();
    for(const {c} of peers){try{this.send(c,{v:VERSION,type:'leave'});c.close();}catch{}}
    if(this.peer){try{this.peer.destroy();}catch{}this.peer=null;}
    this.lastSnapshotAt=0;this.serial=-1;this.info={state:'solo',players:1,message:'Solo sailing'};if(notify)this.publish('solo','Solo sailing',1);
  }
}
