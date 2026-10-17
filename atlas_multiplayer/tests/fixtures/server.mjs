/** Loopback-only test driver. Not included in the production Docker image. */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import readline from 'node:readline';
import {once} from 'node:events';
import {createMultiplayerServer} from '../../server.mjs';
import {FIXTURE_WORLD} from './world.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));let endpoint;
const allowed=new Set(['tests/fixtures/index.html','tests/fixtures/fixture.css','tests/fixtures/app.mjs','tests/fixtures/host.mjs',
  'tests/fixtures/world.mjs','client/core-adapter.mjs','client/room-client.mjs','client/invite.mjs',
  'client/interpolation.mjs','client/invite-controls.mjs','client/invite-controls.css','shared/world.mjs']);
const frontend=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://127.0.0.1').pathname.slice(1);
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  if(path==='tests/fixtures/config.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(`export const endpoint=${JSON.stringify(endpoint)};`);return;}
  if(req.method!=='GET'||!allowed.has(path)){res.writeHead(404);res.end('Not found');return;}
  try{const data=await readFile(resolve(root,path));res.writeHead(200,{'Content-Type':{'.html':'text/html','.css':'text/css','.mjs':'text/javascript'}[extname(path)]});res.end(data);}
  catch{res.writeHead(404);res.end('Not found');}
});
frontend.listen(0,'127.0.0.1');await once(frontend,'listening');
const origin=`http://127.0.0.1:${frontend.address().port}`;
const app=createMultiplayerServer({origins:[origin],roomOptions:{world:FIXTURE_WORLD,allowFixture:true}});
const sockets=[];app.server.on('connection',socket=>sockets.push(socket));
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');endpoint=`ws://127.0.0.1:${app.server.address().port}/ws`;
console.log(JSON.stringify({origin,endpoint,url:origin+'/tests/fixtures/index.html',fixture:true}));
let stopped=false;
async function stop(){if(stopped)return;stopped=true;await app.stop();await new Promise(r=>{frontend.close(r);frontend.closeAllConnections();});process.exit(0);}
// Test driver can abruptly drop a real TCP connection; no production debug HTTP API exists.
readline.createInterface({input:process.stdin}).on('line',line=>{
  const command=JSON.parse(line);
  if(command.type==='drop')sockets[command.index]?.destroy();
  else if(command.type==='stop')stop();
});
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,stop);
