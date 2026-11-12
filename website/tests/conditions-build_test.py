"""Verify coordinates, canonical links, lazy assets, and retrieval coverage after a build."""
import json
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT/'dist'
manifest = json.loads((DIST/'route-manifest.json').read_text())
index = json.loads((ROOT/'api/_chat-index.json').read_text())
by_url = {r['url']: r for r in index}
assert len(by_url) == len(index)
assert (ROOT/'api/_chat-index.json').read_bytes() == (DIST/'assets/chat-index.json').read_bytes()
locations = json.loads((ROOT/'src/atlas-locations.json').read_text())['locations']
trips = json.loads((ROOT/'src/world.json').read_text())['trips']

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.cards = []; self.scripts = []; self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'data-conditions-card' in attrs: self.cards.append(attrs)
        if tag == 'script': self.scripts.append(attrs.get('src', ''))
        if tag == 'a': self.links.append(attrs.get('href', ''))

def page(path):
    return (DIST/path.strip('/')/'index.html').read_text() if path != '/' else (DIST/'index.html').read_text()

count = 0
for trip in trips:
    path = trip.get('canonicalPath', '/trips/'+trip['id']+'/')
    assert path in by_url, path
    if trip['id'] not in locations: continue
    parser = Parser(); parser.feed(page(path))
    assert len(parser.cards) == 1, path
    loc, card = locations[trip['id']], parser.cards[0]
    assert float(card['data-lat']) == loc['lat'] and float(card['data-lon']) == loc['lon'], path
    assert card['data-salt'] == str(trip['water'] in ('Saltwater', 'Brackish')).lower(), path
    assert not any('/conditions.js' in src or '/chat.js' in src for src in parser.scripts), path
    for tool in ('weather','tides'):
        link = next(url for url in parser.links if url.startswith('/tools/'+tool+'/?'))
        query = parse_qs(urlsplit(link).query)
        assert float(query['lat'][0]) == loc['lat'] and float(query['lon'][0]) == loc['lon']
    count += 1
for path, entry in manifest.items():
    if entry.get('redirectTo'): continue
    text = page(path)
    assert 'data-chat-launch' in text, path
    assert 'data-chat-src=' in text and '/assets/tools-boot.js?' in text, path
    assert text.count('href="/tools/weather/"') >= 2, path
    assert text.count('href="/tools/tides/"') >= 2, path
    if path.startswith(('/guides/','/environments/')) and path not in ('/guides/','/environments/'):
        assert path in by_url, path
for record in index:
    assert record['url'] in manifest
    assert {'title','url','place','country','habitats','species','summary'} <= record.keys()
    assert isinstance(record['habitats'],list) and isinstance(record['species'],list)
    if record.get('shoppingUrl'): assert 'id="shopping-list"' in page(record['url'])
print(f'{count} trip cards and {len(index)} retrieval records pass build contract checks.')
