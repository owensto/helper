"""Fetch a bounded NOAA ENC-derived region; fail instead of inventing data."""
import json, math, time, urllib.request, urllib.parse, pathlib, datetime
from shapely.geometry import shape, box, mapping
from shapely.ops import unary_union
ROOT=pathlib.Path(__file__).parent
OUT=ROOT/'region';OUT.mkdir(exist_ok=True)
BBOX=[-80.735,32.335,-80.605,32.485]
BASE='https://encdirect.noaa.gov/arcgis/rest/services/encdirect/'
SOURCES=[]
def get(url,params=None):
    if params: url+='?'+urllib.parse.urlencode(params)
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ATLAS educational simulation / bounded data download'}),timeout=45) as f: data=json.load(f)
            if 'error' in data: raise RuntimeError(str(data['error']))
            return data
        except Exception:
            if i==2: raise
            time.sleep(2+i*2)
def features(service,layer):
    url=BASE+service+'/MapServer/'+str(layer)+'/query'
    params={'f':'json','where':'1=1','geometry':','.join(map(str,BBOX)),'geometryType':'esriGeometryEnvelope','inSR':4326,'spatialRel':'esriSpatialRelIntersects','returnIdsOnly':'true'}
    ids=get(url,params).get('objectIds') or []
    if len(ids)>12000: raise RuntimeError('Region extraction exceeds bounded limit')
    result=[]
    for i in range(0,len(ids),250):
        d=get(url,{'f':'geojson','objectIds':','.join(map(str,ids[i:i+250])),'outFields':'*','outSR':4326,'returnGeometry':'true','geometryPrecision':6})
        if d.get('exceededTransferLimit'): raise RuntimeError('Unexpected truncated chunk')
        result.extend(d.get('features',[]))
    SOURCES.append({'url':url,'bbox':BBOX,'count':len(result),'layer':layer,'band':service})
    return result
land=[];soundings=[];bridges=[]
for service in ['enc_harbour','enc_approach']:
    layers=get(BASE+service+'/MapServer',{'f':'json'})['layers']
    def idof(suffix): return next(x['id'] for x in layers if x['name'].endswith('.'+suffix))
    bandland=features(service,idof('Land_Area'))
    bandsounds=features(service,idof('Sounding_point'))
    if bandland and len(bandsounds)>20:
        land=bandland;soundings=bandsounds
        try: bridges=features(service,idof('Bridge_line'))
        except Exception: bridges=[]
        break
if not land or len(soundings)<20: raise RuntimeError('NOAA Beaufort coverage unavailable; no fabricated fallback')
regionbox=box(*BBOX);polys=[]
for f in land:
    if not f.get('geometry'): continue
    p=shape(f['geometry']);p=p if p.is_valid else p.buffer(0)
    p=p.intersection(regionbox)
    if not p.is_empty: polys.append(p)
merged=unary_union(polys).simplify(.000025,preserve_topology=True)
if merged.geom_type=='Polygon': merged=[merged]
else: merged=list(merged.geoms)
lat0,lon0=32.4271,-80.6749
R=6378137;rad=math.pi/180
xy=lambda lng,lat:[round((lng-lon0)*rad*R*math.cos(lat0*rad),2),round((lat0-lat)*rad*R,2)]
rings=[]
for p in merged:
    if p.geom_type!='Polygon': continue
    rings.append([[xy(*a[:2]) for a in p.exterior.coords]]+[[xy(*a[:2]) for a in h.coords] for h in p.interiors])
sounds=[];seen=set()
for f in soundings:
    if not f.get('geometry'): continue
    c=f['geometry']['coordinates'];pr=f['properties'];z=pr.get('Z',c[2] if len(c)>2 else None)
    if z is None or not isinstance(z,(int,float)) or z<0 or z>100: continue
    if not (BBOX[0]<=c[0]<=BBOX[2] and BBOX[1]<=c[1]<=BBOX[3]):continue
    key=(round(c[0],6),round(c[1],6),z)
    if key in seen:continue
    seen.add(key);sounds.append(xy(*c[:2])+[z,pr.get('DSNM',''),pr.get('SORDAT','')])
bounds=[*xy(BBOX[0],BBOX[3]),*xy(BBOX[2],BBOX[1])]
result={'title':'Beaufort River, South Carolina','origin':{'lat':lat0,'lng':lon0},'bbox':BBOX,'bounds':bounds,'land':rings,'soundings':sounds,'sources':SOURCES,'retrieved':datetime.datetime.now(datetime.timezone.utc).isoformat(),'warning':'NOAA ENC Direct GIS derivative, not navigation. Sparse chart soundings; interpolation is NOT measured depth at the vessel. Tide input is an assumed offset, not a prediction. Terrain heights and vegetation are illustrative.'}
(OUT/'beaufort.json').write_text(json.dumps(result,separators=(',',':')))
(OUT/'provenance.json').write_text(json.dumps({k:v for k,v in result.items() if k not in ['land','soundings']},indent=2))
print(json.dumps({'land_polygons':len(rings),'soundings':len(sounds),'bounds':bounds,'sources':SOURCES},indent=2))
