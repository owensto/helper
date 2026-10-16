"""Fix issues reproduced in the first rendered review; retain functional gates."""
from pathlib import Path
r=Path(__file__).parent

def patch(name,old,new,count=1):
 p=r/name;s=p.read_text();assert s.count(old)==count,(name,old[:70],s.count(old));p.write_text(s.replace(old,new))

# The extension hook runs BEFORE the fallback radio panel renders. Enhance only
# after its DOM and click handlers exist, never dereference an absent field.
p=r/'site/experience12.js';s=p.read_text()
a="if(kind==='radio'){const input=$('helm09-mediaurl');";b="if(kind==='radio'){queueMicrotask(()=>{const input=$('helm09-mediaurl');if(!input||!body.isConnected)return;input.dataset.enhanced12='true';"
assert s.count(a)==1;s=s.replace(a,b)
a="}catch{}};}\nreturn result;};";assert s.count(a)==1;s=s.replace(a,"}catch{}};});}\nreturn result;};")
s=s.replace("SEA09.view('seats');$('helm09-close').click();","SEA09.view('captain');$('helm09-close').click();")
p.write_text(s)
# Independent captain close-up. Old seating camera remains for inspecting seats.
p=r/'site/app.js';s=p.read_text()
a="['orbit','deck','aft','tackle','seats','engine','instruments'].includes(next)";assert s.count(a)==1;s=s.replace(a,"['orbit','deck','aft','tackle','seats','engine','instruments','captain'].includes(next)")
a="['deck','aft','helm','tackle','seats','engine','instruments'].includes(next)";assert s.count(a)==1;s=s.replace(a,"['deck','aft','helm','tackle','seats','engine','instruments','captain'].includes(next)")
a=" else if(next==='seats'){";assert s.count(a)==1;s=s.replace(a," else if(next==='captain'){camera.position.copy(world([-1.9,2.22,3.5]));orbit.target.copy(world([-1.42,1.30,.18]));}\n"+a)
a="let at=world([-.2,1.2,0]),p=world([-14,6,1.7]);";assert s.count(a)==1;s=s.replace(a,"let at=world([7,1.2,0]),p=world([-14,4.2,1.7]);")
p.write_text(s)
# Place the seated captain at the actual steering station, not the opposite side.
p=r/'site/operations10.js';s=p.read_text();a="driver.position.set(-1.65,.94,-.42);";assert s.count(a)==2;s=s.replace(a,"driver.position.set(-1.60,1.06,.18);")
a="driver.position.set(S.x-1.65*dc+.42*ds,(S.location==='beaufort'?(S.config.tide||0):0)+S.heave+1.24,S.z-1.65*ds-.42*dc);";assert s.count(a)==1;s=s.replace(a,"driver.position.set(S.x-1.60*dc-.18*ds,(S.location==='beaufort'?(S.config.tide||0):0)+S.heave+1.06,S.z-1.60*ds+.18*dc);")
p.write_text(s)
p=r/'site/captain12.js';s=p.read_text()
a="const v=mesh(new T.BoxGeometry(.19,.40,.19),vest,[.055,.21,side*.12]);v.rotation.x=side*.10;";assert s.count(a)==1;s=s.replace(a,"const v=mesh(new T.CapsuleGeometry(.10,.21,6,14),vest,[.075,.21,side*.115]);v.scale.set(.76,1,.90);v.rotation.x=side*.08;")
a="mesh(new T.CapsuleGeometry(.077,.39,5,12),pants,[-.02,-.24,0],leg);const shoe=mesh(new T.CapsuleGeometry(.064,.13,4,10),dark,[.043,-.51,0],leg);shoe.rotation.z=Math.PI/2;";assert s.count(a)==1
s=s.replace(a,"const thigh=mesh(new T.CapsuleGeometry(.077,.23,5,12),pants,[.15,-.04,0],leg);thigh.rotation.z=-Math.PI/2;mesh(new T.CapsuleGeometry(.067,.22,5,12),pants,[.31,-.24,0],leg);const shoe=mesh(new T.CapsuleGeometry(.062,.13,4,10),dark,[.37,-.42,0],leg);shoe.rotation.z=Math.PI/2;")
s=s.replace('Math.min(.55,distance)','Math.min(.64,distance)').replace('distance>.55','distance>.64').replace('addScaledVector(dir,.55)','addScaledVector(dir,.64)').replace('(.29*.29-.28*.28+d*d)','(.33*.33-.32*.32+d*d)').replace('.29*.29-along*along','.33*.33-along*along').replace("if(arm.side>0&&lever", "if(arm.side<0&&lever")
p.write_text(s)
# Foam is emitted on the retained, world-space wake track. It follows turns and
# fades with SIMULATION time. It does not need unbounded geometry or fake clocks.
p=r/'site/water12.js';s=p.read_text()
a="count={value:0};";assert s.count(a)==1;s=s.replace(a,"count={value:0},stern={value:new T.Vector4()};")
a="sh.uniforms.uWakeCount12=count;";assert s.count(a)==1;s=s.replace(a,a+"sh.uniforms.uStern12=stern;")
a="sh.fragmentShader='uniform sampler2D reflection12;";assert s.count(a)==1;s=s.replace(a,"sh.fragmentShader='uniform vec4 uWake12[12];uniform vec2 uWakeDir12[12];uniform int uWakeCount12;uniform vec4 uStern12;uniform sampler2D reflection12;")
a="float foam11=clamp((shore11*.70+crest11*.30+whitecap12*.28)*grain11,0.,.78);";assert s.count(a)==1
s=s.replace(a,"""float wakeFoam12=0.;
for(int i=0;i<12;i++){if(i>=uWakeCount12)break;vec4 wb=uWake12[i];vec4 wa=i==0?uStern12:uWake12[i-1];float age=max(0.,time11-wb.z);vec2 ray=wb.xy-wa.xy,rel=vDryWorld.xz-wa.xy;float f=clamp(dot(rel,ray)/max(.01,dot(ray,ray)),0.,1.);float distance12=length(rel-ray*f);float width12=.45+age*.36;float wash12=exp(-distance12*distance12/(width12*width12))*exp(-age*.39)*clamp(wb.w*7.,0.,1.);vec2 radial=vDryWorld.xz-wb.xy;float front12=dot(radial,uWakeDir12[i]);float ring12=exp(-pow((length(radial)-(1.3+age*2.25))/(.38+age*.05),2.))*clamp((1.4-front12)/1.4,0.,1.)*exp(-age*.36)*clamp(wb.w*5.,0.,.8);wakeFoam12=max(wakeFoam12,wash12*.75+ring12*.28);}
float foam11=clamp((shore11*.70+crest11*.30+whitecap12*.28)*grain11+wakeFoam12*(.63+.37*grain11),0.,.84);""")
a="const cs=A.coast.waterShader;";assert s.count(a)==1;s=s.replace(a,"const direction12=S.u<0?-1:1;stern.value.set(S.x-3.4*Math.cos(S.heading)*direction12,S.z-3.4*Math.sin(S.heading)*direction12,S.elapsed,Math.min(.16,Math.max(0,Math.hypot(S.u||0,S.v||0)-1.4)*.009));"+a)
p.write_text(s)
# Keep the force-driven pose and weather intact. Add an unobstructed lower-angle
# bridge review rather than asserting only that data loaded behind the HUD.
p=r/'verify12.py';s=p.read_text()
a="page.locator('#helm09-radio').click();page.locator('#helm09-mediaurl').fill(";assert s.count(a)==1;s=s.replace(a,"page.locator('#helm09-radio').click();page.wait_for_function('document.getElementById(\"helm09-mediaurl\")?.dataset.enhanced12===\"true\"');page.locator('#helm09-mediaurl').fill(")
a="shot(page,'desktop_beaufort_woods.png')";assert s.count(a)==1
s=s.replace(a,a+";r['bridgeScreenPoint']=page.evaluate('''()=>{const[x,z]=BayGeo.fromLL(32.42756105,-80.66915645),p=new ATLASRuntime.Vector3(x,8,z).project(BAYPLAY.camera);return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,z:p.z};}''');assert 200<r['bridgeScreenPoint']['y']<720 and abs(r['bridgeScreenPoint']['z'])<1")
p.write_text(s)
# Preserve root readable source alongside the actual patched application files.
for name in ['water12.js','experience12.js','captain12.js']:(r/name).write_text((r/'site'/name).read_text())
css='\n#helm09.coastal11 #s11-look{color:var(--ink)!important}\n'
for name in ['experience12.css','site/experience12.css']:
 p=r/name;p.write_text(p.read_text()+css)
print('Radio fallback enhanced after render; seated captain fitted to wheel; camera horizon and world-space wake foam improved')
