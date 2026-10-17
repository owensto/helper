"""Deterministic first-build refinement; published files contain the resulting source.
No original yacht, Bay, human or shared-owner file is read or changed.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def edits(name, changes):
 p=ROOT/'site'/name;s=p.read_text();marker='ATLAS_REBUILD_POLISH_02'
 if marker in s:return
 for old,new in changes:
  assert old in s,(name,old[:80]);s=s.replace(old,new)
 if name.endswith('.css'):s+='\n/* '+marker+' */\n'
 else:s+='\n// '+marker+'\n'
 p.write_text(s)

edits('model.js',[
 ('Math.min(.9,w*.35)','Math.min(2.6,w*.5)'),
 ('g.rotateX(-Math.PI/2);const o=mesh(g,m,n);','g.rotateX(-Math.PI/2);if(m===mat.teak){const u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)/82.9,u.getY(i)/13.6);u.needsUpdate=true;}const o=mesh(g,m,n);'),
 ('di.push(a,a+2,a+1,a+1,a+2,a+3)','di.push(a,a+1,a+2,a+1,a+3,a+2)'),
 ("[x,y+h/2,side*w],mat.white)","[x,y+h/2,side*w],mat.glass)"),
 ("const frontGlass=mat.glass.clone();frontGlass.transparent=true;frontGlass.opacity=.38;frontGlass.side=T.DoubleSide;","const frontGlass=new T.MeshPhysicalMaterial({color:0xc6e0e5,metalness:.02,roughness:.045,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide,envMapIntensity:.25});"),
 ("new T.PlaneGeometry(9.0,9.0)","new T.PlaneGeometry(9.0,9.0,18,18)"),
 ('hp.position.set(28.1,sheer(28.1)+.07,0);','hp.position.set(28.1,sheer(28.1)+.07,0);{const p=hp.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,sheer(28.1+p.getX(i))-hp.position.y+.026);p.needsUpdate=true;hp.geometry.computeVertexNormals();}'),
 ('shaft.rotation.z=.04','shaft.rotation.z=Math.PI/2+.04'),
 ('o.rotation.y=-state.rudder','o.rotation.y=state.rudder'),
 ("root.userData.geometryBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};","root.userData.geometryBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};root.userData.lengthOverallM=bounds.max.x-bounds.min.x;root.userData.beamM=bounds.max.z-bounds.min.z;root.userData.lowestAppendageM=bounds.min.y;"),
 ("return {root,detail,materials:mat,bridge,update(state,dt=0){", """let lastDisplay=-1,lastEngine=null;
