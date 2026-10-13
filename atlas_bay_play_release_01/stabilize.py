"""Stabilize the recovered play prototype without changing its native model."""
from pathlib import Path
import os, json, hashlib
r=Path(os.environ.get("BAY_ROOT",Path(__file__).parent))
p=r/"site/app.js";s=p.read_text()
def replace(a,b):
 global s
 assert a in s, "Patch source mismatch: "+a[:85]
 s=s.replace(a,b)
replace("let dt=Math.min(.06,(now-last)/1000)","let dt=Math.min(.25,Math.max(0,(now-last)/1000))")
replace("h.value+=(h.target-h.value)*Math.min(1,dt*4.5);","h.value+=(h.target-h.value)*(1-Math.exp(-7*dt));if(Math.abs(h.value-h.target)<.001)h.value=h.target;")
replace("camera.position.copy(world(innerWidth<900?[-14.5,9,17.4]:[-10,6.5,12]));","camera.position.copy(world(innerWidth<900?[-12.4,7.7,14.8]:[-8.5,5.4,10.2]));")
replace("orbit.enabled=next==='orbit'||next==='deck'||next==='aft';","orbit.enabled=next==='orbit'||next==='deck'||next==='aft';$('#intro').style.display=(next==='deck'||next==='aft'||next==='helm')?'none':'';")
replace("for(let x=-27;x<22;x+=.48)box([x,.761,-7.8],[.021,.007,3.47],frameMat);","const seams=[];for(let x=-27;x<22;x+=.48){seams.push(V(x,.761,-9.535),V(x,.761,-6.065))}scene.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(seams),new T.LineBasicMaterial({color:'#48616a',transparent:true,opacity:.6})));")
replace("snapshot:state.snapshot(),meshCount:","snapshot:state.snapshot(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,propellerAngle:props.prop?.rotation.x||0,gearStowed,lamps:lampOn,meshCount:")
replace("function reset(){state.reset();","function reset(){lampOn=false;lights.forEach(p=>p.material.emissiveIntensity=0);state.reset();")
replace("if(g!==0 && state.gear!==0 && g!==state.gear && Math.abs(state.u)>.8)","if(g!==0 && Math.abs(state.u)>.8 && Math.sign(state.u)!==g)")
replace("if(e.code==='Space')e.preventDefault();","if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();")
insert="""
const qualityButton=document.createElement('button');qualityButton.id='quality';qualityButton.className='quiet';qualityButton.textContent='Detail: high';document.querySelector('header').append(qualityButton);
let reduced=false;
function setQuality(low){reduced=low;renderer.shadowMap.enabled=!low;renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?.8:1));qualityButton.textContent=low?'Detail: smooth':'Detail: high';renderer.shadowMap.needsUpdate=true;}
qualityButton.onclick=()=>setQuality(!reduced);
const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
if(innerWidth<700||(debug&&/SwiftShader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))))setQuality(true);
"""
replace("const pm=new T.PMREMGenerator(renderer)",insert+"\nconst pm=new T.PMREMGenerator(renderer)")
p.write_text(s);(r/"src/app.js").write_text(s)
p=r/"site/index.html";html=p.read_text().replace('id="scene" aria-label','id="scene" tabindex="0" aria-label')
html=html.replace("PLAY LAB / 01","PLAY LAB / 01.1").replace("Play Lab 01</title>","Play Lab 01.1</title>").replace("BAY · PLAY LAB 01","BAY · PLAY LAB 01.1")
html=html.replace("</dialog>","<p><b>Graphics:</b> Detail: smooth reduces pixel density and dynamic shadows without removing boat geometry. Detail: high restores the richer lighting.</p></dialog>")
(r/"site/index.html").write_text(html);(r/"src/index.html").write_text(html)
p=r/"site/app.css";css=p.read_text()+"""
header{flex-wrap:wrap}header #quality{font-size:10px;padding:8px 10px}#scene:focus{outline:none}
@media(min-width:901px){header nav{margin-left:auto}header #help{margin-left:8px}}
@media(max-width:900px){header #quality{margin-left:auto;font-size:9px;padding:8px}.intro{top:142px}.chart-panel{top:145px}}
"""
p.write_text(css);(r/"src/app.css").write_text(css)
report=json.loads((r/"site/build_report.json").read_text())
report.update(revision="ATLAS Bay Play Lab 01.1",recovered_source_run=38443814429,render_timing="Exponential interactive-part transitions with elapsed time, fixed 60 Hz driving steps, bounded catch-up and hidden-tab suspension",repairs=["Render-cadence-independent lid response","Batched dock seams","Canvas keyboard focus","Direction-change guard across neutral","Reset light state","Optional reduced-shadow rendering"],modes=["Explore","Drive"],not_included=["Free walking","Fishing gameplay","App-store distribution","Calibrated marine dynamics","Real GPS/bathymetry","Validated draft"],model_sha256=hashlib.sha256((r/"site/assets/ATLAS_Bay_Play.glb").read_bytes()).hexdigest())
(r/"site/build_report.json").write_text(json.dumps(report,indent=2))
