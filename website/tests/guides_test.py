"""Validate the published guide contract, not prose length or an SEO score."""
import json
import re
import xml.etree.ElementTree as ET
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from index_policy import sitemap_entries
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
C = json.loads((ROOT / 'src/guides.json').read_text())
W = json.loads((ROOT / 'src/world.json').read_text())
T = {t['id']: t for t in W['trips']}
M = json.loads((ROOT / 'dist/route-manifest.json').read_text())


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links, self.ids, self.meta, self.sources = [], set(), {}, []
        self.h1, self.videos, self.canonical = 0, 0, None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            assert a['id'] not in self.ids, 'Duplicate ID: ' + a['id']
            self.ids.add(a['id'])
        if tag == 'a': self.links.append(a.get('href', ''))
        if tag == 'meta': self.meta[a.get('name', '')] = a.get('content')
        if tag == 'h1': self.h1 += 1
        if tag == 'video': self.videos += 1
        if tag == 'source' and (a.get('src') or a.get('data-src')):
            self.sources.append(a.get('src') or a.get('data-src'))
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical = a['href']


def text(value):
    return unescape(re.sub('<[^>]+>', '', value)).strip()


assert len(C['trips']) == 10
assert len(C['articles']) == 11 and sum(g['new'] for g in C['articles']) == 5
routes = {T[k]['canonicalPath']: g for k, g in C['trips'].items()}
routes.update({'/guides/' + g['slug'] + '/': g for g in C['articles']})
hub = (ROOT / 'dist/guides/index.html').read_text()
sitemap = sitemap_entries(ROOT / 'dist')
report = []
for route, guide in routes.items():
    raw = (ROOT / 'dist' / route.strip('/') / 'index.html').read_text()
    page = Page(raw)
    assert page.h1 == 1 and page.videos == 1, route
    assert page.canonical == 'https://castward.app' + route, route
    eligible = not M[route]['noindex']
    assert page.meta['robots'] == ('index,follow' if eligible else 'noindex,follow'), route
    assert page.meta['description'] == guide['description'], route
    assert text(re.search(r'<title>(.*?)</title>', raw).group(1)) == guide['title'] + ' | Castward', route
    assert (page.canonical in sitemap) == eligible, route
    if eligible: assert sitemap[page.canonical] == '2026-11-10', route
    assert route in hub, 'Orphan guide: ' + route
    assert 'Book a guide here' in raw and 'booking is not available' in raw, route
    assert 'Plan this trip' in raw and 'guideStyle' not in raw, route
    for href in page.links:
        if href.startswith('#'): assert href[1:] in page.ids, (route, href)
        if href.startswith('/'):
            part = urlsplit(href)
            assert part.path in M or (ROOT / 'dist' / part.path.lstrip('/')).exists(), (route, href)
            if part.path == '/plan/' and part.query:
                assert parse_qs(part.query)['destination'] == [guide['destination']], (route, href)
    for src in page.sources: assert (ROOT / 'dist' / src.lstrip('/')).is_file(), src
    schemas = []
    for data in re.findall(r'<script type="application/ld\+json">(.*?)</script>', raw):
        value = json.loads(data)
        schemas.extend(value if isinstance(value, list) else [value])
    faq = next(s for s in schemas if s['@type'] == 'FAQPage')
    visible = [(text(q), text(a)) for q, a in re.findall(r'<details class="guide-faq"><summary>(.*?)</summary><p>(.*?)</p></details>', raw)]
    assert visible == [(q['name'], q['acceptedAnswer']['text']) for q in faq['mainEntity']], route
    article = next(s for s in schemas if s['@type'] == 'Article')
    assert article['dateModified'] == '2026-11-10'
    if guide.get('new'): assert article['datePublished'] == '2026-11-10'
    for section in guide['sections']:
        for sid in section['sources']:
            source = C['sources'][sid]
            assert source['checked'] == '2026-11-10' and source['status'] == 'text-inspected'
            assert source['url'] in page.links and source['scopeNote'], (route, sid)
    report.append({'path': route, 'faq': len(visible), 'reels': page.videos,
                   'plannerDestination': guide['destination'], 'titleCharacters': len(guide['title']) + 11,
                   'descriptionCharacters': len(guide['description'])})
for trip in W['trips']:
    if trip.get('review', {}).get('status') == 'source-checked': assert trip['canonicalPath'] in hub
    if not trip['indexEligible']: assert 'https://castward.app' + trip['canonicalPath'] not in sitemap
for key in ['tanana-glacial-system', 'rocky-mountain-alpine']:
    assert M[T[key]['canonicalPath']]['noindex'] == (not T[key]['indexEligible'])
out = ROOT / 'test-results/guides.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'passed': True, 'pages': report, 'checkedDestinationsOnHub': 40}, indent=2) + '\n')
print(f'{len(routes)} guides pass: sources, metadata, FAQ parity, planner links, reels, sitemap and preserved noindex routes')
