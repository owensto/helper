"""Contract checks across the authored taxonomy, compiler, rendered pages and map export."""
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from index_policy import sitemap_entries
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'src/compiled-data.json').read_text())
W=json.loads((ROOT/'src/world.json').read_text())
S=json.loads((ROOT/'src/trip-styles.json').read_text())['styles']
T=json.loads((ROOT/'src/trip-types.json').read_text())['types']
M=json.loads((ROOT/'dist/route-manifest.json').read_text())
class Page(HTMLParser):
    def __init__(self,html):
        super().__init__();self.links=[];self.catalog=None;self.feed(html)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='a':self.links.append(a.get('href'))
        if 'data-catalog' in a:self.catalog=a['data-catalog']
def read(route):return (ROOT/'dist'/route.strip('/')/'index.html').read_text() if route!='/' else (ROOT/'dist/index.html').read_text()
home=Page(read('/'));atlas=Page(read('/atlas/'))
assert home.catalog==atlas.catalog
A=json.loads((ROOT/'dist'/atlas.catalog.lstrip('/')).read_text())['trips']
assert len(A)==len(D['destinations'])==801
assert all(t['coordinates'] for t in A), 'Every map record needs a sourced location'
assert sum(t['precision']=='country' for t in A)==7
full=json.JSONDecoder().raw_decode((ROOT/'dist/assets/data.js').read_text().split('=',1)[1])[0]
assert full['destinations']==D['destinations']
assert (ROOT/'dist/media/atlas/locations.json').read_bytes()==(ROOT/'src/atlas-locations.json').read_bytes()
assert {t['id'] for t in A}=={t['id'] for t in D['destinations']}
assert len(S)==16 and len(T)==41
assert '3 species guides' not in read('/')
assert '<b>3</b><span>species guides' not in read('/')
assert read('/').split('</header>')[0].count('href="/plan/"')==1
assert set(c['slug'] for c in T)==set(c for s in S for c in s['classicIds'])
assert len({s['slug'] for s in S})==16
assert not {s['slug'] for s in S}.intersection(c['slug'] for c in T)
by_id={t['id']:t for t in A}
for d in D['destinations']:
    t=by_id[d['id']]
    assert d['tripStyleIds']==t['styles'],d['id']
    assert d['coordinates']==t['coordinates'],d['id']
    assert t['styles'],d['id']
    assert t['path'] in M,d['id']
    assert (ROOT/'dist'/t['image'].lstrip('/')).exists(),d['id']
    if t['coordinates']:
        lon,lat=t['coordinates'];assert -180<=lon<=180 and -90<=lat<=90,d['id']
for s in S:
    route='/trip-types/'+s['slug']+'/'
    page=Page(read(route));expected={t['path'] for t in A if s['slug'] in t['styles']}
    assert expected <= set(page.links),s['slug']
    assert not M[route]['noindex'],route
    for c in s['classicIds']:
        assert '/trip-types/'+c+'/' in page.links,c
        assert route in Page(read('/trip-types/'+c+'/')).links,c
for trip in W['trips']:
    for style in trip['tripStyleIds']:assert '/trip-types/'+style+'/' in Page(read(trip['canonicalPath'])).links,trip['id']
for slug in ['fly-fishing','inshore-flats','ice-fishing','big-game','night-fishing','kayak']:
    assert any(slug in t['styles'] for t in A),slug
assert 'ice-fishing' not in by_id['quepos-offshore']['styles']
assert 'inshore-flats' in by_id['na-us-fl-001']['styles']
assert 'big-game' in by_id['cairns-heavy-tackle-marlin']['styles']
assert not by_id['na-us-ak-002']['months']  # Unknown seasons must stay unknown.
sitemap=sitemap_entries(ROOT/'dist')
for route in ['/atlas/','/local-classics/']+['/trip-types/'+s['slug']+'/' for s in S]:assert 'https://castward.app'+route in sitemap,route
print('Atlas contract passes: 801 records, 16 shared styles, 41 preserved classics, images, sources, seasons and discovery links.')
