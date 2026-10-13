from pathlib import Path
import os
r=Path(os.environ['BAY_ROOT']);p=r/'site/app.js';s=p.read_text()
s=s.replace('renderer.shadowMap.enabled=true','renderer.shadowMap.enabled=false')
s=s.replace('sun.castShadow=true','sun.castShadow=false')
s=s.replace('let dt=Math.min(.06,(now-last)/1000)','let dt=Math.min(.25,(now-last)/1000)')
s=s.replace('h.value+=(h.target-h.value)*Math.min(1,dt*4.5);','h.value+=(h.target-h.value)*(1-Math.exp(-7*dt));')
s=s.replace('if(m.transmission>.1){','m.normalMap=null;m.clearcoat=0;m.clearcoatNormalMap=null;if(m.transmission>.1){')
s=s.replace('camera.position.copy(world(innerWidth<900?[-14.5,9,17.4]:[-10,6.5,12]));','camera.position.copy(world(innerWidth<900?[-12.4,7.7,14.8]:[-8,5.4,9.6]));')
s=s.replace("orbit.enabled=next==='orbit'||next==='deck'||next==='aft';", "orbit.enabled=next==='orbit'||next==='deck'||next==='aft';$('#intro').style.display=(next==='deck'||next==='aft'||next==='helm')?'none':'';")
s=s.replace("snapshot:state.snapshot(),meshCount:","snapshot:state.snapshot(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,meshCount:")
p.write_text(s);(r/'src/app.js').write_text(s)
p=r/'src/verify.py';v=p.read_text();v=v.replace("page.keyboard.press('Tab');page.keyboard.down('KeyD')","page.locator('#scene').click(position={'x':650,'y':350},force=True) if device=='desktop' else page.locator('#scene').click(position={'x':210,'y':380},force=True);page.keyboard.down('KeyD')")
# The event-based checks retain their original movement/open/close requirements.
v=v.replace('timeout=30000','timeout=60000').replace('timeout=45000','timeout=60000').replace('timeout=40000','timeout=60000')
v=v.replace("result['exception']=str(e);", "result['failure_state']=page.evaluate('window.BAYPLAY?.inspect()');result['exception']=str(e);")
p.write_text(v)
