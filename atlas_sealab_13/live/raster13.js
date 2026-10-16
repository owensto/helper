/* Shared visual-only depth raster builder. Does not move the boat or cache physics poses. */
(function(G){'use strict';
const rgb=(hex)=>{const n=parseInt(hex.slice(1),16);return[n>>16,(n>>8)&255,n&255].map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});};
const dry=rgb('#a7aa77'),shallow=rgb('#c1ba87'),deep=rgb('#718477');
G.Sea13Raster={create(req){
 const{kind,width,height}=req;if(!['terrain','map'].includes(kind)||!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>20000||![req.x,req.z,req.spanX,req.spanZ].every(Number.isFinite))throw Error('Invalid visual raster request');
 function normalsFor(h){const n=new Float32Array(width*height*3),sx=req.spanX/(width-1),sz=req.spanZ/(height-1);function tri(a,b,c){const ax=(a%width-b%width)*sx,ay=h[a]-h[b],az=(Math.floor(a/width)-Math.floor(b/width))*sz,cx=(c%width-b%width)*sx,cy=h[c]-h[b],cz=(Math.floor(c/width)-Math.floor(b/width))*sz,x=cy*az-cz*ay,y=cz*ax-cx*az,z=cx*ay-cy*ax;for(const i of[a,b,c]){n[i*3]+=x;n[i*3+1]+=y;n[i*3+2]+=z;}}for(let y=0;y<height-1;y++)for(let x=0;x<width-1;x++){const a=y*width+x,b=a+width,c=b+1,d=a+1;tri(a,b,d);tri(b,c,d);}for(let i=0;i<n.length;i+=3){const len=Math.hypot(n[i],n[i+1],n[i+2])||1;n[i]/=len;n[i+1]/=len;n[i+2]/=len;}return n;}
 const heights=kind==='terrain'?new Float32Array(width*height):null,colors=heights?new Float32Array(width*height*3):null,pixels=new Uint8ClampedArray(width*height*4);let next=0,known=0;
 return {runRows(rows){let end=Math.min(height,next+rows);for(;next<end;next++){const iy=next;for(let ix=0;ix<width;ix++){
 const x=req.x+(ix/(kind==='terrain'?width-1:width)-.5)*req.spanX,z=req.z+((kind==='terrain'?iy/(height-1)-.5:iy/height-.5))*req.spanZ;
 const q=G.Sea09World.sample(x,z,req.location),i=iy*width+ix;if(q.known)known++;
 if(kind==='terrain'){
  const y=q.known?q.bed:-64;heights[i]=y-.015;const base=y>0?dry:y>-2.5?shallow:deep,n=.91+.09*(.5+.5*Math.sin(x*.31)*Math.sin(z*.37));for(let k=0;k<3;k++)colors[i*3+k]=base[k]*n;
  // Same bottom encoding/range as the retained optical shader, rows inverted for canvas UV.
  const pi=(iy*width+ix)*4,v=Math.round(Math.max(0,Math.min(1,(heights[i]+64)/128))*65535);pixels[pi]=v>>8;pixels[pi+1]=v&255;pixels[pi+2]=q.known?255:0;pixels[pi+3]=255;
 }else{const d=q.depth,col=!q.known?[31,46,58]:d<0?[190,188,143]:d<.8?[167,209,187]:d<2?[99,176,165]:d<4?[41,123,137]:[23,76,98];pixels.set([...col,255],i*4);}
 }}return next===height;},result(){return{...req,heights,colors,pixels,known,normals:heights?normalsFor(heights):null,minHeight:heights?heights.reduce((a,b)=>Math.min(a,b),Infinity):null,maxHeight:heights?heights.reduce((a,b)=>Math.max(a,b),-Infinity):null};}};
}};
})(typeof self!=='undefined'?self:globalThis);
