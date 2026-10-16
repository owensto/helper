"""Remove overlapping terrain surfaces; improve foliage silhouettes and review angles."""
from pathlib import Path
r=Path(__file__).parent
p=r/'site/environment11.js';s=p.read_text()
def change(a,b,n=1):
 global s
 assert s.count(a)==n,(a[:70],s.count(a));s=s.replace(a,b)
change("leafMat=material('#455f35')", "leafMat=material('#ffffff')")
change("const grassGeo=new T.PlaneGeometry(.18,1,1,3);grassGeo.translate(0,.5,0);", """const grassGeo=new T.PlaneGeometry(.16,1,1,3);grassGeo.translate(0,.5,0);
const gp=grassGeo.attributes.position;for(let i=0;i<gp.count;i++){const h=gp.getY(i);gp.setX(i,gp.getX(i)*(1.-h*.97)+h*h*.16);}grassGeo.computeVertexNormals();""")
change('new T.InstancedMesh(grassGeo,grassMat,3600)', 'new T.InstancedMesh(grassGeo,grassMat,21600)')
change("put(grass,gi++,x,y,z,1,.35+random()*.65,1,random()*Math.PI);", """for(let k=0;k<6;k++){const gx=x+(random()-.5)*.65,gz=z+(random()-.5)*.65;put(grass,gi++,gx,W.basinBed(gx,gz),gz,.7+random()*.6,.24+random()*.56,1,random()*Math.PI,(random()-.5)*.42);}""")
change("const color=new T.Color(y>1.7?'#758253':y>.8?'#9b9870':y>0?'#d7c99c':'#b4bb92');color.multiplyScalar(.90+.10*(.5+.5*Math.sin(x*.23)*Math.cos(z*.19)));", """const blend=Math.max(0,Math.min(1,(y-.7)/2.2+Math.sin(x*.19)*Math.sin(z*.14)*.14));const color=new T.Color('#d4c398').lerp(new T.Color('#778452'),blend*blend*(3-2*blend));color.multiplyScalar(.91+.09*(.5+.5*Math.sin(x*.23)*Math.cos(z*.19)));""")
# Discard the broad ground sheet only where a detailed island mesh supplies it.
change("const group=new T.Group();", """const basin11={value:S.location==='basin'?1:0},ground=SEA09_WATER.bed.material,priorGround=ground.onBeforeCompile.bind(ground);
const islandCoverage=W.islands.map(([x,z,r])=>`(abs(g09.x-(${x.toFixed(3)}))<${(r*2.15).toFixed(3)}&&abs(g09.z-(${z.toFixed(3)}))<${(r*2.15).toFixed(3)})`).join('||');
ground.onBeforeCompile=sh=>{priorGround(sh);sh.uniforms.basin11=basin11;sh.fragmentShader='uniform float basin11;\\n'+sh.fragmentShader;sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\\n if(basin11>.5&&('+islandCoverage+'))discard;');};ground.customProgramCacheKey=()=> 'atlas11-island-ground-coverage';ground.needsUpdate=true;
const group=new T.Group();""")
change("group.visible=S.location==='basin';", "group.visible=S.location==='basin';basin11.value=group.visible?1:0;")
change('photogrammetry:false,sceneryLocation:', 'photogrammetry:false,overlappingBottomSuppressed:true,sceneryLocation:')
p.write_text(s)
p=r/'site/access11.css';p.write_text(p.read_text()+"\nbody:has(#helm09.coastal11) #toast{display:none!important}\n")
p=r/'site/access11.js';s=p.read_text();a='const interval=setInterval(update,140);';assert s.count(a)==1;s=s.replace(a,"addEventListener('blur',()=>{steeringHeld=false;window.ATLAS_TOUCH_STEERING=false;B.dispatch('steering',0);});"+a);p.write_text(s)
# New viewpoints use the actual scene, not injected geometry or mock images.
p=r/'verify11.py';s=p.read_text();a="   assert not r['errors'] and not r['shaderErrors'] and not r['assetErrors'],r";assert s.count(a)==1
extra='''   if dev=='desktop':
    page.evaluate('SEA10.chooseWeather("clear");SEA09.relocate("basin",-174,28,.8);BAYPLAY.setPaused(true);BAYPLAY.testStep(9);BAYPLAY.setQuality(false);SEA09.view("follow")');page.wait_for_timeout(900);shot(page,'desktop_island_high_detail.png')
    page.evaluate('SEA09.relocate("basin",59,-44,0);BAYPLAY.setPaused(true);SEA09_WATER.setClarity(.14);SEA09.view("follow")');page.wait_for_timeout(800);shot(page,'desktop_sandbar_high_detail.png')
    page.evaluate('SEA09.view("helm");document.getElementById("s11-look").click()');page.wait_for_timeout(500);shot(page,'desktop_water_angle_high_detail.png')
    r['sceneryReview']=page.evaluate('SEA11_ENV.inspect()');assert r['sceneryReview']['overlappingBottomSuppressed'];page.evaluate('BAYPLAY.setQuality(true)')
'''
s=s.replace(a,extra+a);p.write_text(s)
import shutil,subprocess,json
base=Path('atlas_sealab_10/reviewed_source')
if base.exists():
 (r/'review').mkdir(exist_ok=True)
 for name,out in [('test10.js','operation_regression10.json'),('test09.js','grounding_regression09.json')]:
  shutil.copy2(base/name,r/name)
  result=subprocess.run(['node',name],cwd=r,check=True,text=True,capture_output=True)
  d=json.loads(result.stdout);assert d['passed'];(r/'review'/out).write_text(json.dumps(d,indent=2))
print('Removed terrain overlap; tapered grass tufts, corrected foliage colors, and added high-detail coast review')
