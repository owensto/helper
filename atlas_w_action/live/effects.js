/* Bounded fictional game VFX: fire, smoke, spray, fragments and pressure rings.
   Particles use game-time animation; nothing describes real explosives. */
(function(G){'use strict';
function create(T,scene,{capacity=640}={}){
 capacity=Math.max(64,Math.min(900,Math.floor(capacity)));let serial=0,disposed=false,lastTime=0;
 const pos=new Float32Array(capacity*3),col=new Float32Array(capacity*3),sizes=new Float32Array(capacity),alphas=new Float32Array(capacity);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(pos,3));geometry.setAttribute('tint',new T.BufferAttribute(col,3));geometry.setAttribute('size',new T.BufferAttribute(sizes,1));geometry.setAttribute('alpha',new T.BufferAttribute(alphas,1));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{scale:{value:480}},vertexShader:'attribute vec3 tint;attribute float size,alpha;varying vec3 c;varying float a;uniform float scale;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*scale/max(1.,-p.z),1.,160.);c=tint;a=alpha;}',fragmentShader:'varying vec3 c;varying float a;void main(){vec2 q=gl_PointCoord*2.-1.;float r=length(q);float edge=1.-smoothstep(.48,1.,r);float n=.87+.13*sin(q.x*17.+q.y*9.)*sin(q.y*23.-q.x*7.);if(r>1.||a<.001)discard;gl_FragColor=vec4(c,edge*n*a);#include <tonemapping_fragment>\n#include <colorspace_fragment>}' .replace(';#include',';\n#include')});
 const points=new T.Points(geometry,material);points.name='ATLAS_GAME_EXPLOSION_PARTICLES';points.frustumCulled=false;scene.add(points);
 const particles=Array(capacity).fill(null);let cursor=0;
 const fragmentGeometry=new T.BoxGeometry(.8,.55,1.1),fragmentMaterial=new T.MeshStandardMaterial({color:0x4c5558,roughness:.85});
 const debris=new T.InstancedMesh(fragmentGeometry,fragmentMaterial,48);debris.name='ATLAS_GAME_DEBRIS';debris.frustumCulled=false;debris.count=0;scene.add(debris);
 const fragments=[];const rings=[];const ringGeo=new T.RingGeometry(.94,1,56);
 for(let i=0;i<8;i++){const mat=new T.MeshBasicMaterial({color:0xe4f0ed,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false});const mesh=new T.Mesh(ringGeo,mat);mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);rings.push({mesh,born:-100,life:2,p:{x:0,y:0,z:0}});}
 const light=new T.PointLight(0xffb458,0,90,2);scene.add(light);let pulse=-100;
 function random(){let x=Math.imul(++serial,0x45d9f3b);x^=x>>>16;x=Math.imul(x,0x45d9f3b);x^=x>>>16;return (x>>>0)/4294967296;}
 function emit(p,v,t,life,size,color,kind){particles[cursor]={p:{...p},v,born:t,life,size,color,kind};cursor=(cursor+1)%capacity;}
 function ring(p,t,life=2.5){const r=rings.reduce((a,b)=>a.born<b.born?a:b);r.p={...p};r.born=t;r.life=life;}
 function muzzle(p,t){if(disposed)return;for(let i=0;i<7;i++)emit(p,{x:(random()-.5)*3,y:2+random()*3,z:(random()-.5)*3},t,.7+random()*.6,1.4,[.38,.4,.42],'smoke');light.position.set(p.x,p.y,p.z);pulse=t;}
 function impact(p,kind,t){
  if(disposed)return;const water=kind==='water';ring({x:p.x,y:water?p.y+.12:0.16,z:p.z},t);light.position.set(p.x,p.y+4,p.z);pulse=t;
  // An expanding luminous core, rising dark smoke, and ballistic spray/fragments.
  for(let i=0;i<(water?30:45);i++){const a=random()*Math.PI*2,r=Math.sqrt(random()),v=water?{x:Math.cos(a)*r*14,y:10+random()*20,z:Math.sin(a)*r*14}:{x:Math.cos(a)*r*19,y:5+random()*16,z:Math.sin(a)*r*19};emit(p,v,t,water?1.2+random():.45+random()*.6,water?1.7:5,water?[.83,.93,.97]:[2.5,1.0,.12],water?'spray':'fire');}
  if(!water){
   for(let i=0;i<28;i++)emit(p,{x:(random()-.5)*9,y:4+random()*7,z:(random()-.5)*9},t,2.6+random()*2.6,6+random()*4,[.18,.2,.23],'smoke');
   for(let i=0;i<14;i++){if(fragments.length>=48)fragments.shift();fragments.push({p:{...p},v:{x:(random()-.5)*36,y:9+random()*19,z:(random()-.5)*36},born:t,life:3.5,spin:random()*5,scale:.7+random()*1.4});}
  }
 }
 const transform=new T.Object3D();
 function update(time,height=720){
  if(disposed)return;if(!Number.isFinite(time))throw Error('INVALID_EFFECT_TIME');lastTime=time;material.uniforms.scale.value=Math.min(1200,Math.max(200,height));let count=0;
  for(let i=0;i<capacity;i++){const p=particles[i];if(!p)continue;const age=time-p.born;if(age<0||age>p.life){particles[i]=null;continue;}const n=age/p.life,k=count*3;pos[k]=p.p.x+p.v.x*age;pos[k+1]=p.p.y+p.v.y*age-(p.kind==='spray'?4.905*age*age:0);pos[k+2]=p.p.z+p.v.z*age;
   const fire=p.kind==='fire',fade=1-n;col[k]=p.color[0]*(fire?1-.6*n:1);col[k+1]=p.color[1]*(fire?1-.85*n:1);col[k+2]=p.color[2];sizes[count]=p.size*(1+n*(p.kind==='smoke'?2.2:fire?1.4:.6));alphas[count]=fade*(fire?.95:p.kind==='smoke'?.6:.85);count++;}
  geometry.setDrawRange(0,count);for(const a of Object.values(geometry.attributes))a.needsUpdate=true;
  let nf=0;for(let i=fragments.length-1;i>=0;i--){const f=fragments[i],a=time-f.born;if(a>f.life||a<0){fragments.splice(i,1);continue;}const y=f.p.y+f.v.y*a-4.905*a*a;if(y<-.5){fragments.splice(i,1);continue;}transform.position.set(f.p.x+f.v.x*a,y,f.p.z+f.v.z*a);transform.rotation.set(a*f.spin,a*.7,a*1.7);transform.scale.setScalar(f.scale);transform.updateMatrix();debris.setMatrixAt(nf++,transform.matrix);}debris.count=nf;debris.instanceMatrix.needsUpdate=true;
  for(const r of rings){const a=time-r.born;r.mesh.visible=a>=0&&a<r.life;r.mesh.position.set(r.p.x,r.p.y,r.p.z);r.mesh.scale.setScalar(Math.max(.01,2+a*25));r.mesh.material.opacity=Math.max(0,.5*(1-a/r.life));}
  const age=time-pulse;light.intensity=age>=0&&age<.3?140*(1-age/.3):0;
 }
 function clear(){particles.fill(null);fragments.length=0;geometry.setDrawRange(0,0);debris.count=0;for(const r of rings){r.born=-100;r.mesh.visible=false;}light.intensity=0;pulse=-100;}
 return {muzzle,impact,update,clear,inspect:()=>({capacity,active:particles.filter(Boolean).length,debris:fragments.length,rings:rings.filter(r=>r.mesh.visible).length,light:light.intensity,time:lastTime}),dispose(){if(disposed)return;disposed=true;clear();points.removeFromParent();debris.removeFromParent();light.removeFromParent();geometry.dispose();material.dispose();fragmentGeometry.dispose();fragmentMaterial.dispose();for(const r of rings){r.mesh.removeFromParent();r.mesh.material.dispose();}ringGeo.dispose();}};
}
G.AtlasActionFX={create};if(typeof module!=='undefined')module.exports=G.AtlasActionFX;
})(globalThis);
