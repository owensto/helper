from pathlib import Path
import sys,re
R=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/mnt/data/fleet_upgrade/work');p=R/'site/viewer.js';s=p.read_text()
s=s.replace('ATLAS Fleet 01','ATLAS Fleet 02')
s=s.replace("let interiorLoaded=false,interiorLoading=false;", "let interiorLoaded=false,interiorLoading=false,interiorError=null,sectionOffset=0,sectionSide=1,sectionMode='side';const sectionPlane={normal:V(0,0,-1),constant:0};")
s=s.replace("renderer.shadowMap.enabled=true;", "renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;")
s=s.replace("renderer.toneMappingExposure=1.15", "renderer.toneMappingExposure=1.0")
s=s.replace("normal.repeat.set(160,160)","normal.repeat.set(600,600)").replace("color:0x3e6a7b,roughness:.34,metalness:.06","color:0x345966,roughness:.43,metalness:.03").replace("normalScale:new T.Vector2(.22,.22)","normalScale:new T.Vector2(.10,.08)")
start=s.index('function env(){');end=s.index("env();",start)+len('env();')
s=s[:start]+'''function env(){const pm=new T.PMREMGenerator(renderer);const room=new T.RoomEnvironment();const target=pm.fromScene(room,.06);const old=scene.environment;scene.environment=target.texture;scene.environmentIntensity=.72;pm.dispose();room.dispose();if(old)old.dispose();dirty=true}env();'''+s[end:]
start=s.index('function ensureInterior(){');end=s.index('function lights(){',start)
s=s[:start]+'''function ensureInterior(){
 if(!['n','w'].includes(id)||interiorLoaded||interiorLoading)return;
 interiorLoading=true;interiorError=null;const token=request,asset=id;
 updateSectionUI();
 new T.GLTFLoader().load('assets/'+(asset==='n'?'ATLAS_N':'ATLAS_W')+'_Interior.glb',g=>{
  if(token!==request){g.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});return;}
  root.add(g.scene);
  g.scene.traverse(o=>{o.visible=true;if(!o.isMesh)return;o.material=o.material.clone();o.userData.base={opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite,color:o.material.color.clone()};o.userData.sectionRole='interior';o.receiveShadow=true;o.castShadow=true;meshes.push(o)});
  interiorLoaded=true;interiorLoading=false;styles();
 },null,e=>{if(token!==request)return;interiorLoading=false;interiorError='Interior could not be loaded. Retry the interior layer.';updateSectionUI();console.warn(interiorError,e);});
}
function isInside(o){return o.userData.sectionRole==='interior'||under(o,n=>n.startsWith('INT_')||n.startsWith('ENG_')||n.startsWith('SYS_'))}
function updateSectionUI(){
 const panel=$('#sectiontools');if(!panel)return;panel.hidden=!cut;
 $('#sectionstatus').textContent=interiorError||(interiorLoading?'Loading interior geometry…':id==='d'?'Fixed accommodation and candidate envelopes. Not pressure-qualified.':'Interior loaded • visual arrangement, not an operational layout.');
 $('#retryinside').hidden=!interiorError;
 $('#sectionreadout').textContent=sectionMode==='side'?Math.round(sectionOffset*100)+'% lateral section':'Roof removed for deck inspection';
}
function styles(){
 if(!ready)return;if(cut&&!interiorError)ensureInterior();
 const beam=Number.parseFloat(defs[id].beam)||10;
 sectionPlane.normal.set(0,0,-sectionSide);sectionPlane.constant=sectionOffset*beam*.5;
 for(const o of meshes){
  const b=o.userData.base,internal=isInside(o);let on=!internal,alpha=b.opacity;let planes=null;
  if(cut){
   if(id==='d'){
    on=internal||under(o,n=>n.startsWith('MOV_Tender')||n.startsWith('MOV_Cradle'));
    if(under(o,n=>n==='ENG_Pressure'||n==='ENG_Garages')){on=true;alpha=.10;}
    if(under(o,n=>n==='ENG_PreviousCradles'||n==='ENG_Clearances'||n==='ENG_Dimensions'))on=false;
    if(view==='Stowage'&&under(o,n=>n.startsWith('MOV_Shell'))){on=true;alpha=.18;}
   }else if(id==='n'||id==='w'){
    on=true;
    if(!internal){
     planes=[sectionPlane];
     if(sectionMode==='deck')on=false;
    }
   }
  }
  if(under(o,n=>n.startsWith('FX_')))on=false;
  o.visible=on;
  o.material.opacity=alpha;o.material.transparent=b.transparent||alpha<.99;
  o.material.depthWrite=b.depthWrite&&alpha>.9;
  o.material.clippingPlanes=planes;o.material.clipShadows=!!planes;
  if(cut&&['n','w'].includes(id))o.material.side=T.DoubleSide;
  else if(o.userData.originalSide!==undefined)o.material.side=o.userData.originalSide;
  o.material.needsUpdate=true;
 }
 water.visible=!dry&&!cut;
 $('#cutaway').classList.toggle('active',cut);$('#dry').classList.toggle('active',dry);
 updateSectionUI();renderer.shadowMap.needsUpdate=true;dirty=true;
}
'''+s[end:]
# Refined reflection / shadow scale follows actual selected vessel rather than a yacht-sized map on the small bay boat.
start=s.index('function lights(){');end=s.index('function ui(){',start)
s=s[:start]+'''function lights(){let dep=id==='n'?Math.max(0,-(root?.position.y||-2)-2):Math.max(0,-(root?.position.y||0)),u=smooth(1,18,dep),gold=lighting==='sunset';scene.background.lerpColors(new T.Color(gold?'#b2a6a0':'#b5c7ce'),new T.Color('#092d40'),u);scene.fog.color.copy(scene.background);sun.color.set(gold?'#ffd1a3':'#fff2df');sun.intensity=(gold?2.5:2.3)*(1-u*.45);hemi.intensity=1.15-u*.28;
 const L=Number.parseFloat(defs[id].length.replace('≈',''))||12,S=Math.max(7,L*.75);
 sun.position.set(gold?-S*.7:S*.55,S*.83-dep,S*.7);sun.target.position.set(0,-dep,0);
 Object.assign(sun.shadow.camera,{left:-S,right:S,top:S,bottom:-S,near:.1,far:S*5});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=L<15?.006:.035;
 document.body.classList.toggle('under',u>.3);renderer.shadowMap.needsUpdate=true;dirty=true;}
'''+s[end:]
s=s.replace("'Fishing bay','Garage','Interior']", "'Fishing bay','Garage','Dry core','Stowage','Interior']")
s=s.replace("if(name==='Profile')vec=[0,.04,1];", "if(name==='Profile')vec=[0,.04,1];if(cut&&['n','w'].includes(id))vec=[.10,.16,sectionSide*1.5];")
s=s.replace("'Interior':[[1,1.2,0],[54,9,13],[.18,.75,1.3]]", "'Interior':[[1,1.2,0],[54,9,13],[.18,.75,1.3]],'Dry core':[[1,1.2,0],[54,9,13],[.1,.32,1.5]],'Stowage':[[0,5,0],[62,18,14],[.12,.35,1.5]]")
s=s.replace("[58,11,14],[.1,.6,1.4]", "[58,9,14],[.08,.13,1.4]").replace("[91,14,17],[.13,.80,1.4]", "[91,13,17],[.07,.12,1.4]")
s=s.replace("if(q){tgt=q[0]", "if(q){tgt=q[0]")
s=s.replace("size=q[1];vec=q[2]}fit", "size=q[1];vec=q[2]}if(cut&&['n','w'].includes(id)){vec=[.08,.17,sectionSide*1.4];if(sectionMode==='deck')vec=[.03,1.6,.3];}fit")
s=s.replace("interiorLoaded=false;interiorLoading=false;dispose();", "interiorLoaded=false;interiorLoading=false;interiorError=null;sectionOffset=0;sectionSide=1;sectionMode='side';$('#sectiontools').hidden=true;dispose();")
s=s.replace("o.castShadow=!o.material.transparent;", "o.userData.originalSide=o.material.side;o.castShadow=!o.material.transparent;")
s=s.replace("if(n==='Interior'||n==='Control room'){cut=true;}", "if(['Interior','Control room','Dry core','Stowage'].includes(n)){cut=true;}")
s=s.replace("$('#cutaway').onclick=()=>{cut=!cut;styles();setView(cut?(id==='d'?'Garage':'Interior'):'Hero');if(cut&&id==='d')pose(.8)}", "$('#cutaway').onclick=()=>{playing=false;cut=!cut;sectionMode='side';view=cut?'Interior':'Hero';styles();setView(view)}")
s=s.replace("$('#retry').onclick=()=>load(id);", """$('#retry').onclick=()=>load(id);
$('#sectionrange').oninput=e=>{sectionOffset=+e.target.value/100;styles()};
$('#sectionflip').onclick=()=>{sectionSide*=-1;styles();setView(view)};
$('#sectiondeck').onclick=()=>{sectionMode=sectionMode==='side'?'deck':'side';styles();setView(view)};
$('#retryinside').onclick=()=>{interiorError=null;ensureInterior()};
$('#realism').onclick=()=>{playing=false;if(id!=='d')load('d');const wait=()=>{if(!ready){setTimeout(wait,150);return;}cut=true;view='Dry core';styles();setView('Dry core');$('#notes').showModal()};wait()};
""")
s=s.replace("get interiorReady(){return", "get interiorError(){return interiorError},get interiorReady(){return")
s=s.replace("cutaway(v){cut=!!v;styles()}", "cutaway(v){cut=!!v;styles();setView(cut?'Interior':'Hero')}")
s=s.replace("capture(v=true)", "section(value){sectionOffset=clamp(value,-1,1);styles()},capture(v=true)")
s=s.replace("cutaway:cut,engineeringValidated:false", "cutaway:cut,visibleInteriorMeshes:meshes.filter(o=>o.visible&&isInside(o)).length,clippedExteriorMeshes:meshes.filter(o=>o.visible&&o.material.clippingPlanes?.length).length,interiorLoadState:interiorLoading?'loading':interiorError?'error':interiorLoaded?'loaded':'not-requested',sectionOffset,sectionMode,engineeringValidated:false")
s=s.replace("window.FLEET.report=j;", "window.FLEET.report=j;")
s=s.replace("styles();setView(n)","view=n;styles();setView(n)")
s=s.replace("'The original blue-gray yacht, now carrying a dedicated T-top fishing boat.'", "'Luxury exterior / fixed dry-core study. The new Bay 25 is carried with its rigid top intact.'")
s=s.replace("'Rods, motor, antenna and livewell lid secure without removing the fixed hardtop.'", "'Sculpted console. Twin bolsters. Contoured fixed T-top. A fishing-first deck, not a recolored utility tender.'")
p.write_text(s)
p=R/'site/index.html';s=p.read_text().replace('FLEET REVIEW / 01','FLEET ATELIER / 02').replace('FLEET STUDIO / 01','FLEET ATELIER / 02').replace('ATLAS — Fleet Studio','ATLAS — Fleet Atelier 02')
s=s.replace('<div id="loader">','''<aside id="sectiontools" hidden><div class="eyebrow">SECTION INSPECTION</div><p id="sectionstatus">Interior loading…</p><label for="sectionrange">Hull section <span id="sectionreadout">0%</span></label><input id="sectionrange" type="range" min="-90" max="90" value="0" aria-label="Hull section position"><div class="sectionbuttons"><button id="sectionflip">Opposite side</button><button id="sectiondeck">Deck-only</button><button id="retryinside" hidden>Retry interior</button></div><small>Cut faces are a viewing aid, not openings or doors.</small></aside><div id="loader">''')
s=s.replace('<button id="reset"', '<button id="realism">Design basis</button><button id="reset"')
s=s.replace('<h2>Five assets.<br>Three distinct vessels.</h2>', '<h2>Fleet Atelier 02.<br>Appearance ≠ qualification.</h2>')
s=s.replace('<p><strong>First fleet review release, not the completed production plan.</strong>', '<p><strong>Refined modeling release, not a completed vessel design.</strong> The ATLAS-N and ATLAS-W section controls now clip the exterior rather than only fading a few panels. Bay 25 has a rebuilt top, console, helm seating and cowling, with new selected-envelope checks.</p><p><strong>ATLAS-D realism:</strong> Permanent dry-core accommodation stays fixed. The large nested upper shells remain speculative, surface-use exterior architecture—not collapsing occupied hotel decks. Tender recovery is a prescribed motion study. Dry garage opening/freeboard, pressure closures, complete clearances, mass/stability and emergency recovery remain open.</p><p><strong>Remaining work:</strong>')
s=s.replace('First fleet review release, not the completed production plan.','Appearance and inspection update, not engineering qualification.')
p.write_text(s)
p=R/'site/style.css';s=p.read_text();s+='''\n/* Fleet Atelier 02: clean section controls, correct hidden states. */
[hidden]{display:none!important}#sectiontools{position:fixed;right:24px;top:175px;z-index:6;width:255px;padding:17px;border:1px solid #b5c8cc90;border-radius:12px;background:#f1f5f2ed;box-shadow:0 12px 35px #14303a20;color:#243e49}#sectiontools p{font-size:12px;line-height:1.5;margin:9px 0}#sectiontools label{display:block;font-size:11px;font-weight:600}#sectiontools label span{float:right;font-weight:400}#sectionrange{width:100%;margin:13px 0;accent-color:#405A6D}.sectionbuttons{display:flex;gap:5px;flex-wrap:wrap}.sectionbuttons button{padding:7px;font-size:10px}#sectiontools small{display:block;font-size:10px;line-height:1.4;margin-top:10px;color:#647b84}.identity{max-width:210px}.identity h1{font-weight:450;letter-spacing:.08em}.capture #sectiontools{display:none!important}.capture .presentation{display:none!important}@media(max-width:900px){#sectiontools{right:10px;top:145px;width:205px;padding:11px}.identity{max-width:145px}#sectiontools p{font-size:10px}.sectionbuttons button{font-size:9px}#realism{font-size:10px}.controls .actions{flex-wrap:wrap}}
''';p.write_text(s)
print('Replaced fade-only cutaway with clipping, interior loading/error state, side/deck controls; improved lighting and shadow scale.')
