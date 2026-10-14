from pathlib import Path
from datetime import datetime, timezone
import json,time,hashlib,requests
from shapely.geometry import shape,mapping,box
from shapely.validation import make_valid
BASE='https://encdirect.noaa.gov/arcgis/rest/services/encdirect/'
BBOX=[-80.715,32.370,-80.600,32.470]
OUT=Path('atlas_beaufort_04/data');OUT.mkdir(parents=True,exist_ok=True)
s=requests.Session();s.headers['User-Agent']='ATLAS-Beaufort-simulation/04'
def get(url,p):
 for i in range(3):
  try:
   r=s.get(url,params=p,timeout=60);r.raise_for_status();j=r.json()
   if 'error' in j:raise RuntimeError(str(j['error']))
   return j
  except Exception:
   if i==2:raise
   time.sleep(2+i)
def fetch(service,suffix):
 base=BASE+service+'/MapServer';meta=get(base,{'f':'json'})
 found=[l for l in meta['layers'] if l['name'].split('.',1)[-1]==suffix]
 if not found:return []
 lid=found[0]['id'];url=f'{base}/{lid}/query'
 p={'f':'json','where':'1=1','geometry':','.join(map(str,BBOX)),'geometryType':'esriGeometryEnvelope','inSR':4326,'spatialRel':'esriSpatialRelIntersects','returnIdsOnly':'true'}
 ids=get(url,p).get('objectIds') or []
 if len(ids)>15000:raise RuntimeError('Query unexpectedly large')
 fs=[]
 for offset in range(0,len(ids),300):
  data=get(url,{'f':'geojson','objectIds':','.join(map(str,ids[offset:offset+300])),'outFields':'*','outSR':4326,'returnZ':'true','returnGeometry':'true'})
  if data.get('exceededTransferLimit'):raise RuntimeError('Truncated feature batch')
  for f in data.get('features',[]):
   if not f.get('geometry'):continue
   g=make_valid(shape(f['geometry'])).intersection(box(*BBOX))
   if g.is_empty:continue
   if g.geom_type not in ('Point','MultiPoint'):g=g.simplify(.000018,preserve_topology=True)
   keep=['OBJECTID','DRVAL1','DRVAL2','VERDAT','DSNM','OBJNAM','Z','SORDAT','SORIND','QUASOU','VALSOU','COLOUR','CATLAM','VERCLR']
   props={k:v for k,v in f.get('properties',{}).items() if k in keep};props.update(service=service,layer=lid)
   fs.append({'type':'Feature','geometry':mapping(g),'properties':props})
 print(service,suffix,len(fs),flush=True);return fs
roles={'land':'Land_Area','depthAreas':'Depth_Area','soundings':'Sounding_point','datums':'Sounding_Datum_area','bridges':'Bridge_line','buoys':'Buoy_Lateral_point'}
combined={k:[] for k in roles};errors=[]
for service in ['enc_harbour','enc_approach']:
 for role,suffix in roles.items():
  try:combined[role].extend(fetch(service,suffix))
  except Exception as e:errors.append({'service':service,'role':role,'error':str(e)});print(errors[-1],flush=True)
for k,fs in combined.items():
 seen=set();unique=[]
 for f in fs:
  key=json.dumps([f['geometry'],f['properties'].get('DRVAL1'),f['properties'].get('DRVAL2'),f['properties'].get('Z')],sort_keys=True)
  if key not in seen:seen.add(key);unique.append(f)
 combined[k]=unique
if not combined['land'] or not(combined['soundings'] or combined['depthAreas']):raise RuntimeError('No usable real geography/depth coverage; do not fabricate')
payload={'title':'Beaufort, South Carolina / NOAA ENC Direct snapshot','origin':{'lat':32.4267,'lon':-80.6770},'bbox':BBOX,'retrievedUTC':datetime.now(timezone.utc).isoformat(),'source':BASE,'attribution':'NOAA Office of Coast Survey / ENC Direct; generalized for simulation. NOT FOR NAVIGATION.','units':'Depth in metres relative to source chart datum; no live tide correction.','depthMethod':'Nearest sounding within 120 m and containing depth band; otherwise band, otherwise unknown. Sonar interpolation is simulated.','errors':errors,'counts':{k:len(v) for k,v in combined.items()},**combined}
p=OUT/'beaufort.json';p.write_text(json.dumps(payload,separators=(',',':')))
(OUT/'summary.json').write_text(json.dumps({'counts':payload['counts'],'retrievedUTC':payload['retrievedUTC'],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'errors':errors},indent=2));print((OUT/'summary.json').read_text())
