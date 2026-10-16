"""One build-time map snapshot, never per player. No satellite scraping."""
from pathlib import Path
import urllib.request,urllib.parse,json,time,hashlib
r=Path(__file__).parent/'external';r.mkdir(parents=True,exist_ok=True)
query='[out:json][timeout:65];(way["bridge"]["highway"](32.335,-80.735,32.485,-80.605);way["building"](32.418,-80.691,32.443,-80.665);way["highway"~"^(primary|secondary|tertiary)$"](32.390,-80.715,32.450,-80.645););out tags geom;'
data=None;errors=[]
for host in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
 try:
  req=urllib.request.Request(host,data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'AtlasBoatPrototype/12 (bounded Beaufort build-time snapshot)'})
  with urllib.request.urlopen(req,timeout=95) as response:data=json.load(response)
  if not data.get('elements'):raise ValueError('No mapped features returned')
  break
 except Exception as e:errors.append(str(e))
if data is None:raise RuntimeError('Beaufort vector source unavailable: '+'; '.join(errors))
features=[]
for e in data['elements']:
 tags=e.get('tags',{});geom=e.get('geometry',[])
 if len(geom)<2:continue
 kind='bridge' if tags.get('bridge') and tags.get('bridge')!='no' else 'building' if 'building' in tags else 'road'
 features.append({'id':e['id'],'kind':kind,'tags':tags,'points':[[p['lat'],p['lon']] for p in geom]})
assert any(x['kind']=='bridge' for x in features),'Missing bridge geometry'
result={'source':'OpenStreetMap contributors','license':'ODbL 1.0','attribution':'© OpenStreetMap contributors','copyright':'https://www.openstreetmap.org/copyright','retrieved_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'endpoint':host,'query':query,'features':features,'warning':'Mapped footprints and centrelines, not photogrammetry. Untagged building heights and all bridge deck heights/pier spacing are illustrative; NOT navigation clearances.'}
(r/'beaufort_features12.json').write_text(json.dumps(result,separators=(',',':')))
for name,url in [('leaflet.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'),('leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),('LEAFLET_LICENSE.txt','https://raw.githubusercontent.com/Leaflet/Leaflet/v1.9.4/LICENSE')]:
 with urllib.request.urlopen(url,timeout=35) as f:(r/name).write_bytes(f.read())
(r/'sources.json').write_text(json.dumps({'features':len(features),'counts':{k:sum(x['kind']==k for x in features) for k in ['bridge','building','road']},'bridges':[{'id':x['id'],'name':x['tags'].get('name'),'points':len(x['points'])} for x in features if x['kind']=='bridge'],'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in r.iterdir() if p.is_file()}},indent=2))
print((r/'sources.json').read_text())
