"""Apply the final-pass builder/test delta exactly once before build13.py."""
from pathlib import Path
r=Path(__file__).resolve().parent
p=r/'build13.py';s=p.read_text();old="subprocess.run(['node',str(ROOT/'bake-coast13.cjs'),str(SITE)],check=True)";assert s.count(old)==1 and "ROOT/'polish13.py'" not in s;s=s.replace(old,"subprocess.run([sys.executable,str(ROOT/'polish13.py')],check=True)\n"+old)
old="assert (SITE/f).read_bytes()==(BASE/f).read_bytes(),f";assert s.count(old)==1;s=s.replace(old,"if f=='operations10.js':assert (SITE/f).read_text().replace(\"A.scene.fog.density=w.fog*(S.location==='beaufort'&&w.rain<.15&&w.cloud<.5?.55:1);\",\"A.scene.fog.density=w.fog;\")==(BASE/f).read_text(),f\n else:assert (SITE/f).read_bytes()==(BASE/f).read_bytes(),f");p.write_text(s)
p=r/'bake-coast13.cjs';s=p.read_text();old='Buffer.from(o.pixels.buffer)]);const {heights,colors,pixels,...meta}=o;';assert s.count(old)==1;s=s.replace(old,'Buffer.from(o.pixels.buffer),Buffer.from(o.normals.buffer)]);const {heights,colors,pixels,normals,...meta}=o;');p.write_text(s)
p=r/'test13.cjs';s=p.read_text();s=s.replace("'waves11.js','operations10.js','assets/beaufort.json'", "'waves11.js','assets/beaufort.json'");anchor="test('Indexed cold lookup";assert s.count(anchor)==1;s=s.replace(anchor,"test('Weather runtime differs only by scoped fair-weather visible haze',()=>{assert.equal(fs.readFileSync(path.join(site,'operations10.js'),'utf8').replace(\"A.scene.fog.density=w.fog*(S.location==='beaufort'&&w.rain<.15&&w.cloud<.5?.55:1);\",\"A.scene.fog.density=w.fog;\"),fs.readFileSync(path.join(base,'operations10.js'),'utf8'));return {};});\n"+anchor)
a="return{samples:16641};";assert s.count(a)==1;s=s.replace(a,"assert.equal(r.normals.length,16641*3);for(let i=0;i<16641;i++){assert(Math.abs(Math.hypot(...r.normals.slice(i*3,i*3+3))-1)<1e-6);assert(r.normals[i*3+1]>0);}return{samples:16641,normals:16641};");p.write_text(s)
p=r/'verify13.py';s=p.read_text();anchor="    page.evaluate('BAYPLAY.setQuality(false)');";assert s.count(anchor)==1
extra="""    page.evaluate('SEA10.chooseWeather("clear");BAYPLAY.testStep(10);BAYPLAY.setPaused(true);SEA09.view("helm")');shot(page,dev+'_dry_cockpit.png')
    page.evaluate('''()=>{const A=BAYPLAY;A.capturePaused=true;A.camera.position.set(-180,24,-50);A.camera.lookAt(-50,5,-310);A.camera.updateMatrixWorld(true);SEA06.beforeRender();A.renderer.render(A.scene,A.camera)}''')
    try:page.screenshot(path=str(OUT/(dev+'_waterfront_detail.png')),timeout=60000)
    finally:page.evaluate('BAYPLAY.capturePaused=false;SEA09.view("follow")')
""";s=s.replace(anchor,extra+anchor);p.write_text(s)
print('Prepared final visual-only refinements and stronger rendered inspection; retained existing gates')
