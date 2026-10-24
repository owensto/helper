import {readFileSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {WORLD} from './world.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');
const client=['core-adapter.mjs','room-client.mjs','interpolation.mjs','invite.mjs','invite-controls.mjs','invite-controls.css'];
const routes={
  '/':'standalone/public/index.html','/index.html':'standalone/public/index.html',
  '/app.mjs':'standalone/public/app.mjs','/style.css':'standalone/public/style.css',
  '/world.mjs':'standalone/world.mjs','/controller.mjs':'standalone/controller.mjs','/host.mjs':'standalone/host.mjs',
  '/shared/world.mjs':'shared/world.mjs','/assets/runtime.js':'standalone/public/assets/runtime.js',
  '/assets/boat.glb':'standalone/public/assets/boat.glb','/assets/LICENSES.txt':'standalone/public/assets/LICENSES.txt',
  ...Object.fromEntries(client.map(f=>['/client/'+f,'client/'+f]))
};
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8'};
export function createStaticHandler(){
  // Exact allowlist; no arbitrary repository/test-file serving or path traversal.
  const files=new Map(Object.entries(routes).map(([url,path])=>{const bytes=readFileSync(resolve(root,path));return [url,{bytes,type:types[extname(path)],etag:'"'+createHash('sha256').update(bytes).digest('hex')+'"'}];}));
  return (req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
    let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end();return;}
    if(path==='/api/config'){
      const body=JSON.stringify({application:'Atlas D Open Water',world:WORLD,release:'standalone-1',multiplayer:'cooperative-client-owned',seaLabIntegrated:false});
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);return;
    }
    const f=files.get(path);if(!f){res.writeHead(404);res.end('Not found');return;}
    res.setHeader('Content-Type',f.type);res.setHeader('ETag',f.etag);res.setHeader('Cache-Control',path.startsWith('/assets/')?'public, max-age=3600, must-revalidate':'no-cache');
    if(req.headers['if-none-match']===f.etag){res.writeHead(304);res.end();return;}
    res.writeHead(200,{'Content-Length':f.bytes.length});res.end(req.method==='HEAD'?undefined:f.bytes);
  };
}
