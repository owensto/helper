#!/usr/bin/env python3
"""Check production payload; optional actual-host smoke test after a successful deploy."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError
import json, sys, time, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
from index_policy import sitemap_entries
ORIGIN = 'https://castward.app'
manifest = json.loads((ROOT / 'dist/route-manifest.json').read_text())
world = json.loads((ROOT / 'src/world.json').read_text())
assert len(world['trips']) == 798, 'Unexpected catalog count'
assert all(t['canonicalPath'] in manifest for t in world['trips']), 'Missing trip route'
locs = set(sitemap_entries(ROOT / 'dist'))
assert locs and all(x.startswith(ORIGIN + '/') for x in locs), 'Wrong production sitemap origin'
for trip in world['trips']:
    assert (ORIGIN + trip['canonicalPath'] in locs) == bool(trip['indexEligible']), trip['id']
assert ORIGIN + '/sitemap.xml' in (ROOT / 'dist/robots.txt').read_text()
home = (ROOT / 'dist/index.html').read_text()
assert f'href="{ORIGIN}/"' in home and 'Castward' in home
assert not list((ROOT / 'dist').rglob('.env*')), 'Environment file in public output'
print(f'Production payload checked: {len(manifest)} routes, {len(world["trips"])} profiles, {len(locs)} sitemap URLs.')
if '--live' not in sys.argv:
    raise SystemExit(0)
# Check actual source identity at multiple routes, not merely a generic HTTP 200.
trip_path = next(t['canonicalPath'] for t in world['trips'] if t.get('planId') == 'US-TX-001')
checks = [('/', 'Castward'), ('/trips/', 'Castward'), ('/plan/', 'Castward'),
          (trip_path, 'Port Aransas'), ('/assets/engine.js', 'Atlas'), ('/sitemap.xml', ORIGIN)]
for path, expected in checks:
    last = ''
    for attempt in range(6):
        try:
            req = Request(ORIGIN + path, headers={'User-Agent': 'Castward-release-check/1.0', 'Cache-Control': 'no-cache'})
            with urlopen(req, timeout=20) as response:
                text = response.read().decode('utf-8')
                assert response.status == 200 and expected in text, f'Unexpected response from {path}'
            break
        except (URLError, AssertionError, TimeoutError) as exc:
            last = str(exc)
            if attempt == 5:
                raise SystemExit(f'Deploy command completed but live check failed for {path}: {last}')
            time.sleep(2)
    print('Live HTTP check passed:', path)
print('Live smoke tests passed. These are HTTP/content checks, not end-to-end interactive browser tests.')
