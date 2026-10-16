"""Measured final pass: cheaper visual commits, clearer fair-weather coast, same physics."""
from pathlib import Path
r=Path(__file__).resolve().parent;site=r/'site'
import os
site=Path(os.environ.get('SEA_SITE',site))
def patch(path,old,new):
 p=site/path;s=p.read_text();assert s.count(old)==1,(path,old[:60],s.count(old));p.write_text(s.replace(old,new))
patch('raster13.js','const heights=kind', '''function normalsFor(h){const n=new Float32Array(width*height*3),sx=req.spanX/(width-1),sz=req.spanZ/(height-1);function tri(a,b,c){const ax=(a%width-b%width)*sx,ay=h[a]-h[b],az=(Math.floor(a/width)-Math.floor(b/width))*sz,cx=(c%width-b%width)*sx,cy=h[c]-h[b],cz=(Math.floor(c/width)-Math.floor(b/width))*sz,x=cy*az-cz*ay,y=cz*ax-cx*az,z=cx*ay-cy*ax;for(const i of[a,b,c]){n[i*3]+=x;n[i*3+1]+=y;n[i*3+2]+=z;}}for(let y=0;y<height-1;y++)for(let x=0;x<width-1;x++){const a=y*width+x,b=a+width,c=b+1,d=a+1;tri(a,b,d);tri(b,c,d);}for(let i=0;i<n.length;i+=3){const len=Math.hypot(n[i],n[i+1],n[i+2])||1;n[i]/=len;n[i+1]/=len;n[i+2]/=len;}return n;}
 const heights=kind''')
patch('raster13.js','return{...req,heights,colors,pixels,known};','return{...req,heights,colors,pixels,known,normals:heights?normalsFor(heights):null,minHeight:heights?heights.reduce((a,b)=>Math.min(a,b),Infinity):null,maxHeight:heights?heights.reduce((a,b)=>Math.max(a,b),-Infinity):null};')
patch('depth-worker13.js','transfers.push(o.heights.buffer,o.colors.buffer);','transfers.push(o.heights.buffer,o.colors.buffer,o.normals.buffer);')
patch('stream13.js','pixels:new Uint8ClampedArray(b,count*16,count*4)','pixels:new Uint8ClampedArray(b,count*16,count*4),normals:new Float32Array(b,count*20,count*3)')
patch('stream13.js','g.computeVertexNormals();g.computeBoundingSphere();','g.attributes.normal.array.set(r.normals);g.attributes.normal.needsUpdate=true;if(!g.boundingSphere)g.boundingSphere=new T.Sphere();g.boundingSphere.center.set(0,(r.minHeight+r.maxHeight)*.5,0);g.boundingSphere.radius=Math.hypot(256,256,(r.maxHeight-r.minHeight)*.5);')
patch('operations10.js','A.scene.fog.density=w.fog;','A.scene.fog.density=w.fog*(S.location===\'beaufort\'&&w.rain<.15&&w.cloud<.5?.55:1);')
patch('water12.js','if(!quality||performance.now()-lastReflection13<125||','if(!quality||++frame%4!==0||performance.now()-lastReflection13<125||')
print('Visual normals/bounds move off main thread; fair-weather coast haze and reflection scheduling refined')
