#!/usr/bin/env python3
"""Reproducible Beaufort cruise from exact received owner assets. Never patches the input.
BASE14: extracted R3 artifact directory; EASY4: exact V4 atlas_easy_helm directory.
"""
from pathlib import Path
import os,json,hashlib,gzip,shutil,collections,math,array,sys,io
HERE=Path(__file__).resolve().parent
BASE=Path(os.environ['BASE14']).resolve();EASY=Path(os.environ['EASY4']).resolve()
OUT=Path(os.environ.get('CRUISE_OUT',HERE/'site')).resolve()
sha=lambda b:hashlib.sha256(b).hexdigest()
def patch(p,a,b):
 s=p.read_text();assert s.count(a)==1,(str(p),a[:100],s.count(a));p.write_text(s.replace(a,b))
def compact(p,d):p.write_text(json.dumps(d,separators=(',',':'),sort_keys=True)+'\n')
assert not OUT.exists(),'Output must be a new separate directory'
assert BASE not in OUT.parents and OUT not in BASE.parents
assert sha((BASE/'candidate.json').read_bytes())=='29a2593c7a093627d54b2a001cd73fb55e69a01c39dc985c3dc0e99109e8afd3','Artifact manifest changed'
candidate=json.loads((BASE/'candidate.json').read_text())
assert candidate['source_commit']=='b5abae9ac7715d30533e4134ec45b8a092d6eb44'
for n,h in candidate['files'].items():assert sha((BASE/'site'/n).read_bytes())==h,n
EASY_PINS={'motor-music.js': '80fcd4e4ca87301c8c529fec3f7500bcb7824f52912a183652227b81a596367d', 'motor-music.css': '01d41a29a734a26cd0efa356da316458b4de66b799a96cf2bcf320e04f0ee4dd', 'cruise-audio.js': '1854b27b64cdb647a1ab150f5324a1abf273206301eca6c9184309119186fe56', 'cruise-audio.css': 'ac6d2ece149892c726e2eeac2097f8362811eb5049478de2261a7408768d5131', 'water-refinements.js': '9eac6f96771b8df996882c73c0c300078bef5a4ded28b7977824e9245bc581b3'}
for n,h in EASY_PINS.items():assert sha((EASY/n).read_bytes())==h,n
shutil.copytree(BASE/'site',OUT)
addon=OUT/'cruise';addon.mkdir();world=addon/'world';world.mkdir()
for n in ['stream-core.js','coast-stream.js','trip-policy.js','cruise-ui.js','cruise.css']:shutil.copy2(HERE/n,addon/n)
for n in ['motor-music.js','motor-music.css','cruise-audio.js','cruise-audio.css','water-refinements.js']:shutil.copy2(EASY/n,addon/n)
# Lossless partition: every original quantized vertex/normal/color survives byte for byte.
m=json.loads((OUT/'assets/beaufort_mesh14.json').read_text());raw=(OUT/'assets/beaufort_mesh14.bin').read_bytes();assert sha(raw)==m['meshSHA256']
foundationKinds={'land','bank','road','bridge','wood','dockFloat','seawall'};groups=collections.defaultdict(list)
for c in m['chunks']:
 key='foundation' if c['kind'] in foundationKinds else c['key'].split(':',1)[1].replace(':','_');groups[key].append(c)
tiles=[];foundation=None;wire=0
for key,items in sorted(groups.items()):
 parts=[];chunks=[];offset=0
 for c in items:
  b=raw[c['offset']:c['offset']+c['bytes']];assert len(b)==c['bytes'];parts.append(b);chunks.append({**c,'offset':offset});offset+=len(b)
 data=b''.join(parts);stream=io.BytesIO()
 with gzip.GzipFile(fileobj=stream,mode='wb',filename='',compresslevel=9,mtime=0) as gz:gz.write(data)
 compressed=stream.getvalue();name=key+'.bin';(world/name).write_bytes(data);(world/(name+'.gz')).write_bytes(compressed);wire+=len(compressed)
 boxes=[]
 for c,part in zip(items,parts):
  p=array.array('h');p.frombytes(part[:c['count']*6])
  if sys.byteorder!='little':p.byteswap()
  boxes.append([min(p[0::3])*c['scale']+c['position'][0],min(p[2::3])*c['scale']+c['position'][2],max(p[0::3])*c['scale']+c['position'][0],max(p[2::3])*c['scale']+c['position'][2]])
 loX=min(b[0] for b in boxes);hiX=max(b[2] for b in boxes);loZ=min(b[1] for b in boxes);hiZ=max(b[3] for b in boxes)
 x=(loX+hiX)*.5;z=(loZ+hiZ)*.5
 t={'id':key,'url':name+'.gz','sha256':sha(data),'wireSHA256':sha(compressed),'bytes':len(data),'compressedBytes':len(compressed),'x':x,'z':z,'radius':math.hypot(hiX-loX,hiZ-loZ)*.5,'bounds':[loX,loZ,hiX,hiZ],'chunks':chunks}
 if key=='foundation':foundation=t
 else:tiles.append(t)
