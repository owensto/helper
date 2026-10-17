// LOCAL TEST DRIVER ONLY. Not served by HTTP or used by production entry.
import {createStandaloneServer} from '../server.mjs';import {createInterface} from 'node:readline';
const port=Number(process.env.TEST_PORT||8080),origin=`http://127.0.0.1:${port}`;
const app=createStandaloneServer({origin}),upgrades=[];
app.server.prependListener('upgrade',(_req,socket)=>upgrades.push(socket));
app.server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({ready:true,origin})));
const input=createInterface({input:process.stdin});
input.on('line',line=>{try{const m=JSON.parse(line);if(Number.isInteger(m.drop)&&m.drop>=0)upgrades[m.drop]?.destroy();}catch{}});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.stop().then(()=>process.exit(0)));
