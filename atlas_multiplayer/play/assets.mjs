/** Explicit startup stages. Asset failure must never remove working chart-mode gameplay. */
export function loadScript(src,{test,timeout=15000,document:doc=globalThis.document}={}){
  if(test?.())return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const s=doc.createElement('script');let finished=false;
    const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);s.onload=s.onerror=null;if(error){s.remove();reject(error);}else resolve();};
    const timer=setTimeout(()=>finish(Error('SCRIPT_TIMEOUT')),timeout);
    s.src=src;s.async=true;s.crossOrigin='anonymous';s.onload=()=>finish(test&&!test()?Error('SCRIPT_EXPORT_MISSING'):null);s.onerror=()=>finish(Error('SCRIPT_DOWNLOAD_FAILED'));doc.head.append(s);
  });
}
export async function fetchGLB(url,{fetcher=fetch,timeout=20000,expectedSHA='b1ef9c448309a9a5d85ec4f2efcf45d9406d999ab24d27bdd1534359a7278b82'}={}){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout);
  try{
    const response=await fetcher(url,{signal:abort.signal,cache:'default'});if(!response.ok)throw Error(`MODEL_HTTP_${response.status}`);
    const bytes=await response.arrayBuffer();const v=new DataView(bytes);
    if(bytes.byteLength<20||v.getUint32(0,true)!==0x46546c67)throw Error('MODEL_RESPONSE_NOT_GLB');
    if(v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.byteLength)throw Error('MODEL_TRUNCATED');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(hash!==expectedSHA)throw Error('MODEL_INTEGRITY_MISMATCH');return bytes;
  }catch(e){if(e.name==='AbortError')throw Error('MODEL_DOWNLOAD_TIMEOUT');throw e;}finally{clearTimeout(timer);}
}
export async function loadOriginalBoat(T,{onStatus=()=>{},fetcher=fetch}={}){
  const paths=[new URL('../standalone/public/assets/boat.glb',import.meta.url).href,'https://rawcdn.githack.com/owensto/helper/a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff/atlas_sealab_12/live/assets/ATLAS_Bay_Play.glb'];
  let failure;
  for(const path of paths){try{onStatus('Downloading original boat');const bytes=await fetchGLB(path,{fetcher});onStatus('Decoding original boat');return await new T.GLTFLoader().parseAsync(bytes,new URL('.',path).href);}catch(e){failure=e;}}
  throw failure||Error('MODEL_UNAVAILABLE');
}
export function describeFailure(stage,error){const raw=String(error?.message||error||'Unknown error').replace(/https?:\/\/\S+/g,'[resource]').slice(0,180);return `${stage}: ${raw}. Chart view is still playable.`;}
