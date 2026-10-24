/** Actual loopback TCP sockets under Node; NOT WebRTC, public signaling or browsers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {EventEmitter} from 'node:events';
import {PeerRoom} from '../peer-room.mjs';
import {BoatController} from '../../standalone/controller.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=4000){const stop=performance.now()+ms;while(!fn()&&performance.now()<stop)await sleep(10);assert.ok(fn(),'TCP condition timed out');}
function tcpNetwork(){
  const registry=new Map(),metrics={frames:0,bytes:0,maxBytes:0};
  class Channel extends EventEmitter {
    constructor(socket,peer){super();this.peer=peer;this.socket=socket;this.open=false;this.bufferSize=0;this.dataChannel={get bufferedAmount(){return socket.writableLength;}};socket.on('error',()=>this.emit('error',Error('socket error')));socket.on('close',()=>{this.open=false;this.emit('close');});}
    send(raw){if(!this.open)throw Error('closed socket');metrics.frames++;metrics.bytes+=Buffer.byteLength(raw);metrics.maxBytes=Math.max(metrics.maxBytes,Buffer.byteLength(raw));this.socket.write(raw+'\n');}
    close(){this.open=false;this.socket.destroy();}
  }
  class Peer extends EventEmitter {
    constructor(id){super();this.id=id;this.channels=[];this.destroyed=false;this.disconnected=false;this.server=net.createServer(s=>this.accept(s));}
    accept(socket){socket.setNoDelay(true);let buffer='',channel=null;socket.on('data',data=>{buffer+=data.toString();if(buffer.length>100000)return socket.destroy();let k;while((k=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,k);buffer=buffer.slice(k+1);if(!channel){channel=new Channel(socket,line);this.channels.push(channel);channel.open=true;this.emit('connection',channel);channel.emit('open');socket.write('ACK\n');}else channel.emit('data',line);}});socket.on('error',()=>{});}
    connect(id){const remote=registry.get(id);if(!remote){setImmediate(()=>this.emit('error',{type:'peer-unavailable'}));const c=new EventEmitter();c.peer=id;c.open=false;c.close=()=>{};return c;}
      const s=net.connect(remote.server.address().port,'127.0.0.1'),c=new Channel(s,id);this.channels.push(c);s.setNoDelay(true);let buffer='';s.on('connect',()=>s.write(this.id+'\n'));s.on('data',data=>{buffer+=data.toString();let k;while((k=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,k);buffer=buffer.slice(k+1);if(!c.open){assert.equal(line,'ACK');c.open=true;c.emit('open');}else c.emit('data',line);}});return c;}
    reconnect(){this.disconnected=false;setImmediate(()=>this.emit('open',this.id));}
    destroy(){if(this.destroyed)return;this.destroyed=true;registry.delete(this.id);this.channels.forEach(c=>c.close());this.server.close();this.emit('close');}
  }
  return {metrics,factory:async id=>{const p=new Peer(id);await new Promise(r=>p.server.listen(0,'127.0.0.1',r));registry.set(id,p);setImmediate(()=>p.emit('open',id));return p;}};
}

test('eight real TCP clients: 56 moving remote views, ninth refusal and same-boat reconnect',async()=>{
  const network=tcpNetwork(),all=[];let simTimer;
  function make(){const boat=new BoatController();let spawns=0;const room=new PeerRoom({read:()=>boat.sample(),onSpawn:p=>{boat.place(p);spawns++;},onResume:()=>boat.input(),peerFactory:network.factory});const entry={boat,room,spawns:()=>spawns};all.push(entry);return entry;}
  try{
    const host=make();await host.room.start({name:'Owen'});await until(()=>!!host.room.link);
    for(let n=1;n<8;n++){const g=make();await g.room.start({name:'Crew '+n,invite:host.room.link});}
    await until(()=>all.every(x=>x.room.info.connected===8));const admitted=all.slice();
    const initial=admitted.map(x=>x.boat.x);simTimer=setInterval(()=>{for(const x of admitted){x.boat.engine=true;x.boat.input({throttle:.8,steer:.12});x.boat.step(1/60);}},1000/60);
    await sleep(2000);await until(()=>admitted.every(x=>x.room.remotes().length===7&&x.room.remotes().every(r=>!r.stale)));
    for(const [i,x] of admitted.entries()){assert.ok(x.boat.x>initial[i]+1);for(const other of x.room.remotes()){const target=admitted.find(a=>a.room.id===other.id);assert.ok(Math.hypot(other.pose.p[0]-target.boat.x,other.pose.p[2]-target.boat.z)<3);}}
    const ninth=make();await ninth.room.start({name:'Ninth',invite:host.room.link});await until(()=>ninth.room.info.state==='error');assert.match(ninth.room.info.message,/eight/);assert.equal(host.room.room.players.size,8);
    const guest=admitted[3],identity=guest.room.id,slot=guest.room.slot;guest.room.connections.get(host.room.id).c.close();await until(()=>guest.room.info.state==='reconnecting');await until(()=>guest.room.info.state==='connected'&&guest.room.info.connected===8);assert.equal(guest.room.id,identity);assert.equal(guest.room.slot,slot);assert.equal(guest.spawns(),1);
    await until(()=>admitted.every(x=>x.room.info.connected===8));assert.ok(network.metrics.maxBytes<16384);
    console.log('EIGHT_TCP_EVIDENCE '+JSON.stringify({clients:8,remoteViews:56,ninthRejected:true,sameIdentityResumed:true,...network.metrics,scope:'native Node loopback TCP, not browser/WebRTC/cloud'}));
    // Native room leave frees a seat after control-frame flush, not after the grace timeout.
    guest.room.leave();await until(()=>host.room.info.players===7);assert.equal(guest.room.info.state,'solo');
  }finally{clearInterval(simTimer);all.forEach(x=>x.room.leave(false));await sleep(150);}
});
