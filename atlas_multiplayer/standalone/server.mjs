import {pathToFileURL} from 'node:url';
import {createMultiplayerServer} from '../server.mjs';
import {createStaticHandler} from './http.mjs';
import {WORLD} from './world.mjs';
export function productionOrigin(env){
  const origin=env.PUBLIC_ORIGIN||(env.RAILWAY_PUBLIC_DOMAIN?`https://${env.RAILWAY_PUBLIC_DOMAIN}`:env.RENDER_EXTERNAL_URL);
  if(!origin)throw Error('PUBLIC_ORIGIN_REQUIRED');
  const u=new URL(origin);
  if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw Error('EXACT_HTTPS_ORIGIN_REQUIRED');
  return origin;
}
export function createStandaloneServer({origin='http://127.0.0.1:8080'}={}){
  return createMultiplayerServer({origins:[origin],maxConnections:64,roomOptions:{world:WORLD,maxRooms:16},httpHandler:createStaticHandler()});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.PORT||8080);if(!Number.isInteger(port)||port<1||port>65535)throw Error('BAD_PORT');
  const prod=process.env.NODE_ENV==='production';
  const app=createStandaloneServer({origin:prod?productionOrigin(process.env):`http://127.0.0.1:${port}`});
  app.server.listen(port,prod?'0.0.0.0':'127.0.0.1',()=>console.log(`Atlas D Open Water listening on ${port}; standalone cooperative, not SeaLab`));
  for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>app.stop().then(()=>process.exit(0),()=>process.exit(1)));
}
