"""Small, build-time career projection. Real trip and licence text has one source."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTION = json.loads((ROOT/'src/maps/projection.json').read_text())

def map_point(lon, lat):
    """The same Equal Earth coefficients and fit as the checked-in d3-geo SVG."""
    a1, a2, a3, a4 = 1.340264, -.081106, .000893, .003796
    m = math.sqrt(3) / 2
    theta = math.asin(m * math.sin(math.radians(lat)))
    t2, t6 = theta**2, theta**6
    x = math.radians(lon)*math.cos(theta)/(m*(a1+3*a2*t2+t6*(7*a3+9*a4*t2)))
    y = theta*(a1+a2*t2+t6*(a3+a4*t2))
    scale, (tx, ty) = PROJECTION['scale'], PROJECTION['translate']
    return [round(tx+x*scale, 3), round(ty-y*scale, 3)]
# Trip ID, display name, water, jurisdiction, longitude, latitude, game light.
STOPS = [
 ('na-us-mt-001','Madison River','river','us-montana',-111,45,'dawn'),
 ('situk-coho-river','Situk River','river','us-alaska',-139,59,'dawn'),
 ('delta-clearwater-grayling','Delta Clearwater','river','us-alaska',-145,64,'day'),
 ('na-ca-mb-002','Lake Winnipeg','ice','ca-manitoba',-97,52,'dawn'),
 ('andros-bonefish','Andros','flats','bs-national',-78,25,'day'),
 ('belize-permit','Belize Flats','flats','bz-national',-88,17,'dusk'),
 ('belize-reef','Belize Barrier Reef','reef','bz-national',-87,17,'day'),
 ('costa-caribbean-canals','Tortuguero','river','cr-national',-84,11,'dawn'),
 ('northern-patagonia-trout','Northern Patagonia','river','ar-national',-71,-41,'dusk'),
 ('rio-negro-peacock','Rio Negro','river','br-national',-63,-2,'dawn'),
 ('g-iceland-west-ranga','West Rangá','river','is-iceland',-20,64,'dusk'),
 ('g-norway-gaula','Gaula','river','no-norway',10,63,'dawn'),
 ('g-finland-lake-inari','Lake Inari','lake','fi-finland',27,69,'night'),
 ('soca-fly-fishing','Soča Valley','river','si-slovenia',14,46,'day'),
 ('lower-zambezi-tiger','Lower Zambezi','river','zm',29,-15,'dusk'),
 ('cosmoledo-gt','Cosmoledo Atoll','flats','sc',48,-10,'day'),
 ('mongolia-taimen','Mongolian Rivers','river','mn',100,49,'dawn'),
 ('g-japan-lake-biwa','Lake Biwa','lake','jp',136,35,'dawn'),
 ('g-maldives-laamu-atoll','Laamu Atoll','offshore','mv',73,2,'dusk'),
 ('tasmania-great-lake','Yingina / Great Lake','lake','au-tasmania',147,-42,'dawn'),
 ('eglinton-river','Eglinton River','river','nz-fish-and-game',168,-45,'dawn'),
 ('cairns-heavy-tackle-marlin','Cairns','offshore','au-queensland',146,-17,'day'),
 ('top-end-barramundi','Top End','river','au-northern-territory',132,-12,'dusk'),
 ('g-finland-lake-saimaa','Lake Saimaa','lake','fi-finland',28,61,'day'),
 ('g-costa-rica-los-suenos','Los Sueños','offshore','cr-national',-85,10,'day'),
]

def career_data():
    world = json.loads((ROOT/'src/world.json').read_text())
    licences = json.loads((ROOT/'src/licenses.json').read_text())
    trips = {t['id']: t for t in world['trips']}
    jurisdictions = {j['id']: j for j in licences['jurisdictions']}
    result = []
    for i,(id,name,water,licence,lon,lat,light) in enumerate(STOPS):
        t,j = trips[id],jurisdictions[licence]
        options = [o for o in j.get('options',[]) if o.get('who')=='non-resident'] or j.get('options',[])
        option = next((o for o in options if isinstance(o.get('price'),(int,float))), None)
        price = f"{option['currency']} {option['price']:g} · {option['name']}" if option else 'Visitor price: confirm with the local authority.'
        result.append(dict(id=id,name=name,water=water,licence=licence,lon=lon,lat=lat,light=light,mapPoint=map_point(lon,lat),
          level=1+i//3,canonicalPath=t['canonicalPath'],country=t['country'],continent=t['region'],
          biome='tropical' if t.get('climate')=='warm' else 'temperate',habitats=t.get('habitats',[]),
          targets=t.get('fish',[]),speciesIds=t.get('speciesIds',[]),season=t.get('summary') or '',
          months=sorted({m for s in t.get('seasonWindows',[]) for m in s.get('months',[])}),
          permit=dict(name=j['name'],summary=j['summary'],who=j.get('whoNeedsOne',[]),price=price,
                      checked=j.get('checked',licences['checked']),path='/fishing-licenses/'+licence+'/',coins=60+i*4)))
    return {'version':2,'places':result}
