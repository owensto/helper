"""One discovery index, derived from final routes and the canonical atlas catalog."""
import json, re
from html import unescape
from conditions import asset
from fishing_lingo import slug


def install(pages, root, add):
    catalog = json.loads(next((root/'dist/assets').glob('atlas-gl-data-*.json')).read_text())['trips']
    trips = {t['path']: t for t in catalog}
    species = { '/species/'+s['id']+'/': s for s in json.loads((root/'src/species-catalog.json').read_text())['species']}
    records = []
    for url, page in pages.items():
        if page.get('redirectTo'): continue
        kind = 'Trips' if url in trips else next((name for prefix, name in [('/environments/', 'Waters'), ('/guides/', 'Guides'), ('/species/', 'Species'), ('/tools/', 'Tools')] if url.startswith(prefix) and url != prefix), None)
        if not kind: continue
        t = trips.get(url, {})
        fish = species.get(url, {})
        related = next((r for r in catalog if fish.get('name') in r['species']), {})
        image = re.search(r'<img[^>]*src="([^"]+)"', page['body'])
        records.append({'title': (fish['name'] + (' (fish group)' if fish['taxonType'] != 'species' else '')) if fish else page['title'].split(' | ')[0].split(' — ')[0], 'url': url, 'type': kind,
                        'place': t.get('locationLabel', fish.get('scientificName') or ''), 'region': t.get('region', ''), 'water': t.get('waters', []), 'months': t.get('months', []),
                        'image': t.get('image') or related.get('image') or (unescape(image[1]) if image else '/media/forecast/estuary-640.webp'),
                        'coordinates': t.get('coordinates'), 'keywords': ' '.join(t.get('species', []) + t.get('environments', []) + t.get('styles', []) + t.get('classicNames', []) + [a['name'] for a in fish.get('localNames',[])])})
    for record in records:
        thumb = re.sub(r'-(?:1200|1280|1536|1600)\.(webp|avif)$', r'-640.\1', record['image'])
        if (root/'public'/thumb.lstrip('/')).exists(): record['image'] = thumb
    lingo = json.loads((root/'src/local-lingo.json').read_text())
    for region in lingo['regions']:
        for term in region['terms']:
            records.append({'title': term['term'], 'url': '/fishing-lingo/#'+slug(region['id'])+'-'+slug(term['term']), 'type': 'Lingo', 'place':region['name'], 'region':region['name'], 'water':[], 'months':[], 'image':'/media/forecast/estuary-640.webp', 'keywords':term['meaning']})
    (root/'dist/assets/search-index.json').write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')))
    body = '''<section class="wrap search-page"><span class="eyebrow">A LITTLE CURIOSITY. A WHOLE LOT OF WATER.</span><h1>Find your next<br>day outside.</h1><p>Trips, waters, fish and good advice. All in one place.</p><form class="discovery-form" action="/search/" role="search"><label class="sr-only" for="page-search">Search Castward</label><input id="page-search" name="q" type="search" placeholder="Try a place, a fish or a kind of water…" autocomplete="off"><button class="btn">Search ↗</button></form><div class="search-filters"><label>Type<select data-filter="type"><option value="">Everything</option></select></label><label>Water<select data-filter="water"><option value="">All waters</option></select></label><label>Region<select data-filter="region"><option value="">Anywhere</option></select></label><label>Month<select data-filter="month"><option value="">Any month</option></select></label><button type="button" data-search-near>◎ Near me</button><button type="button" data-search-clear>Reset</button></div><p class="search-count" role="status"></p><div class="search-grid"></div><button class="btn outline" type="button" data-search-more hidden>More to explore ↓</button><noscript><p>Use the <a href="/trips/">trip library</a> to browse without JavaScript.</p></noscript></section>'''
    add('/search/', 'Search | Castward', 'Find your next fishing trip, water, fish or field guide.', body, 'search', True)
    entry = '<link rel="stylesheet" href="'+asset(root, 'search.css')+'"><script src="'+asset(root, 'search.js')+'" defer></script>'
    for page in pages.values(): page['atlasAssets'] = page.get('atlasAssets', '') + entry
