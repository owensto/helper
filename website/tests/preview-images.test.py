"""Verify image identity, coverage, responsive files and eager first rows after a build."""
import json
import re
import sys
from collections import Counter
from pathlib import Path
from html.parser import HTMLParser
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from preview_cards import Cards
from preview_images import PREVIEWS, image_url

class Images(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.images = []
        self.feed(markup)
    def handle_starttag(self, tag, attrs):
        if tag == 'img': self.images.append(dict(attrs))

world = json.loads((ROOT/'src/world.json').read_text())
for group, values in [('classic', world['tripTypes']), ('style', world['tripStyles'])]:
    records = [PREVIEWS['/trip-types/'+v['slug']+'/'] for v in values]
    assert len({(r['directory'], r['slug']) for r in records}) == len(records), group
    for record in records:
        for width in (640, 1200, 1600):
            for ext in ('avif', 'webp'):
                assert (ROOT/'dist'/image_url(record, width, ext)).is_file()
checked = Counter()
for file in (ROOT/'dist').rglob('index.html'):
    body = file.read_text()
    counts = Counter()
    for card in sorted(Cards(body).cards, key=lambda c: c['start']):
        markup = body[card['start']:card['end']]
        imgs = Images(markup).images
        assert imgs, (file, card['kind'], 'missing image')
        assert 'background-image:url(data:image/webp;base64,' in markup, (file, 'missing inline poster')
        image = imgs[0]
        assert image.get('width') and image.get('height') and image.get('alt'), (file, card)
        assert image.get('sizes') and all(f'{w}w' in image.get('srcset', '') for w in (640,1200,1600)) or '/media/scenes/' in image['src'], file
        assert (ROOT/'dist'/image['src'].lstrip('/')).is_file(), (file, image['src'])
        assert image.get('loading') == ('eager' if counts[card['kind']] < 3 else 'lazy'), (file, card['kind'])
        counts[card['kind']] += 1
        checked[card['kind']] += 1
        if card['kind'] in ('type-card','country-card','habitat-card'):
            assert card['href'] in PREVIEWS, ('missing collection', card['href'])
            expected = '/' + image_url(PREVIEWS[card['href']])
            assert image['src'] == expected, (file, card['href'], image['src'], expected)
assert checked['type-card'] == 57
assert checked['habitat-card'] == 12
print(json.dumps({'cards':dict(checked),'routes':len(PREVIEWS),'result':'pass'}))
