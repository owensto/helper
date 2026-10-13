from pathlib import Path
import os
r=Path(os.environ['BAY_ROOT']);p=r/'src/app.js';s=p.read_text()
a="new T.TextureLoader().load('assets/waternormals.jpg'"
b='function mat(c,r=.65)'
i=s.index(a);j=s.index(b,i)
s=s[:i]+'''new T.TextureLoader().load('assets/waternormals.jpg',normal=>{normal.wrapS=normal.wrapT=T.RepeatWrapping;normal.repeat.set(320,320);water=new T.Mesh(new T.PlaneGeometry(2400,2400),new T.MeshStandardMaterial({color:'#418f9b',roughness:.30,metalness:.18,normalMap:normal,normalScale:new T.Vector2(.13,.13)}));water.rotation.x=-Math.PI/2;water.position.y=.006;water.receiveShadow=true;scene.add(water);waterReady=true;},null,()=>{water=new T.Mesh(new T.PlaneGeometry(2400,2400),new T.MeshStandardMaterial({color:'#4095a6',roughness:.4}));water.rotation.x=-Math.PI/2;scene.add(water);waterReady=true;});
'''+s[j:]
s=s.replace("Math.min(devicePixelRatio||1,innerWidth<900?1.2:1.5)","Math.min(devicePixelRatio||1,1)")
s=s.replace('sun.shadow.mapSize.set(1024,1024)','sun.shadow.mapSize.set(512,512)')
s=s.replace("if(m.transmission>.1||m.transparent)o.castShadow=false;","if(m.transmission>.1){m.transmission=0;m.transparent=true;m.opacity=.34;m.depthWrite=false;m.needsUpdate=true;}if(m.transparent)o.castShadow=false;")
s=s.replace("dt*(state.engine?12+Math.abs(state.u)*5:0)*(state.gear||1)","dt*(state.engine&&state.gear!==0?12+Math.abs(state.u)*5:0)*state.gear")
s=s.replace("function loop(now){requestAnimationFrame(loop);", "function loop(now){requestAnimationFrame(loop);if(window.BAYPLAY?.capturePaused){last=now;return;}")
s=s.replace("if(frame%5===0)renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);", "if(frame%8===0)renderer.shadowMap.needsUpdate=true;if(water?.material.normalMap){water.material.normalMap.offset.x=time*.0015;}renderer.render(scene,camera);")
s=s.replace("fill.position.set(state.x+5,7,state.z-10);renderer.shadowMap.needsUpdate=true;", "fill.position.set(state.x+5,7,state.z-10);")
s=s.replace("const labels={fishbox:'fish box'", "const labels={fishbox:'fish box'")
s=s.replace("function chooseGear(g){if(state.throttle>","function chooseGear(g){if(g!==0 && state.gear!==0 && g!==state.gear && Math.abs(state.u)>.8){message('Slow down before changing direction.');return;}if(state.throttle>")
s=s.replace("'Course complete. Return to the pale berth at the dock.'", "(gate===6?'Docked. Course complete.':'Course complete. Return to the pale berth at the dock.')")
s=s.replace("camera.position.copy(world([-10,6.5,12]));", "camera.position.copy(world(innerWidth<900?[-14.5,9,17.4]:[-10,6.5,12]));")
p.write_text(s);(r/'site/app.js').write_text(s)
p=r/'src/verify.py';v=p.read_text();v=v.replace("report={'url':BASE,", "report={'screenshots_pause_motion':True,'url':BASE,")
v=v.replace("with sync_playwright() as p:","def shot(page,path):\n page.evaluate('BAYPLAY.capturePaused=true');page.wait_for_timeout(300)\n try:page.screenshot(path=str(path),timeout=60000)\n finally:page.evaluate('BAYPLAY.capturePaused=false')\nwith sync_playwright() as p:")
import re
v=re.sub(r"page\.screenshot\(path=str\((OUT/f'[^']*')\)\)",r"shot(page,\1)",v)
p.write_text(v)
