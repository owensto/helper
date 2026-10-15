"""Repair issues demonstrated by the actual 09 rendered review. No test exemptions."""
from pathlib import Path
r=Path(__file__).parent

def patch(name,old,new):
 p=r/name;s=p.read_text();assert s.count(old)==1,(name,old[:90],s.count(old));p.write_text(s.replace(old,new))
patch('site/helm09.js','key.position.set(-.98,1.025,.44);', 'key.position.set(-.810,1.097,-.190);key.rotation.z=-.20;')
patch('site/audio09.js','originalTick(s);if(!B.context)return;', 'originalTick(s);if(!B.context||!B.enabled||B.held)return;')
# Float32BufferAttribute copied the all-zero array before terrain colors were
# written. BufferAttribute retains the array that rebuild() actually populates.
patch('site/water09.js',"g.setAttribute('color',new T.Float32BufferAttribute(colors,3));", "g.setAttribute('color',new T.BufferAttribute(colors,3));")
patch('site/water09.js',"float c09=pow(max(0.,sin(g09.x*1.8+groundClock09*.6)+sin(g09.z*1.55-groundClock09*.7))*.5,8.);\n diffuseColor.rgb+=vec3(.20,.25,.18)*c09*exp(min(0.,g09.y)*.35);", """float cx09=sin(g09.x*2.1+sin(g09.z*1.7+groundClock09*.48)*1.3+groundClock09*.21);
 float cz09=sin(g09.z*2.6+cos(g09.x*1.9-groundClock09*.37)*1.1);
 float c09=pow(1.-abs(cx09*cz09),18.);
 diffuseColor.rgb+=vec3(.035,.044,.030)*c09*exp(min(0.,g09.y)*.38)*step(g09.y,0.);""")
patch('site/water09.js',"float fresnel09=.02+.78*pow(1.-abs(normalize(vViewPosition).z),5.);", """vec3 eye09=normalize(cameraPosition-vDryWorld);
 vec3 surf09=normalize(cross(dFdx(vDryWorld),dFdy(vDryWorld)));
 float fresnel09=.025+.93*pow(1.-abs(dot(surf09,eye09)),5.);""")
patch('site/water09.js','diffuseColor.a=clamp(.06+1.-exp(-depth09*clarity09)+fresnel09*.20,.12,.98);','diffuseColor.a=clamp(1.-exp(-depth09*clarity09)*(1.-fresnel09),.10,.995);')
patch('site/water09.js',"report.knownSamples=nKnown;report.terrainRebuilds++;", "report.knownSamples=nKnown;report.terrainRebuilds++;report.colorArrayBound=g.attributes.color.array===colors;report.seabedColorMean=colors.reduce((a,b)=>a+b,0)/colors.length;")
# Separate appendage contact from load-bearing hull support. The propeller does
# not act like a jack lifting the full hull out of the water.
patch('site/world09.js','let worst=null;for(const[a,b,d,part]of samples)', 'let worst=null,hullClearance=Infinity;for(const[a,b,d,part]of samples)')
patch('site/world09.js','if(!worst||clearance<worst.clearance)worst=', "if(part!=='PROP')hullClearance=Math.min(hullClearance,clearance);\n   if(!worst||clearance<worst.clearance)worst=")
patch('site/world09.js','}return worst;', '}if(worst)worst.hullClearance=Number.isFinite(hullClearance)?hullClearance:null;return worst;')
patch('site/command-motion.js','Math.max(0,-hit.clearance)*M*24','Math.max(0,-(hit.hullClearance??0))*M*34')
# Strengthen the rendered gates: color buffer is actually populated, physical
# key is clicked at its fitted position, contact must produce an audible event.
patch('verify09.py','import os,json,time,traceback','import os,json,time,traceback,base64')
patch('verify09.py',"r['keyPixel']=xy;assert 0<xy[0]<w and 0<xy[1]<h;page.mouse.click(*xy)", "r['keyPixel']=xy;assert 0<xy[0]<w and 0<xy[1]<h;shot(page,'desktop_physical_key.png');page.mouse.click(*xy)")
patch('verify09.py',"page.wait_for_function('!document.getElementById(\"helm09-alert\").hidden');r['bottomContact']=", "page.wait_for_function('!document.getElementById(\"helm09-alert\").hidden');page.locator('#helm09-pause').click();page.wait_for_function('BAYPLAY.audio.quality09.events.some(e=>e.kind===\"ground\")');page.wait_for_function('BAYPLAY.audio.metrics.rms>.0001');page.locator('#helm09-pause').click();r['bottomContact']=")
patch('verify09.py',"assert r['final']['water']['knownSamples']>0;", "assert r['final']['water']['knownSamples']>0;assert r['final']['water']['colorArrayBound'] and r['final']['water']['seabedColorMean']>.1;")
# Capture actual audio-graph output, not an unrelated source file, for review.
needle="   r['layout']=page.evaluate("
p=r/'verify09.py';s=p.read_text();assert needle in s
extra='''   if device=='desktop':
    page.evaluate('SEA09.relocate("basin",-200,-300,0);BAYPLAY.state.setEnvironment("calm")');page.locator('#helm09-key').click();page.wait_for_function('BAYPLAY.state.engine && BAYPLAY.state.startTimer===0')
    page.evaluate("""() => {const a=BAYPLAY.audio,chunks=[];window.__recorded09=null;const rec=new MediaRecorder(a.recordOutput.stream);rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{const f=new FileReader();f.onload=()=>window.__recorded09=f.result.split(',')[1];f.readAsDataURL(new Blob(chunks,{type:rec.mimeType}));};rec.start();setTimeout(()=>rec.stop(),11000);}""")
    page.wait_for_timeout(1600);page.locator('[data-gear09="1"]').click();page.locator('#helm09-throttle').evaluate('(e)=>{e.value=75;e.dispatchEvent(new Event("input",{bubbles:true}));}');page.wait_for_function('window.__recorded09!==null',timeout=25000)
    (OUT/'engine09_actual_graph.webm').write_bytes(base64.b64decode(page.evaluate('__recorded09')));r['recordedAudioGraph']=True
    page.locator('#helm09-key').click();page.wait_for_function('!BAYPLAY.state.engine');page.wait_for_timeout(800);r['shutdown']=page.evaluate('BAYPLAY.audio.inspect()');page.evaluate('BAYPLAY.setPaused(true)')
'''
s=s.replace(needle,extra+needle);p.write_text(s)
print('Repaired fitted key, bound terrain colors, angle-correct transparency, hull support and audible contact regression')
