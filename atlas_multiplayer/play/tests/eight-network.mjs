/** Test transport only. No browser, cloud or WebRTC is emulated as passed. */
import {EventEmitter} from 'node:events';
export const settle=async(n=8)=>{for(let i=0;i<n;i++)await new Promise(r=>setImmediate(r));};
export function memoryNetwork(){
  const peers=new Map(),metrics={messages:0,bytes:0,maxPacket:0};
  class Channel extends EventEmitter {
    constructor(peer){super();this.peer=peer;this.open=false;this.dataChannel={bufferedAmount:0};this.bufferSize=0;this.drop=false;}
    send(data){if(this.throwSend)throw Error('injected send failure');if(!this.open)throw Error('closed');metrics.messages++;metrics.bytes+=Buffer.byteLength(data);metrics.maxPacket=Math.max(metrics.maxPacket,Buffer.byteLength(data));if(!this.drop)setImmediate(()=>{if(this.other.open)this.other.emit('data',data);});}
    close(){if(this.closed)return;this.closed=true;this.open=false;setImmediate(()=>this.emit('close'));const b=this.other;if(b&&!b.closed){b.closed=true;b.open=false;setImmediate(()=>b.emit('close'));}}
  }
  class Peer extends EventEmitter {
    constructor(id){super();this.id=id;this.channels=[];this.destroyed=false;this.disconnected=false;peers.set(id,this);setImmediate(()=>this.emit('open',id));}
    connect(id){const a=new Channel(id),target=peers.get(id);this.channels.push(a);if(!target){setImmediate(()=>this.emit('error',{type:'peer-unavailable',peer:id}));return a;}
      const b=new Channel(this.id);a.other=b;b.other=a;target.channels.push(b);setImmediate(()=>{if(this.destroyed||target.destroyed)return a.close();target.emit('connection',b);a.open=b.open=true;b.emit('open');a.emit('open');});return a;}
    reconnect(){this.disconnected=false;setImmediate(()=>this.emit('open',this.id));}
    destroy(){if(this.destroyed)return;this.destroyed=true;peers.delete(this.id);for(const c of this.channels)c.close();setImmediate(()=>this.emit('close'));}
  }
  return {factory:async id=>new Peer(id),peers,metrics};
}
