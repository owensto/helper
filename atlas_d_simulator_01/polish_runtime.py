"""Idempotent, workstream-local source corrections from public runtime testing."""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
p=ROOT/'src/atlas-d.js';s=p.read_text()
if 'ATLAS_D_FALLBACK_02' not in s:
    def replace(old,new):
        global s
        assert s.count(old)==1,old
        s=s.replace(old,new)
    replace("const BOARD_ID='atlasd-proving',v=(...a)=>new T.Vector3(...a);", "const BOARD_ID='atlasd-proving',v=(...a)=>new T.Vector3(...a);\n// ATLAS_D_FALLBACK_02: retain every original yacht mesh; lower only fallback rendering cost.\nlet lowDetail=false,smoothWaterGeometry=null;")
    replace('<button id="ad-pause">Pause</button>', '<button id="ad-detail">Detail: auto</button><button id="ad-pause">Pause</button>')
    replace("title:document.title,pixelRatio:A.renderer.getPixelRatio()};", "title:document.title,pixelRatio:A.renderer.getPixelRatio(),shadowEnabled:A.renderer.shadowMap.enabled,waterGeometry:A.coast.water.geometry};")
    replace("last=performance.now();acc=0;setView('orbit');draw(0);sync();", "setDetail(!!G.SEA_SOFTWARE||innerWidth<700);\n    last=performance.now();acc=0;setView('orbit');draw(0);last=performance.now();sync();")
    replace("A.renderer.setPixelRatio(saved.pixelRatio);A.capturePaused=", "A.renderer.setPixelRatio(saved.pixelRatio);A.renderer.shadowMap.enabled=saved.shadowEnabled;A.coast.water.geometry=saved.waterGeometry;A.capturePaused=")
    replace("function command(name,value){", """function setDetail(low){
  lowDetail=!!low;
  A.renderer.setPixelRatio(Math.min(devicePixelRatio||1,lowDetail?(G.SEA_SOFTWARE?0.35:0.65):1.25));
  A.renderer.shadowMap.enabled=!lowDetail&&!!saved?.shadowEnabled;
  if(lowDetail&&!smoothWaterGeometry){
    smoothWaterGeometry=new T.PlaneGeometry(1800,1800,80,80);smoothWaterGeometry.rotateX(-Math.PI/2);
    const pos=smoothWaterGeometry.attributes.position,uv=smoothWaterGeometry.attributes.uv;
    const warp=value=>{const n=Math.abs(value)/7.5;return Math.sign(value)*(n<=80?n*0.5:40+860*((n-80)/40)**2);};
    for(let i=0;i<pos.count;i++){const x=warp(pos.getX(i)),z=warp(pos.getZ(i));pos.setX(i,x);pos.setZ(i,z);uv.setXY(i,x/1800+0.5,0.5-z/1800);}
    pos.needsUpdate=true;uv.needsUpdate=true;smoothWaterGeometry.computeBoundingSphere();
  }
  if(saved)A.coast.water.geometry=lowDetail?smoothWaterGeometry:saved.waterGeometry;
  $('ad-detail').textContent=lowDetail?'Detail: smooth':'Detail: high';
}
function command(name,value){""")
    replace("$('ad-exit').onclick=exit;$('ad-pause').onclick=", "$('ad-detail').onclick=()=>setDetail(!lowDetail);$('ad-exit').onclick=exit;$('ad-pause').onclick=")
    replace("if(dt>1.5&&!state.paused)","if(dt>4&&!state.paused)")
    replace("acc+=Math.min(dt,1.5);", "acc+=Math.min(dt,4);")
    replace("sourceAsset:status.asset,sourceRevision:7,multiplayer:false,simulationOnly:true,", "sourceAsset:status.asset,sourceRevision:7,multiplayer:false,simulationOnly:true,\n  pixelRatio:A.renderer.getPixelRatio(),detail:lowDetail?'smooth':'high',softwareRendering:!!G.SEA_SOFTWARE,")
if 'ATLAS_D_PORTRAIT_03' not in s:
    old="  const desired=local(eye);"
    new="""  // ATLAS_D_PORTRAIT_03: dolly exterior views back to fit portrait aspect.
  if((view==='follow'||view==='subsea')&&innerWidth<innerHeight){const zoom=Math.max(1,0.92/(innerWidth/innerHeight));eye[0]*=zoom;eye[2]*=zoom;}
  const desired=local(eye);"""
    assert s.count(old)==1,old
    s=s.replace(old,new)
p.write_text(s)
css=ROOT/'src/atlas-d.css';text=css.read_text()
if 'ATLAS_D_FALLBACK_02' not in text:
    text+='\n/* ATLAS_D_FALLBACK_02: keep the phone header readable with the detail switch. */\n@media(max-width:600px){#ad-root #ad-detail{position:absolute;right:0;top:60px;font-size:9px;min-height:29px;max-width:90px;padding:4px 7px}#ad-root .ad-header-right{max-width:165px}}\n'
    css.write_text(text)
print('Original yacht geometry retained; smooth fallback uses 80-segment shared-wave water, reduced render resolution and portrait-fitted exterior cameras.')
