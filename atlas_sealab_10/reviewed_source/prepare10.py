"""Apply versioned, assertion-checked edits to the reviewed Sea Lab 09 site."""
from pathlib import Path
import shutil
r=Path(__file__).parent;s=r/'site'
def patch(name,old,new):
 p=s/name;t=p.read_text();assert t.count(old)==1,(name,old[:70],t.count(old));p.write_text(t.replace(old,new))
# Finish the pending 09 improvements rather than regress to the older live app.
old='coast.water.geometry.rotateX(-Math.PI/2);'
patch('water09.js',old,old+'''
 const wg=coast.water.geometry,wp=wg.attributes.position,wu=wg.attributes.uv;
 const warp=v=>{const n=Math.abs(v)/7.5;return Math.sign(v)*(n<=80?n*.5:40+860*Math.pow((n-80)/40,2));};
 for(let i=0;i<wp.count;i++){const x=warp(wp.getX(i)),z=warp(wp.getZ(i));wp.setX(i,x);wp.setZ(i,z);wu.setXY(i,x/1800+.5,.5-z/1800);}
 wp.needsUpdate=true;wu.needsUpdate=true;wg.computeBoundingSphere();report.nearWaterGridMetres=.5;report.waterVertices=wp.count;
''')
patch('water09.js','clock.value=S.elapsed;coast.ocean.visible=true;', '''clock.value=S.elapsed;
 const wx=Math.round(S.x/2)*2,wz=Math.round(S.z/2)*2;coast.water.position.set(wx,tide.value,wz);
 if(coast.waterShader)coast.waterShader.uniforms.uWorldOffset.value.set(wx,wz);
 const normal=coast.water.material.normalMap;if(normal)normal.offset.set(S.elapsed*.0011+wx/1800*normal.repeat.x,S.elapsed*.0007-wz/1800*normal.repeat.y);
 coast.ocean.visible=true;''')
patch('helm09.js',"A.engineToggle();status('Ignition on.","A.engineToggle();A.audio.tick(S);status('Ignition on.")
patch('helm09.js',"A.engineToggle();status('Ignition off.","A.engineToggle();A.audio.tick(S);status('Ignition off.")
patch('helm09.js',"A.chooseGear(cap(Math.round(value),-1,1));status(","A.chooseGear(cap(Math.round(value),-1,1));A.audio.tick(S);status(")
patch('audio09.js','const speed=Math.hypot(s.u||0,s.v||0);','B.metrics.activeEngines=s.engine?count:0;\n  const speed=Math.hypot(s.u||0,s.v||0);')
patch('helm09.js',"yt=new YT.Player(el,{", """let fallback=document.getElementById('helm09-yt-external');if(!fallback){fallback=document.createElement('a');fallback.id='helm09-yt-external';fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.textContent='Open this video on YouTube ↗';fallback.style.cssText='display:block;margin:0 12px 12px';$('helm09-youtube').append(fallback);}fallback.href='https://www.youtube.com/watch?v='+id;
 yt=new YT.Player(el,{""")
# A shared fixed-step hook updates weather and the optional local consequences.
patch('command-motion.js','this.elapsed+=dt;this.contact=false;', 'if(G.Sea10Runtime)G.Sea10Runtime.beforeStep(this,dt);this.elapsed+=dt;this.contact=false;')
patch('command-motion.js','this.groundForce=0;}','this.groundForce=0;this.hullHealth10=100;this.engineDisabled10=false;this.destroyed10=false;this.impactSeq10=0;this.lastHardImpact10=-99;}')
patch('command-motion.js',' setEnvironment(key){',' start(){if(this.destroyed10||this.engineDisabled10||this.fuelUsedGal>=this.config.fuelGal)return false;return super.start();}\n setEnvironment(key){')
old="for(const o of obstacles){let hit=false;for(const a of [-3.35,-1.7,0,1.7,3.35]){const xx=this.x+a*c,zz=this.z+a*s;if((xx-clamp(xx,o.x0,o.x1))**2+(zz-clamp(zz,o.z0,o.z1))**2<1.28**2){hit=true;break;}}if(hit){this.x=px;this.z=pz;this.vx*=.15;this.vz*=.15;this.contact=true;break;}}"
patch('command-motion.js',old,"const hit10=G.Sea10Dynamics?.resolveObstacles(this,px,pz,obstacles);if(hit10)G.Sea10Runtime?.onImpact(this,hit10);")
# Chart-derived shoreline contacts also emit events. Unknown outside bounds do not explode.
patch('command-motion.js','if(q.land||q.outside||footprint){this.x=px;', '''if(q.land||q.outside||footprint){if((q.land||footprint)&&G.Sea10Runtime){const speed=Math.hypot(this.vx,this.vz);G.Sea10Runtime.onImpact(this,{kind:'shore',time:this.elapsed,x:this.x,z:this.z,closing:speed,deltaV:speed*.85,forwardSpeed:this.u,vx:this.vx,vz:this.vz,mass:M});}this.x=px;''')
patch('command-motion.js','this.bottomImpact=Math.min(1,.15+speed*.065);','this.bottomImpact=Math.min(1,.15+speed*.065);G.Sea10Runtime?.onImpact(this,{kind:"bottom",time:this.elapsed,x:hit.x,z:hit.z,closing:Math.max(0,into),deltaV:0,forwardSpeed:this.u,vx:this.vx,vz:this.vz,mass:M});')
# New panel content shares the existing panel manager so only one drawer is open.
patch('helm09.js',"settings:'Boat & sea'","settings:'Settings',weather:'Weather & water',setup:'Boat setup'")
patch('helm09.js','body.replaceChildren();','body.replaceChildren();if(window.SEA10?.renderPanel(kind,body))return;')
patch('helm09.js',"if(kind==='settings'){body.innerHTML=", "if(kind==='setup'){body.innerHTML=")
patch('helm09.js','async function ignition(){if(keyBusy)return;', "async function ignition(){if(keyBusy)return;if(!S.engine&&(S.destroyed10||S.engineDisabled10||window.SEA10?.inspect().ejected)){status('Recover the boat before restarting.');return;}")
patch('helm09.js',"ATLAS Sea Lab 09 · At the Helm","ATLAS Sea Lab 10 · At the Helm")
patch('helm09.js','SEA LAB 09</span>','SEA LAB 10</span>')
# Hidden legacy hotkeys must not react to typing in the new controls or open overlays.
patch('app.js','if(gamePaused||modalOpen())','if(gamePaused||modalOpen())') if False else None
for name in ['dynamics10.js','operations10.js','operations10.css']:
 shutil.copy2(r/name,s/name)
p=s/'index.html';t=p.read_text();assert 'src="command-motion.js"' in t
# Dynamics helper must exist before the command model, while operations waits for the UI.
t=t.replace('<script src="command-motion.js"', '<script src="dynamics10.js"></script><script src="command-motion.js"')
if 'dynamics10.js' not in t:
 t=t.replace('src="command-motion.js"','src="dynamics10.js"></script><script defer src="command-motion.js"')
t=t.replace('</head>','<link rel="stylesheet" href="operations10.css"><script defer src="operations10.js"></script></head>')
p.write_text(t)
print('Sea Lab 10 prepared with shared weather, impact commands, opt-in extras and 09 improvements')
