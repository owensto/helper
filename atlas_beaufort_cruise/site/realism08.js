/* ATLAS Sea Lab 08. Original runtime surface treatment, hydrodynamic effects and
   instruments. These improve simulation presentation, not marine qualification. */
(()=>{'use strict';
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function install(){
 if(!window.SEA07?.ready||!window.SEA06?.inspect().waterMask)return setTimeout(install,100);
 const A=BAYPLAY,T=ATLASRuntime,S=A.state,I=CMD_INSTRUMENTS,R=ATLAS_RADIO;
 const report={release:'08',ready:false,physicalMaterials:0,sprayCapacity:192,wakeCapacity:220,marineValidated:false,liveBroadcastBundled:false};
 // Keep the original approved geometry, pivots, hatches and editable source.
 // Separate optical responses replace the uniformly plastic-looking finish.
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),d=x.createImageData(256,256);let seed=7019;
  for(let y=0;y<256;y++)for(let z=0;z<256;z++){seed=(Math.imul(seed,1664525)+1013904223)|0;let n=((seed>>>0)/4294967296-.5),v=kind==='weave'?145+22*Math.sin(y*Math.PI/2)+17*Math.sin(z*Math.PI/2)+n*20:160+n*32;
   const k=(y*256+z)*4;d.data[k]=d.data[k+1]=d.data[k+2]=v;d.data[k+3]=255;}x.putImageData(d,0,0);const tx=new T.CanvasTexture(c);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(kind==='weave'?10:6,kind==='weave'?10:6);tx.anisotropy=Math.min(8,A.renderer.capabilities.getMaxAnisotropy());return tx;}
 const weave=texture('weave'),nonslip=texture('nonslip'),replaced=new Map();
 A.model.traverse(o=>{if(!o.isMesh)return;const swap=m=>{
  if(!m||m.transparent||/screen|chart|sounder|glass|display/i.test(m.name))return m;
  const gelcoat=/EX_Hull|REPAIR0[67]|EX_Console|EX_Deck/.test(o.name)&&/white|blue|gelcoat|repair/i.test(m.name+' '+o.name)&&m.metalness<.5;
  if(gelcoat&&T.MeshPhysicalMaterial){if(replaced.has(m.uuid))return replaced.get(m.uuid);
   const n=new T.MeshPhysicalMaterial({color:m.color.clone(),map:m.map,normalMap:m.normalMap,roughness:.26,metalness:.02,clearcoat:.68,clearcoatRoughness:.16,side:m.side,envMapIntensity:.86});n.name=m.name;n.userData={...m.userData};replaced.set(m.uuid,n);report.physicalMaterials++;return n;}
  if(/fabric|upholstery|piping/.test(m.name)){m.roughness=.88;m.metalness=0;if(!m.bumpMap){m.bumpMap=weave;m.bumpScale=.00065;}m.needsUpdate=true;}
  if(/soft[ _]deck[ _]insert/.test(m.name)){m.roughness=.92;m.metalness=0;m.bumpMap=nonslip;m.bumpScale=.0008;m.needsUpdate=true;}
  if(/chrome/.test(m.name)){m.roughness=.21;m.metalness=.92;m.envMapIntensity=.8;}
  return m;};o.material=Array.isArray(o.material)?o.material.map(swap):swap(o.material);});
 A.scene.environmentIntensity=.76;A.renderer.toneMappingExposure=.98;
 const keyLight=A.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);if(keyLight){keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-9;keyLight.shadow.camera.right=9;keyLight.shadow.camera.top=9;keyLight.shadow.camera.bottom=-9;keyLight.shadow.camera.updateProjectionMatrix();if(keyLight.shadow.map){keyLight.shadow.map.dispose();keyLight.shadow.map=null;}A.renderer.shadowMap.needsUpdate=true;}
 const wm=A.coast.water.material;if(wm.normalScale)wm.normalScale.set(.47,.47);wm.roughness=.23;wm.metalness=.14;
 // Fixed-size pools, no ever-growing scene objects. Wake ages in simulation time.
 const pool=[];let cursor=0,wakeTimer=0,lastElapsed=S.elapsed,lastX=S.x,lastZ=S.z;
 const N=report.wakeCapacity,quad=new T.PlaneGeometry(1,1);quad.rotateX(-Math.PI/2);
 const fade=new T.InstancedBufferAttribute(new Float32Array(N),1);quad.setAttribute('aOpacity',fade);
 const foamMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:'attribute float aOpacity;varying vec2 uv08;varying float fade08;void main(){uv08=uv;fade08=aOpacity;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uv08;varying float fade08;void main(){vec2 p=uv08*2.-1.;float r=dot(p,p);float edge=(1.-smoothstep(.38,1.,r));float fleck=.65+.35*sin(p.x*29.+sin(p.y*14.))*sin(p.y*43.);gl_FragColor=vec4(.88,.95,.94,edge*fleck*fade08);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const wake=new T.InstancedMesh(quad,foamMaterial,N);wake.name='SEA08 Bow displacement foam';wake.frustumCulled=false;A.scene.add(wake);const dummy=new T.Object3D();
 const PN=report.sprayCapacity,pg=new T.BufferGeometry(),positions=new Float32Array(PN*3),opacities=new Float32Array(PN),sizes=new Float32Array(PN);pg.setAttribute('position',new T.BufferAttribute(positions,3));pg.setAttribute('aOpacity',new T.BufferAttribute(opacities,1));pg.setAttribute('aSize',new T.BufferAttribute(sizes,1));
 const pm=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{scale08:{value:innerHeight*.65}},vertexShader:'attribute float aOpacity;attribute float aSize;uniform float scale08;varying float alpha08;void main(){vec4 p=modelViewMatrix*vec4(position,1.);alpha08=aOpacity;gl_PointSize=clamp(aSize*scale08/max(1.,-p.z),1.,13.);gl_Position=projectionMatrix*p;}',fragmentShader:'varying float alpha08;void main(){vec2 d=gl_PointCoord-.5;float a=(1.-smoothstep(.025,.25,dot(d,d)));gl_FragColor=vec4(.94,.98,1.,a*alpha08);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const spray=new T.Points(pg,pm);spray.name='SEA08 Bow spray';spray.frustumCulled=false;A.scene.add(spray);const drops=[];let di=0;
 function rand(n){return (Math.sin(n*12.9898+78.233)*43758.5453)%1;}
 function seaY(x,z){return BayMotion.surface(x,z,S.elapsed,S.environment)+(S.location==='beaufort'?(S.config.tide||0):0);}
 function addEffects(dt){const speed=Math.hypot(S.u||0,S.v||0),h=S.heading,c=Math.cos(h),sn=Math.sin(h),forward=S.u>1.5&&!S.airborne&&A.mode()==='drive';
  wakeTimer+=dt;if(forward&&wakeTimer>.055){const batches=Math.min(6,Math.floor(wakeTimer/.055));wakeTimer%=.055;
   for(let j=0;j<batches;j++)for(const side of [-1,1]){const x=S.x+1.45*c-sn*side*1.31,z=S.z+1.45*sn+c*side*1.31;
    pool[cursor%N]={x,z,age:0,side,h,speed,life:3.8,strength:clamp((speed-1.5)/18,0,.52)};cursor++;
    if(speed>5)for(let k=0;k<2;k++){const f=Math.abs(rand(di+S.elapsed)),at=di++%PN;drops[at]={x,y:seaY(x,z)+.06,z,vx:c*speed*.13-sn*side*(.8+f*1.5),vz:sn*speed*.13+c*side*(.8+f*1.5),vy:1+Math.min(1.5,speed*.045)+f*.7,age:0,life:.36+f*.2};}
   }
  }
  for(let i=0;i<N;i++){const p=pool[i];if(!p||p.age>=p.life){dummy.scale.set(0,0,0);fade.array[i]=0;}else{p.age+=dt;const spread=p.age*(.7+p.speed*.025)*p.side,xx=p.x-Math.sin(p.h)*spread,zz=p.z+Math.cos(p.h)*spread;dummy.position.set(xx,seaY(xx,zz)+.045,zz);dummy.rotation.set(0,-p.h,0);dummy.scale.set(.65+p.age*.6,1,.30+p.age*.5);fade.array[i]=p.strength*Math.pow(Math.max(0,1-p.age/p.life),1.8);}dummy.updateMatrix();wake.setMatrixAt(i,dummy.matrix);}
  wake.instanceMatrix.needsUpdate=true;fade.needsUpdate=true;
  for(let i=0;i<PN;i++){const d=drops[i];if(!d||d.age>d.life){opacities[i]=0;continue;}d.age+=dt;d.x+=d.vx*dt;d.z+=d.vz*dt;d.y+=d.vy*dt;d.vy-=9.81*dt;positions[i*3]=d.x;positions[i*3+1]=d.y;positions[i*3+2]=d.z;opacities[i]=Math.max(0,.45*(1-d.age/d.life));sizes[i]=.035+Math.abs(rand(i))*.045;}
  for(const attr of Object.values(pg.attributes))attr.needsUpdate=true;report.wakeEmissions=cursor;report.sprayEmissions=di;
 }
 // Render-time hook runs once per app frame, including manually refreshed cameras.
 const baseBefore=SEA06.beforeRender.bind(SEA06);
 SEA06.beforeRender=()=>{baseBefore();let dt=Math.max(0,Math.min(.12,S.elapsed-lastElapsed));if(S.elapsed<lastElapsed||Math.hypot(S.x-lastX,S.z-lastZ)>70){pool.length=0;drops.length=0;wakeTimer=0;dt=0;}lastElapsed=S.elapsed;lastX=S.x;lastZ=S.z;addEffects(dt);};
 addEventListener('resize',()=>pm.uniforms.scale08.value=innerHeight*.65);
 // Sounder: bounded echo band, weak trailing reverberation, surface clutter and
 // A-scope, rather than a solid orange rectangle extending to the screen bottom.
 const originalSonar=I.sonar.bind(I);
 I.sonar=(canvas,s)=>{originalSonar(canvas,s);const ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/1024,0,0,canvas.height/640,0,0);
  const hist=I.history,ft=3.280839895,depth=I.depth(s),max=Math.max(0,...hist.filter(Number.isFinite).map(d=>d*ft));const auto=[15,30,60,120,240,480].find(v=>v>max*1.25)||480,range=I.depthRange||auto;
  // Use the exact original auto-range via a label captured by patch08; no label/trace drift.
  const r=I._renderedDepthRange||range,top=164,bottom=518,left=62,right=912,H=bottom-top,W=right-left,gain=I.gain;
  ctx.save();ctx.beginPath();ctx.rect(left,top,W,H);ctx.clip();const bg=ctx.createLinearGradient(0,top,0,bottom);bg.addColorStop(0,'#041124');bg.addColorStop(1,'#0b2133');ctx.fillStyle=bg;ctx.fillRect(left,top,W,H);
  const sw=W/360;hist.forEach((dep,i)=>{if(!Number.isFinite(dep))return;const x=left+(360-hist.length+i)*sw,rawY=top+dep*ft/r*H;if(rawY>bottom)return;const y=Math.max(top,rawY),seed=Math.abs(rand(i+dep*15)),thickness=5+gain*9+seed*3;
   const echo=ctx.createLinearGradient(0,y-3,0,y+thickness+34);echo.addColorStop(0,'#38bce9');echo.addColorStop(.07,'#b9e958');echo.addColorStop(.17,'#ffe987');echo.addColorStop(.31,'#ffb03b');echo.addColorStop(.55,'#d65724');echo.addColorStop(1,'#481d2810');ctx.fillStyle=echo;ctx.fillRect(x,y-3,sw+1,thickness+37);
   ctx.fillStyle='#ffeeca';ctx.globalAlpha=.45+gain*.35;ctx.fillRect(x,y,sw+1,1.5);ctx.globalAlpha=1;
   // Low-level synthetic noise; never creates invented fish or bottom categories.
   for(let j=0;j<4;j++){const f=Math.abs(rand(i*17+j*113)),yy=top+f*Math.max(1,y-top-5);ctx.fillStyle=`rgba(41,126,184,${.05+gain*.11})`;ctx.fillRect(x,yy,sw+1,1);}
   ctx.fillStyle='rgba(79,171,200,.13)';ctx.fillRect(x,top,sw+1,3+seed*7*gain);
  });
  for(let k=0;k<5;k++){const y=top+H*k/4;ctx.strokeStyle='#b7dbec18';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}ctx.restore();
  ctx.fillStyle='#051624';ctx.fillRect(950,top,36,H);if(Number.isFinite(depth)&&depth*ft<r){const yy=top+depth*ft/r*H;for(let j=-22;j<35;j++){const amp=Math.exp(-Math.pow(j/8,2));ctx.fillStyle=j<3?'#ffe786':'#db762f';ctx.fillRect(952,yy+j,30*amp,1);}}
  if(!Number.isFinite(depth)){ctx.fillStyle='#071b2bed';ctx.fillRect(270,289,540,96);ctx.textAlign='center';ctx.fillStyle='#ffe4aa';ctx.font='650 24px system-ui';ctx.fillText(s.airborne?'NO RETURN — SENSOR CLEAR':'NO DATA / NO BOTTOM ESTIMATE',540,331);ctx.font='17px system-ui';ctx.fillStyle='#a7bdc4';ctx.fillText('No valid chart coverage at this simulated position',540,363);}else if(hist.length<4){ctx.textAlign='center';ctx.fillStyle='#a6c3d4';ctx.font='21px system-ui';ctx.fillText('ACQUIRING SIMULATED BOTTOM',500,337);}
  ctx.textAlign='left';ctx.fillStyle='#8ea9b7';ctx.font='15px system-ui';ctx.fillText('HISTORY  ←                                      ESTIMATED BOTTOM / SYNTHETIC ECHO',70,530);
 };
 // Compact compass/telemetry. The heading scale follows the same vessel state.
 const compass=document.createElement('div');compass.id='sea08-compass';compass.setAttribute('aria-label','Simulated heading and course');compass.innerHTML='<span>HDG</span><b id="sea08-heading">090°T</b><i>│</i><span>COG</span><b id="sea08-course">—</b><i>│</i><span id="sea08-planing">NEUTRAL</span>';$('command-app').append(compass);
 const pause=document.createElement('button');pause.id='sea08-pause';pause.textContent='Pause';pause.setAttribute('aria-label','Pause simulation');pause.onclick=()=>A.setPaused(!A.inspect().paused);$('command-app').append(pause);
 // The mobile test exposed a hidden pause button: this control stays reachable
 // in Drive, Configure, console close-up and clear cockpit modes.
 const start=document.createElement('button');start.id='sea08-start';start.textContent='Start engine + sound';start.onclick=async()=>{if(!A.audio.enabled)await A.audio.toggle();if(!S.engine)A.engineToggle();};$('cmd-engine').after(start);
 const progress=document.createElement('label');progress.className='radio-label';progress.innerHTML='Track position <input id="radio-seek" type="range" min="0" max="1000" value="0" aria-label="Music playback position"><small id="radio-time">0:00 / 0:00</small>';$('radio-volume').closest('label').before(progress);
 $('radio-seek').oninput=e=>{if(Number.isFinite(R.audio.duration)&&R.audio.duration>0&&R.track.kind!=='stream')R.audio.currentTime=Number(e.target.value)/1000*R.audio.duration;};
 const m=t=>Number.isFinite(t)?Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'):'LIVE';
 // Make the stereo's sound follow the helm, not only a distance-based volume.
 const ri=R.init.bind(R);R.init=async()=>{await ri();if(R.stereo08)return;R.stereo08=R.context.createStereoPanner();R.filter.disconnect();R.filter.connect(R.stereo08);R.stereo08.connect(R.gain);};
 const rt=R.tick.bind(R);R.tick=()=>{rt();if(!R.stereo08)return;const rel=A.boat.localToWorld(new T.Vector3(-.5,1.4,0)).sub(A.camera.position),right=new T.Vector3(1,0,0).applyQuaternion(A.camera.quaternion),pan=R.outputMode==='direct'?0:clamp(rel.clone().normalize().dot(right)*.75,-.8,.8);R.stereo08.pan.setTargetAtTime(pan,R.context.currentTime,.12);};
 addEventListener('keydown',e=>{if(e.repeat||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;if(e.code==='KeyM'){e.preventDefault();R.toggle().catch(()=>{});}});
 const help=document.createElement('p');help.className='muted';help.textContent='M: play/pause the boat stereo. The radio is independent of engine sound. Built-in music and personal files work offline; optional streams depend on their provider.';$('radio-panel').append(help);
 let timer=setInterval(()=>{const paused=A.inspect().paused;pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');pause.classList.toggle('active',paused);const hdg=I.heading(S),cog=I.course(S);$('sea08-heading').textContent=String(Math.round(hdg)%360).padStart(3,'0')+'°T';$('sea08-course').textContent=cog===null?'—':String(Math.round(cog)%360).padStart(3,'0')+'°T';$('sea08-planing').textContent=S.gear===0?'NEUTRAL':S.planing>.65?'ON PLANE':S.gear<0?'REVERSE':'DISPLACEMENT';const duration=R.audio.duration;$('radio-seek').disabled=R.track.kind==='stream'||!Number.isFinite(duration);if(document.activeElement!==$('radio-seek'))$('radio-seek').value=Number.isFinite(duration)&&duration>0?Math.round(R.audio.currentTime/duration*1000):0;$('radio-time').textContent=m(R.audio.currentTime)+' / '+m(duration);},150);
 addEventListener('pagehide',()=>clearInterval(timer));
 document.title='ATLAS Sea Lab 08 · Boat, Sound & Radio';document.querySelectorAll('.cmd-brand small').forEach(e=>e.textContent='BAY / SEA LAB 08');$('speed-basis').textContent='08 • Knots, recorded sound, cockpit repairs, richer water and sonar, onboard radio. Performance remains simulated.';
 report.ready=true;window.SEA08={ready:true,inspect:()=>({...report,radio:R.inspect(),waterMask:SEA06.inspect().waterMask})};A.refresh();
}
install();})();
