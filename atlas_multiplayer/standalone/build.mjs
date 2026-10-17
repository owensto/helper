/** Package only the standalone application. No SeaLab tests, host hooks or secrets. */
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'dist-standalone');
const sources=['package.json','server.mjs','rooms.mjs','shared/world.mjs',
 ...['core-adapter.mjs','room-client.mjs','interpolation.mjs','invite.mjs','invite-controls.mjs','invite-controls.css'].map(x=>'client/'+x),
 ...['server.mjs','http.mjs','world.mjs','controller.mjs','host.mjs','README.md'].map(x=>'standalone/'+x),
 ...['index.html','app.mjs','style.css','assets/runtime.js','assets/boat.glb','assets/LICENSES.txt'].map(x=>'standalone/public/'+x)];
if(existsSync(resolve(root,'package-lock.json')))sources.push('package-lock.json');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});const hashes={};
for(const name of sources){const from=resolve(root,name),to=resolve(out,name);mkdirSync(dirname(to),{recursive:true});copyFileSync(from,to);hashes[name]=createHash('sha256').update(readFileSync(from)).digest('hex');}
writeFileSync(resolve(out,'ASSET-MANIFEST.json'),JSON.stringify(hashes,null,2)+'\n');
writeFileSync(resolve(out,'RELEASE-STATUS.json'),JSON.stringify({app:'Atlas D Open Water',seaLabIntegrated:false,lockfileIncluded:sources.includes('package-lock.json'),browserAcceptance:'NOT_VERIFIED',publicDeployment:'NOT_DEPLOYED'},null,2)+'\n');
console.log(JSON.stringify({out,files:sources.length,lockfileIncluded:sources.includes('package-lock.json'),seaLabDependency:false}));
