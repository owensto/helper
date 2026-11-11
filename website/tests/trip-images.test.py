"""Run after a production build: python3 tests/trip-images.test.py."""
import json
from html import escape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
images = json.loads((ROOT / 'public/media/trips/manifest.json').read_text())
trips = json.loads((ROOT / 'src/world.json').read_text())['trips']
listing = (ROOT / 'dist/trips/index.html').read_text()
for trip in trips:
    slug = trip['id']
    path = trip.get('canonicalPath', '/trips/' + slug + '/')
    page = (ROOT / 'dist' / path.strip('/') / 'index.html').read_text()
    if slug not in images:
        assert '<figure class="guide-landscape"><picture class="scene-picture"><source type="image/avif" srcset="/media/scenes/' in page, slug
        continue
    base = '/media/trips/' + slug
    assert f'content="https://castward.app{base}-1200.webp"' in page, slug
    assert f'imagesrcset="{base}-640.avif' in page, slug
    assert escape(images[slug]['alt'], quote=True) in page, slug
    assert f'width="1600" height="{images[slug]["height"]}"' in page, slug
    assert base + '-640.avif' in listing, slug
    for width in (640, 1200, 1600):
        for ext in ('avif', 'webp'):
            assert (ROOT / 'dist' / f'{base[1:]}-{width}.{ext}').is_file()
assert 'AI-generated illustrations created with GPT Image' in (ROOT / 'dist/about/index.html').read_text()
print(f'Passed: {len(images)} scenes, {len(trips) - len(images)} fallback heroes, metadata, responsive assets, and credits.')

class SceneChecks(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag != 'img' or not attrs.get('src', '').startswith('/media/trips/'):
            return
        assert attrs.get('loading') in ('lazy', 'eager'), self.path
        assert attrs.get('width') and attrs.get('height'), self.path
        assert attrs.get('alt') and attrs.get('sizes'), self.path
        for width in (640, 1200, 1600):
            assert f'{width}w' in attrs.get('srcset', ''), self.path
        if attrs['loading'] == 'eager':
            assert attrs.get('fetchpriority') == 'high', self.path
        self.count += 1

checks = SceneChecks()
checks.count = 0
collections = set()
for path in (ROOT / 'dist').rglob('index.html'):
    checks.path = str(path)
    before = checks.count
    checks.feed(path.read_text())
    if checks.count > before:
        collections.add(path.relative_to(ROOT / 'dist').parts[0])
assert {'trips', 'trip-types', 'countries', 'continents', 'destinations'} <= collections, collections
print(f'Passed: responsive dimensions, alt text, and loading attributes on {checks.count} scene uses across all pages.')
