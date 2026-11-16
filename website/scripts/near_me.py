"""Fish near me: a one-tap funnel from a visitor's location to a real place, a forecast day and a gear list."""
import hashlib
import json
import re
from html import escape as E

PATH = '/near-me/'
HUB = '/fishing-licenses/'

# Friendly water groups for one tap. Each atlas habitat belongs to one group.
GROUPS = [
    ('river', 'River or stream', ['Rivers & streams', 'Spring-fed streams', 'Glacier-influenced rivers', 'Tropical floodplains']),
    ('lake', 'Lake', ['Lakes & reservoirs', 'Alpine lakes']),
    ('coast', 'Coast, flats or surf', ['Saltwater flats', 'Estuaries & mangroves', 'Surf & beaches']),
    ('boat', 'Offshore or reef by boat', ['Offshore', 'Reef & bottom']),
    ('ice', 'Ice', ['Ice fishing']),
]
HABITAT = {h: key for key, _, hs in GROUPS for h in hs}
GEAR_SCOPES = ('all', 'cool', 'warm', 'wade', 'boat')


def asset(root, name):
    digest = hashlib.sha256((root/'public/assets'/name).read_bytes()).hexdigest()[:12]
    return '/assets/' + name + '?v=' + digest


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', (text or '').lower()).strip('-')


def licence_paths(root, pages):
    recs = json.loads((root/'src/licenses.json').read_text())['jurisdictions']
    exact, country = {}, {}
    for r in recs:
        path = HUB + r['id'] + '/'
        if path not in pages:
            continue
        exact[(r['country'], r.get('region'))] = path
        if r.get('region') in (None, '', r['country']) or r['id'].endswith('-national'):
            country.setdefault(r['country'], path)
    return exact, country


def install(pages, root, add, data, trips, amazon_tag):
    by_id = {t['id']: t for t in trips}
    exact, country = licence_paths(root, pages)
    records = []
    for d in data['destinations']:
        t = by_id.get(d['id'], {})
        coords = d.get('coordinates')
        if not coords or d.get('locationPrecision') == 'country':
            continue
        groups = sorted({HABITAT[h] for h in t.get('habitats', []) if h in HABITAT})
        if not groups:
            continue
        path = d.get('guideUrl') or t.get('canonicalPath') or '/destinations/' + d['id'] + '/'
        if path not in pages:
            continue
        nation, state = t.get('country', ''), t.get('state', '')
        lic = exact.get((nation, state)) or country.get(nation) or HUB
        records.append({
            'n': d['name'], 'r': ', '.join(filter(None, [state, nation])),
            'x': round(coords[0], 3), 'y': round(coords[1], 3),
            'p': 1 if d.get('locationPrecision') == 'region' else 0,
            'g': groups, 's': d.get('species', [])[:6], 'u': path, 'l': lic,
            't': 'Saltwater' in (t.get('water') or '') or bool({'coast', 'boat'} & set(groups)),
        })
    gear = [{'n': g['name'], 'w': g['why'], 'q': g.get('query') or '', 's': g['scope'], 'e': bool(g.get('essential'))}
            for g in data['gear'] if g.get('scope') in GEAR_SCOPES]
    payload = json.dumps({'places': records, 'gear': gear, 'groups': [[k, label] for k, label, _ in GROUPS]},
                         ensure_ascii=False, separators=(',', ':'))
    version = hashlib.sha256(payload.encode()).hexdigest()[:12]
    (root/'dist/assets'/('near-me-data-' + version + '.json')).write_text(payload)

    body = f'''<section class="nm" data-near-me data-catalog="/assets/near-me-data-{version}.json" data-tag="{E(amazon_tag, quote=True)}">
<div class="nm-head wrap"><span class="eyebrow">FISH NEAR ME</span><h1>Where and when to fish near you.</h1>
<p>Four taps. Then you get a real place, the best day this week and what to bring. Free, no account.</p></div>
<div class="nm-card wrap" data-nm-card aria-live="polite">
<div class="nm-step" data-step="where"><p class="nm-q">Where do you start from?</p>
<button type="button" class="nm-big" data-locate>Use my location</button>
<form class="nm-town" data-town><label for="nm-town-input">Or type a town</label><div><input id="nm-town-input" type="search" minlength="2" maxlength="80" placeholder="Town or city" autocomplete="off" required><button type="submit">Find</button></div></form>
<div class="nm-options" data-town-results></div><p class="nm-note" data-where-status role="status"></p></div>
</div>
<noscript><p class="wrap">This tool needs JavaScript. You can <a href="/atlas/">browse the atlas</a> instead.</p></noscript>
<div class="wrap nm-foot"><p>Places come from the {len(records)} Castward trip guides with a map location. Distances are in a straight line. Map points mark broad areas, not launch sites. The forecast comes from <a href="https://open-meteo.com/">Open-Meteo</a> (CC BY 4.0). Castward picks the calmest, driest day. It does not predict fish. Check local rules and an official forecast before you go.</p></div>
</section>'''
    add(PATH, 'Fish Near Me: Where and When to Go | Castward',
        'Find a fishing place near you, the calmest day this week and what to bring. Four taps, free.', body, 'tool')
    pages[PATH]['atlasAssets'] = '<link rel="stylesheet" href="' + asset(root, 'near-me.css') + '"><script src="' + asset(root, 'near-me.js') + '" defer></script>'
    pages[PATH]['modified'] = '2026-11-16'
    return len(records)