manifest={k:v for k,v in m.items() if k not in ['chunks','bytes','meshSHA256','version']}
manifest.update({'version':1,'source':candidate['source_commit'],'originalMeshSHA256':sha(raw),'bytes':len(raw),'foundation':foundation,'tiles':tiles,'finiteMappedRegion':True,'notNavigation':True,'physicsResidencyIndependent':True})
compact(world/'manifest.json',manifest)
coast=OUT/'coastal14.js';s=coast.read_text();begin=s.index('base.load=async function');end=s.index('window.SEA14_COAST=',begin)
s=s[:begin]+'AtlasCruiseCoast.bind({T,base,material,report,clock,tide,wind,wet});\n'+s[end:];coast.write_text(s)
# Apply the reviewed practice-state correction in the NEW copied candidate only.
p=OUT/'experience14.js'
assert sha(p.read_bytes())=='058da325d7720e89d0e56feebdef854715f74ae699f1034f71832cedf9aa9ffb'
patch(p,"nav.hidden=false;$('helm09-close').click();SEA11.setOption('docking',true);","nav.hidden=false;$('helm09-close').click();root.classList.toggle('s14-tools-open',!$('helm09-panel').hidden);root.classList.toggle('s11-panel-open',!$('helm09-panel').hidden);if(!$('helm09-mapcard').hidden)SEA09.toggleMap();root.classList.toggle('s12-map-open',!$('helm09-mapcard').hidden);SEA11.setOption('docking',true);")
# Index order is explicit: one shared wave field installed before physics/shader use.
p=OUT/'index.html'
patch(p,'<script defer src="waves11.js"></script>','<script defer src="waves11.js"></script><script defer src="cruise/water-refinements.js"></script>')
patch(p,'<script defer src="coastal14.js"></script>','<script defer src="cruise/stream-core.js"></script><script defer src="cruise/coast-stream.js"></script><script defer src="coastal14.js"></script>')
extra='\n'+''.join('<link rel="stylesheet" href="cruise/'+n+'">\n' for n in ['motor-music.css','cruise-audio.css','cruise.css'])+''.join('<script defer src="cruise/'+n+'"></script>\n' for n in ['motor-music.js','cruise-audio.js','trip-policy.js','cruise-ui.js'])
patch(p,'</head>',extra+'</head>')
# The old reports are not evidence for this integrated candidate.
(OUT/'browser_validation.json').write_text(json.dumps({'status':'NOT_RUN','browserVerified':False,'reason':'Prior administrator navigation restriction retained; no alternate browser runner used','inheritedDesktopSource':candidate['source_commit']},indent=2))
compact(OUT/'cruise-release.json',{'name':'ATLAS Beaufort Cruise','status':'PUBLIC_REVIEW_CANDIDATE','base14':candidate['source_commit'],'baseMusic':'97587a642829bc99bb4d408669b92cc3df1463e9','streaming':True,'finiteMappedRegion':True,'newDockGeometry':False,'inheritedPiers':m['counts']['piers'],'fullMarineValidation':False,'browserVerified':False,'multiplayer':False,'counts':m['counts']})
(OUT/'_headers').write_text('/cruise/world/*\n  Cache-Control: public, max-age=31536000, immutable\n')
# No font payloads or hidden runtime credentials are packaged.
assert not any(p.suffix.lower() in ['.woff','.woff2','.otf','.ttf'] for p in OUT.rglob('*'))
changed=[n for n,h in candidate['files'].items() if sha((OUT/n).read_bytes())!=h]
assert sorted(changed)==['browser_validation.json','coastal14.js','experience14.js','index.html'],changed
report={'passed':True,'source14':candidate['source_commit'],'inputFilesVerified':len(candidate['files']),'changedOwnerCopies':changed,'originalSceneryBytes':len(raw),'foundationBytes':foundation['bytes'],'detailTiles':len(tiles),'totalTileCompressedBytes':wire,'originalTriangleCount':m['triangles'],'collidersRetained':len(m['colliders']),'newPhysicsCoefficients':False,'sharedWakeEnvelopeChanged':True,'browserVerified':False}
compact(HERE/'build-report.json',report);print(json.dumps(report,indent=2))
