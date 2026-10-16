/* Browser worker: bounded visual sampling only, same source bathymetry as main-thread contact. */
'use strict';importScripts('geography.js','world09.js','raster13.js');
let queue=[],busy=false;
self.onmessage=e=>{const r=e.data;if(!r||!['terrain','map'].includes(r.kind))return;queue.push(r);pump();};
async function pump(){if(busy)return;busy=true;await BayGeo.promise;
 while(queue.length){const r=queue.shift(),start=performance.now();try{const task=Sea13Raster.create(r);task.runRows(r.height);const o=task.result();o.elapsedMs=performance.now()-start;const transfers=[o.pixels.buffer];if(o.heights)transfers.push(o.heights.buffer,o.colors.buffer);postMessage(o,transfers);}catch(e){postMessage({id:r.id,key:r.key,kind:r.kind,error:String(e)});}}
 busy=false;
}
