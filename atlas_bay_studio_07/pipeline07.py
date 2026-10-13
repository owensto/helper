from pathlib import Path
import os,sys,json,hashlib
R=Path(os.environ['FLEET_ROOT']);S=R/'site'
mode=sys.argv[1]
if mode=='prepare':
 p=S/'viewer.js';t=p.read_text().replace('Studio 06 · coastal finish','Studio 07 · sculpted 300').replace('Show Studio 06','Show Studio 07')
 t=t.replace('The approved Bay silhouette. Refinished surfaces, a GPS antenna housing and coastal light. Engine installation and draft remain unqualified.','Pearl 300-class outboard. Six rod holders. Tailored cockpit and GPS. A refined visual model—not a rated boat.')
 t=t.replace("views:['Hero','Profile','Bow','Stern','Helm','Seating','Casting deck','T-top','Deck hardware','Outboard','Rod rack','GPS','Underbody']","views:['Hero','Showroom','Profile','Bow','Stern','Helm','Seating','Casting deck','T-top','Deck hardware','Outboard','Rod rack','GPS','Underbody']")
 t=t.replace("bay:{'Helm':","bay:{'Showroom':[[-.35,1.24,0],[8.3,3.18,2.65],[-1.25,.76,1.70]],'Helm':")
 t=t.replace("'Outboard':[[-3.8,.45,0],[2.6,1.95,2.3],[-1.4,.65,1.1]]","'Outboard':[[-4.20,.38,0],[1.55,1.70,1.20],[-1.55,.62,1.35]]")
 t=t.replace('o.castShadow=!o.material.transparent;','o.castShadow=!o.material.transparent&&!(o.material.transmission>0.1);');p.write_text(t)
 p=S/'index.html';t=p.read_text().replace('ATLAS — Fleet Atelier 02','ATLAS Bay 25 — Studio 07').replace('BAY STUDIO / 06','BAY STUDIO / 07').replace('Compare Studio 04','Compare Studio 05').replace('Studio 06:','Studio 07:')
 t=t.replace('a visual-quality pass on the standalone Bay.','a revised pearl 300 hp-class outboard, contoured lower unit, tailored finishes and coastal lighting on the standalone Bay.')
 t=t.replace('Fleet Atelier 02.<br>Appearance ≠ qualification.','Bay Studio 07.<br>Appearance ≠ qualification.')
 t=t.replace('ATLAS-D preserves the prior yacht design and its speculative upper-shell transformation. The new Bay 25 fishing tender replaces the utility tender. Its rigid T-top, outboard and secured fishing gear remain present during recovery.','ATLAS-D is unchanged and still carries the older Fleet 02 fishing tender. This standalone Studio 07 Bay has not been integrated into its garage. The yacht transformation remains speculative.')
 t=t.replace('href="release_report.json"','href="bay07_report.json"');p.write_text(t)
 p=S/'quality06.js';t=p.read_text().replace('S.backgroundIntensity=.88','S.backgroundIntensity=.82').replace('S.environmentIntensity=.68','S.environmentIntensity=.82').replace('sun.intensity=2.1','sun.intensity=1.75').replace('hemi.intensity=.28','hemi.intensity=.36').replace('fill.intensity=.32','fill.intensity=.38').replace('R.toneMappingExposure=.95','R.toneMappingExposure=.93');p.write_text(t)
 t=Path('atlas_bay_studio_06/verify06.py').read_text().replace('/tmp/bay06/review','/tmp/bay07/review')
 t=t.replace("['Seating','Helm','Rod rack','GPS','Outboard']","['Showroom','Seating','Helm','Rod rack','GPS','Outboard']")
 t=t.replace("item['GPS_housing']=True","item['GPS_housing']=True;assert page.evaluate(\"FLEET.model.getObjectByName('ST07_ENGINE_Vessel')!==undefined\");item['new_engine_geometry']=True")
 t=t.replace("page.evaluate('FLEET.setView(\"Hero\")');before","page.evaluate('FLEET.setView(\"Showroom\");FLEET.capture(true)');page.wait_for_timeout(300);page.screenshot(path=str(OUT/f'{device}_bay_clean.png'));page.evaluate('FLEET.capture(false)');before")
 (R/'verify07.py').write_text(t)
elif mode=='audit':
 import numpy as np
 from scipy.spatial import cKDTree
 sys.path.insert(0,str(R/'source'));from assemble import Doc
 report=json.loads((S/'bay07_report.json').read_text());report['native_preservation']={}
 for stem in ['ATLAS_Bay_25','ATLAS_Bay_25_Shallow_Study']:
  a=Doc(R/'staging'/f'{stem}.glb');d=Doc(S/'assets'/f'{stem}.glb');check={}
  for n in ['EX_Hull','FIXED_TTop']:
   av=a.vertices(a.node(n));dv=d.vertices(d.node(n));dist=float(max(cKDTree(av).query(dv)[0].max(),cKDTree(dv).query(av)[0].max()));assert dist<1e-5,(n,dist);check[n]=dist
  tracks=[c for an in d.g.get('animations',[]) for c in an['channels']];assert len(tracks)==8;assert not any(c['target']['path']=='scale' for c in tracks)
  assert d.node('ST07_ENGINE_Vessel')>=0;assert d.node('DT06_GPS_Vessel')>=0
  report['native_preservation'][stem]=check;report['assets'][stem]['browser_bytes']=(S/'assets'/f'{stem}.glb').stat().st_size
 report['unchanged_fleet']={}
 for name in ['ATLAS_D.glb','ATLAS_N.glb','ATLAS_N_Interior.glb','ATLAS_W.glb','ATLAS_W_Interior.glb','ATLAS_Chase_12.glb']:
  a=hashlib.sha256((Path('/tmp/bay07-base/atlas_bay_studio_06/live/assets')/name).read_bytes()).hexdigest();b=hashlib.sha256((S/'assets'/name).read_bytes()).hexdigest();assert a==b,name;report['unchanged_fleet'][name]=b
 (S/'bay07_report.json').write_text(json.dumps(report,indent=2))
else:raise SystemExit('Unknown mode')
