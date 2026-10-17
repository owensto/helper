"""Corrections from actual R2 rendering, with retained strict functional gates."""
from pathlib import Path
r=Path(__file__).parent/'source'
def patch(name,a,b):
 p=r/name;s=p.read_text();assert s.count(a)==1,(name,a[:75],s.count(a));p.write_text(s.replace(a,b))
# The photo camera may be a kilometre away from the boat. Move only visual water
# and terrain requests to that camera; physics and hull masking stay vessel-bound.
patch('patch14.py',"(site/'release14.json').write_text",'''patch('water09.js','40+860*Math.pow((n-80)/40,2)','40+5960*Math.pow((n-80)/40,2)')
patch('water09.js','const wx=Math.round(S.x/2)*2,wz=Math.round(S.z/2)*2;',"const focus14=window.SEA14?.visualFocus()||S;const wx=Math.round(focus14.x/2)*2,wz=Math.round(focus14.z/2)*2;")
patch('stream13.js',"const S=A.state,ox=Math.round(S.x/32)*32,oz=Math.round(S.z/32)*32,key=", "const S=A.state,focus14=window.SEA14?.visualFocus()||S,ox=Math.round(focus14.x/32)*32,oz=Math.round(focus14.z/32)*32,key=")
(site/'release14.json').write_text''')
patch('experience14.js',"position:[250,5.8,-218],target:[235,5,-380]", "position:[220,4.6,-270],target:[250,4.6,-360]")
patch('experience14.js',"position:[570,11,-225],target:[535,8,-95]", "position:[635,5.8,-110],target:[540,9,-51]")
patch('experience14.js',"const v=photoViews[key];if(!v)return;if(!photo)", "const v=photoViews[key];if(!v)return;if(!v.relative&&S.location!=='beaufort'){notice('Return to Beaufort for these waterfront views.');return;}if(!photo)")
patch('experience14.js',"photo.key=key;updatePhoto();", "photo.key=key;A.renderer.setPixelRatio(Math.max(effectiveScale,Math.min(devicePixelRatio||1,1.25)));updatePhoto();")
patch('experience14.js',"A.setPaused(was.paused);A.refresh();", "A.setPaused(was.paused);A.renderer.setPixelRatio(effectiveScale);A.refresh();")
patch('experience14.js',"window.SEA14={ready:true,options,", "window.SEA14={ready:true,visualFocus(){if(!photo||photoViews[photo.key].relative)return null;const p=photoViews[photo.key].position;return {x:p[0],z:p[2]};},options,")
# Read tide-linked render geometry only after an actual committed rendering hook.
patch('verify14.py',"BAYPLAY.testStep(75)');p.wait_for_timeout(300);r['lowTide']", "BAYPLAY.testStep(75)');p.wait_for_function('SEA14_COAST.inspect().tide===BAYPLAY.state.config.tide');r['lowTide']")
patch('verify14.py',"BAYPLAY.testStep(75)');p.wait_for_timeout(300);r['highTide']", "BAYPLAY.testStep(75)');p.wait_for_function('SEA14_COAST.inspect().tide===BAYPLAY.state.config.tide');r['highTide']")
patch('verify14.py',"shot(p,label+'_'+key+'.png');", "p.wait_for_timeout(300);p.wait_for_function('!SEA09_WATER.inspect().visualTilePending');r.setdefault('photoWater',[]).append(p.evaluate('({focus:SEA14.visualFocus(),waterPosition:BAYPLAY.coast.water.position.toArray(),physics:[BAYPLAY.state.x,BAYPLAY.state.z],pixelRatio:BAYPLAY.renderer.getPixelRatio()})'));shot(p,label+'_'+key+'.png');")
# Include labeled gear controls in the minimum target checks.
patch('verify14.py',"assert p.evaluate('document.documentElement.scrollWidth')<=w+1;", "r['gears']=p.locator('[data-gear09]').evaluate_all('(els)=>els.map(e=>{let b=e.getBoundingClientRect();return {w:b.width,h:b.height};})');assert all(g['w']>=44 and g['h']>=44 for g in r['gears']);assert p.evaluate('document.documentElement.scrollWidth')<=w+1;")
p=r/'experience14.css';p.write_text(p.read_text()+'''\n@media(max-height:560px) and (max-width:1000px){#helm09.sea14 .h09-dock .h09-key{grid-column:1/-1;width:100%}}\n''')
# Facade-local windows instead of a world-grid shader; details stay illustrative.
p=r/'coastal14.js';s=p.read_text();a=s.index(" if(kind==='building')code=`");b=s.index(" if(kind==='roof')code=",a)
s=s[:a]+" if(kind==='building')code=`float wall14=1.-smoothstep(.2,.7,abs(normalize(coastN14).y));float grain14=n14(coastP14.xz*.7);diffuseColor.rgb*=.84+.16*grain14;float line14=1.-smoothstep(.012,.03,abs(fract(coastP14.y/.19)-.5));diffuseColor.rgb*=1.-line14*wall14*.045;`;\n"+s[b:]
s=s.replace("kind==='rail'?.56:kind==='dockFloat'?.82:.94", "kind==='glass'?.22:kind==='rail'?.56:kind==='dockFloat'?.82:.94")
s=s.replace("kind==='rail'?.22:0", "kind==='glass'?.10:kind==='rail'?.22:0")
p.write_text(s)
p=r/'bake14.cjs';s=p.read_text();needle="const newTags=new Map("
helper=r'''// Inferred hipped roofs stay inside the mapped outline. No overhanging box
// is added around a concave footprint, and no surveyed-roof claim is made.
function pitchedRoof14(shape,pts,y,h){const flat=new T.ShapeGeometry(shape);flat.rotateX(-Math.PI/2);const g=flat.index?flat.toNonIndexed():flat,out=[];
 const rise=p=>{let distance=Infinity;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1),0,1);distance=Math.min(distance,Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz));}return Math.min(2.5,distance*.48);};
 function tri(a,b,c,d=0){let x=[[a,b,c],[b,c,a],[c,a,b]].map(t=>({t,l:Math.hypot(t[0][0]-t[1][0],t[0][1]-t[1][1])})).sort((a,b)=>b.l-a.l)[0];if(x.l>3&&d<8){let[u,v,w]=x.t,m=[(u[0]+v[0])/2,(u[1]+v[1])/2];tri(u,m,w,d+1);tri(m,v,w,d+1);}else for(let p of[a,b,c])out.push(p[0],y+h+.045+rise(p),p[1]);}
 const p=g.attributes.position;for(let i=0;i<p.count;i+=3)tri([p.getX(i),p.getZ(i)],[p.getX(i+1),p.getZ(i+1)],[p.getX(i+2),p.getZ(i+2)]);const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(out,3));roof.computeVertexNormals();add(roof,'roof','#677369');counts.inferredPitchedRoofs=(counts.inferredPitchedRoofs||0)+1;
}
function facade14(pts,y,h,id){const panel=(x,y,z,w,h,nx,nz,kind,col)=>{const g=new T.PlaneGeometry(w,h);g.rotateY(Math.atan2(nx,nz));g.translate(x,y,z);add(g,kind,col);};const area=pts.reduce((v,a,i)=>{const b=pts[(i+1)%pts.length];return v+a[0]*b[1]-b[0]*a[1];},0);const floors=Math.max(1,Math.min(5,Math.round(h/3)));for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<2.5||len>100)continue;const sign=area>0?1:-1,nx=sign*dz/len,nz=-sign*dx/len,angle=-Math.atan2(dz,dx),n=Math.max(1,Math.floor(len/4.0));for(let k=0;k<n;k++)for(let floor=0;floor<floors;floor++){const t=(k+.5)/n,x=a[0]+dx*t+nx*.026,z=a[1]+dz*t+nz*.026,wy=y+(floor+.48)*h/floors,wh=Math.min(1.55,h/floors*.55),ww=Math.min(1.05,len/n*.48);panel(x,wy,z,ww+.18,wh+.18,nx,nz,'trim','#d7d3c5');panel(x+nx*.033,wy,z+nz*.033,ww,wh,nx,nz,'glass',id%3?'#294344':'#3a4b49');if(len<25&&floor>0){for(const side of[-1,1])panel(x+dx/len*(ww/2+.20)*side,wy,z+dz/len*(ww/2+.20)*side,.22,wh,nx,nz,'trim','#526b62');}}}}
'''
assert s.count(needle)==1;s=s.replace(needle,helper+needle)
a="const roof=new T.ShapeGeometry(shape);roof.rotateX(-Math.PI/2);roof.translate(0,y+h+.035,0);add(roof,'roof','#7b766b');"
b="if(['house','bungalow','church'].includes(tags.building)||/House|Inn/.test(tags.name||''))pitchedRoof14(shape,pts,y,h);else{const roof=new T.ShapeGeometry(shape);roof.rotateX(-Math.PI/2);roof.translate(0,y+h+.035,0);add(roof,'roof','#7b766b');}if(Math.hypot(cx-200,cz+400)<1100)facade14(pts,y,h,f.id);"
assert s.count(a)==1;s=s.replace(a,b)
a="if(parkPoints)for(let i=0;i<45;i++){const x=80+rand()*380,z=-470+rand()*170;if(inside(x,z,parkPoints)&&isLand(x,z))oak(x,z,5.5+rand()*2.8,i%6===0?'palm':'oak');}"
b="if(parkPoints){let i=0;for(let x=30;x<465;x+=22)for(let z=-435;z< -282;z+=15){if(inside(x,z,parkPoints)&&isLand(x,z)){oak(x+(rand()-.5)*3,z+(rand()-.5)*3,6.2+rand()*2.8,i++%9===0?'palm':'oak');}}}"
assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
p=r/'README.md';p.write_text(p.read_text()+'''\n## Reviewed visual corrections
The first rendered candidate exposed an obsolete optical-layer anchor; the effective scattering layer is now patched without removing its guard. The next inspected view exposed a distant photo-camera water edge and repetitive facade windows. Visual water/terrain requests now follow the scenic camera without moving the physical vessel; outer water rings extend without more vertices. Facade-local window rectangles and residential roof forms are inferred within mapped outlines. Paused photo mode renders sharply and restores prior graphics/pause state. Architectural detail remains illustrative. Tide-linked mesh checks wait for a committed rendering hook rather than reading a prior frame. The original 600,000-triangle scenery budget is retained; local finite facade panels replace an over-budget box-per-window attempt.\n''')
print('Applied actual render/camera, finite facade/roof, park canopy and committed tide-read corrections')
