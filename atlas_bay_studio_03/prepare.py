from pathlib import Path
import os,json,shutil,sys,numpy as np
R=Path(os.environ['FLEET_ROOT']);sys.path.insert(0,str(R/'source'));from assemble import Doc
S=R/'site'
old=S/'assets/ATLAS_Bay_25.glb';shutil.copy2(old,S/'assets/ATLAS_Bay_25_Previous.glb')
# Selected geometric screen for the NEW standalone boat. It is NOT installed in the old Explorer.
d=Doc(R/'staging/ATLAS_Bay_25.glb');v=d.vertices(0,60);radius=2.18;heights=np.linspace(.8,1.8,1001)
gaps=np.array([radius-np.linalg.norm(v[:,1:3]+[h-2.4,0],axis=1).max() for h in heights]);h=float(heights[gaps.argmax()])
report={'revision':'Bay 25 / Studio 03','scope':'Standalone fishing-tender refinement. Other four fleet assets unchanged.',
 'integrated_into_explorer':False,'original_hull_length_m':7.5,'beam_reference_m':2.6,'full_secured_envelope_m':np.ptp(v,axis=0).tolist(),
 'candidate_barrel_screen':{'radius_m':radius,'center_y_m':2.4,'tested_lift_m':h,'minimum_static_radial_gap_m':float(gaps.max()),'passes_static_craft_only':bool(gaps.max()>0),'screen_scope':'Every rendered craft vertex in secured pose against ideal circular barrel. Not carrier, doorway, latches, loads, waves or full recovery path.'},
 'animation':{'rigid_top':True,'scale_channels':sum(c['target']['path']=='scale' for a in d.g['animations'] for c in a['channels']),'duration_s':60},
 'changes':['Rebuilt longitudinal hull, V-bottom and rising forepeak','Removed protruding lower foredeck/liner surfaces','Thinner rub rail and surface-following hull graphics','Swept rigid T-top with hollow fishing rod tubes','Three-sided wraparound windshield and sloped helm','Twin upholstered bolsters, tackle storage and clear side walkways','Closed livewell inspection lid and coordinated fishing fittings'],
 'engineering_validated':False,'remaining':['Full tender/garage and carrier interference analysis','Qualified construction and equipment selection','Integration of revised Bay 25 into Explorer','Further detailing of Chase 12, Explorer, submarine and surface ship']}
(S/'bay03_report.json').write_text(json.dumps(report,indent=2))
s=(S/'index.html').read_text().replace('FLEET ATELIER / 02','BAY STUDIO / 03')
s=s.replace('<title>ATLAS — Fleet Studio</title>','<title>ATLAS Bay 25 — Studio 03</title>')
s=s.replace('<button id="gray"','<button id="baycompare">Compare previous Bay</button><button id="gray"')
s=s.replace('<h2>Five assets.','<p><strong>Studio 03 refines Bay 25 only.</strong> The other four entries retain their Fleet 02 models. The new fishing boat is not yet substituted into Explorer; the separate candidate-bore screen is not a complete garage-fit approval.</p><h2>Five assets.')
s=s.replace('<p>The naval models','<p>The revised fishing boat has a rebuilt hull and cockpit, integrated rigid top, wraparound windshield and matched seating. Use Compare previous Bay to compare geometry from the same camera.</p><p>The naval models')
(S/'index.html').write_text(s)
s=(S/'viewer.js').read_text().replace("||'d';if(!defs[id])", "||'bay';if(!defs[id])")
s=s.replace("reverse=false,speed=1;", "reverse=false,speed=1,previousBay=false,restoreCamera=null;")
s=s.replace("sub:'T-top fishing tender'", "sub:'Studio 03 · fishing tender'")
s=s.replace("Sculpted console. Twin bolsters. Contoured fixed T-top. A fishing-first deck, not a recolored utility tender.","Rebuilt hull. Integrated hardtop. Wraparound glass. The first dedicated one-by-one refinement.")
s=s.replace("size:[9.3,4.2,3.3]", "size:[9.0,3.65,3.1]")
s=s.replace("const a=defs[id];$('#title')", "const a=defs[id],file=id==='bay'&&previousBay?'ATLAS_Bay_25_Previous.glb':a.file;$('#baycompare').hidden=id!=='bay';$('#baycompare').textContent=previousBay?'Show refined Bay':'Compare previous Bay';$('#title')")
s=s.replace("$('#download').href='assets/'+a.file", "$('#download').href='assets/'+file")
s=s.replace("new T.GLTFLoader().load('assets/'+a.file", "new T.GLTFLoader().load('assets/'+file")
s=s.replace("setGray(gray);setView();renderer.render", "setGray(gray);setView();if(restoreCamera){const c=restoreCamera;restoreCamera=null;pose(c.p);camera.position.fromArray(c.pos);controls.target.fromArray(c.target);view=c.view;controls.update();}renderer.render")
s=s.replace("gray?'#747F88':'#405A6D'", "gray?'#747F88':(id==='bay'&&!previousBay?'#35556D':'#405A6D')")
s=s.replace("window.FLEET={load,pose", "$('#baycompare').onclick=()=>{if(!ready||id!=='bay')return;restoreCamera={pos:camera.position.toArray(),target:controls.target.toArray(),view,p};previousBay=!previousBay;load('bay')};\nwindow.FLEET={load,pose")
s=s.replace("return{asset:id,progress:p", "return{previousBay,asset:id,progress:p")
s=s.replace("renderer.toneMappingExposure=.96", "renderer.toneMappingExposure=.93")
s=s.replace("'RODS, LIVEWELL, ANTENNA AND TROLLING MOTOR STOW'", "'RODS, ANTENNA AND TROLLING MOTOR STOW · LIDS SECURED'")
# Notes preserve old Explorer audit but don't relabel it as a new tender fit approval.
s=s.replace("<b>Bay 25 — updated geometric check</b>","<b>Fleet 02 Explorer integration — unchanged</b>")
(S/'viewer.js').write_text(s)
with (S/'style.css').open('a') as f:f.write('\n#baycompare{font-size:11px} .presentation{max-width:calc(100vw - 36px);flex-wrap:wrap} @media(max-width:700px){#baycompare{font-size:10px;padding:7px} .presentation{top:112px;right:14px}}\n')
(S/'README_STUDIO03.txt').write_text('ATLAS Bay 25 / Studio 03. Standalone Bay refined first; other models unchanged. Compare previous Bay holds the camera. New tender has not been substituted into Explorer. Source and Blender master included in the build artifact. No operating, structural or pressure qualification.\n')
print(json.dumps(report,indent=2))