function refreshDisplays(state){if(Math.abs(state.time-lastDisplay)<.25&&state.engine===lastEngine)return;lastDisplay=state.time;lastEngine=state.engine;const c=display.image.getContext('2d');c.fillStyle='#08222c';c.fillRect(520,0,504,512);c.fillStyle='#abc8c5';c.font='20px monospace';c.fillText('LIVE / VESSEL SYSTEMS',556,50);c.font='34px monospace';const hdg=((90+state.heading*180/Math.PI)%360+360)%360;c.fillText('HDG '+hdg.toFixed(0)+'°',556,128);c.fillText((Math.hypot(state.u,state.v)*1.943844).toFixed(1)+' KNOTS',556,195);c.font='21px monospace';c.fillText(state.engine?'ENGINES ONLINE':'ENGINES STANDBY',556,275);c.fillText('P '+Math.round(state.port*100)+'% / S '+Math.round(state.starboard*100)+'%',556,321);c.fillText('RUD '+(state.rudder*180/Math.PI).toFixed(1)+'°',556,367);c.font='15px monospace';c.fillText('LEFT: ILLUSTRATIVE RADAR',556,454);display.needsUpdate=true;}
return {root,detail,materials:mat,bridge,update(state,dt=0){refreshDisplays(state);"""),
])

old_noise="""let dx=0,dz=0;for(let k=1;k<=6;k++){const a=1/k,px=k*3,pz=k*2+1;dx+=a*Math.cos(px*u+pz*v+k)*.14;dz+=a*Math.cos(pz*u-px*v+k*.7)*.14;}const norm=new T.Vector3(dx,.7,dz).normalize()"""
new_noise="""let dx=0,dz=0;for(let k=1;k<=24;k++){const px=3+(k*17)%83,pz=2+(k*31)%79,phase=Math.cos(k*12.989)*17.13,len=Math.hypot(px,pz),a=.22/Math.pow(k,.26),q=Math.cos(px*u+pz*v+phase);dx+=q*a*px/len;dz+=q*a*pz/len;}const norm=new T.Vector3(dx,1.0,dz).normalize()"""
edits('app.js',[
 ('renderer.toneMappingExposure=1.12','renderer.toneMappingExposure=1.0'),
 ('0x596c64,2.2','0x596c64,1.5'),
 ('0xfff0d6,3.3','0xfff0d6,2.85'),
 ('0x6f9fba','0x568caa'),('0xd7ded6','0xb8d2db'),
 (old_noise,new_noise),
 ('normals.wrapS=normals.wrapT=T.RepeatWrapping;normals.needsUpdate=true;', 'normals.wrapS=normals.wrapT=T.RepeatWrapping;normals.magFilter=T.LinearFilter;normals.minFilter=T.LinearMipmapLinearFilter;normals.generateMipmaps=true;normals.needsUpdate=true;'),
 ('waterColor:0x2f7780,distortionScale:1.7','waterColor:0x0b5063,distortionScale:2.4'),
 ('ocean.material.needsUpdate=true;',"ocean.material.fragmentShader=ocean.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.025;');ocean.material.needsUpdate=true;"),
 ('[-89,43,107]','[-65,31,85]'),
 ('[13.7,9.1,0]','[13.7,8.78,0]'),
 ('[85,8.6,0]','[85,9.0,0]'),('[100,8.6,0]','[100,9.0,0]'),
 ('[-114,65,159]','[-113,72,172]'),
 ("$('pause').onclick=()=>{vessel.command('pause');sync();}","$('pause').onclick=()=>{vessel.command('pause');if(!vessel.paused)manualNotice='';sync();}"),
 ("$('resume').onclick=()=>{if(vessel.paused)vessel.command('pause');sync();}","$('resume').onclick=()=>{if(vessel.paused)vessel.command('pause');manualNotice='';sync();}"),
 ('sun.intensity=dusk?2.6:3.3;hemi.intensity=dusk?1.8:2.2','sun.intensity=dusk?2.4:2.85;hemi.intensity=dusk?1.2:1.5'),
])
edits('physics.js',[
 ('engine:false,paused:false,gear:1','engine:false,paused:false,gear:0'),
 ("['roll',(star-port)/10+this.r*this.u*.003","['roll',(port-star)/10+this.r*this.u*.003"),
 ('for(const a of [-36,0,36])for(const b of [-5.5,5.5])','for(const a of [-44.1,-30,-15,0,15,30,41.5])for(const b of [-6.82,0,6.82])'),
])
p=ROOT/'test-physics.cjs';s=p.read_text();s=s.replace("v.command('engine');v.command('port',1)","v.command('engine');v.command('gear',1);v.command('port',1)").replace('assert.equal(v.gear,1);v.command','assert.equal(v.gear,0);v.command');p.write_text(s)
p=ROOT/'site'/'style.css';s=p.read_text()
if 'ATLAS_REBUILD_POLISH_02' not in s:
 s+='\n/* ATLAS_REBUILD_POLISH_02: decorative labels cannot steal control input. */\n.view-label,.heading-box,#notice{pointer-events:none}\n@media(orientation:landscape) and (max-height:600px){.camera-nav{top:76px;left:15px;right:auto;flex-direction:column;gap:6px}.camera-nav button{min-width:109px;text-align:left;padding:5px 8px}.view-label{bottom:122px}.view-label #view-help{display:none}}\n';p.write_text(s)
p=ROOT/'site'/'README.md'
if p.exists():
 s=p.read_text().replace('Bridge screens currently contain illustrative navigation artwork; the overlaid helm, heading and chart display actual simulation state.','Bridge heading, speed, engine and rudder readouts update from actual simulation state. The radar rings/blips remain explicitly illustrative; no real radar sensor is simulated.')
 p.write_text(s)
print('Refinement 02 source ready; no human/old-host changes.')
