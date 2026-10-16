from pathlib import Path
import re,shutil
r=Path(__file__).parent;site=r/'site'
def patch(name,old,new):
 p=site/name;s=p.read_text();assert s.count(old)==1,(name,old[:80],s.count(old));p.write_text(s.replace(old,new))
for name in ['waves11.js','environment11.js','access11.js','access11.css']:shutil.copy2(r/name,site/name)
patch('index.html','<script defer src="command-motion.js">','<script defer src="waves11.js"></script><script defer src="command-motion.js">')
patch('index.html','</head>','<link rel="stylesheet" href="access11.css"><script defer src="environment11.js"></script><script defer src="access11.js"></script></head>')
p=site/'command-motion.js';s=p.read_text();s,n=re.subn(r"CommandMotion.surface=\(x,z,t,p='calm'\)=>\{.*?\};", "CommandMotion.surface=(x,z,t,p='calm')=>G.Sea11Waves.sample(x,z,t,(presets[p]||presets.calm).amp).height;",s);assert n==1;p.write_text(s)
p=site/'coast.js';s=p.read_text();old='float sea(vec2 p){return uBayAmp*(sin(dot(p,vec2(.13,.07))-1.1*uBayTime)+.48*sin(dot(p,vec2(.05,-.18))-.92*uBayTime)+.16*sin(dot(p,vec2(.37,.21))-1.8*uBayTime));}';assert old in s;s=s.replace(old,'${Sea11Waves.glsl}');p.write_text(s)
p=site/'water09.js';s=p.read_text();a=s.index(' float dx09=');b=s.index('objectNormal=normalize',a);s=s[:a]+' vec2 slope11=seaSlope11(wp09);float dx09=slope11.x;float dz09=slope11.y;\n '+s[b:];p.write_text(s)
patch('app.js','Math.cos(lookYaw)*Math.cos(lookPitch),Math.sin(lookPitch),Math.sin(lookYaw)','Math.cos(lookYaw+(window.SEA11?.lookOffset||0))*Math.cos(lookPitch),Math.sin(lookPitch),Math.sin(lookYaw+(window.SEA11?.lookOffset||0))')
patch('app.js','f.applyQuaternion(boat.quaternion);','if(window.SEA11?.options.steadyCamera)f.applyAxisAngle(V(0,1,0),-state.heading);else f.applyQuaternion(boat.quaternion);')
# Preserve workflow tests' Node entrypoint, using the same new CPU wave function.
p=site/'command-motion.js';s=p.read_text().replace("const Base=G.BayMotion", "if(!G.Sea11Waves&&typeof require==='function')G.Sea11Waves=require('./waves11.js');\nconst Base=G.BayMotion");p.write_text(s)
p=site/'index.html';p.write_text(p.read_text().replace('maximum-scale=1','maximum-scale=5').replace('user-scalable=no','user-scalable=yes').replace('ATLAS Sea Lab 10 · At the Helm','ATLAS Sea Lab 11 · Coastal Drive'))
print('Shared waves, layered coast and accessible control surface integrated')
