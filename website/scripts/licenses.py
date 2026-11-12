"""Fishing licences: /fishing-licenses/ hub, one page per jurisdiction, and a panel on every trip.

Data: src/licenses.json (official-source research per US state, Canadian province,
Australian state, UK nation and country) and optional src/trip-permits.json
(trip-specific permits and rules beyond the general licence).
"""
import json, re
from html import escape as E

HUB = '/fishing-licenses/'
MONTH = 'November 2026'
OFFSHORE = {'Offshore', 'Reef & bottom'}


def money(o):
    if o.get('price') is None:
        return ''
    p = o['price']
    p = int(p) if float(p).is_integer() else f'{float(p):.2f}'
    return f'{o.get("currency", "")} {p}'.strip() if o.get('currency') not in ('USD', 'CAD', 'AUD', 'NZD') else f'${p} {o["currency"]}'


def link(url, text, cls='link'):
    return f'<a class="{cls}" href="{E(url, quote=True)}" target="_blank" rel="noopener noreferrer">{E(text)}</a>'


def page_path(r):
    return f'{HUB}{r["id"]}/'


def match(trip, by_country):
    """Pick the licence record for a trip: permits file > state/province > keyword > single country record."""
    recs = by_country.get(trip['country'], [])
    if len(recs) == 1:
        return recs[0]
    state = (trip.get('state') or '').lower()
    for r in recs:
        if state and (r.get('region') or r['name']).lower() == state:
            return r
    text = ' '.join(str(trip.get(k) or '') for k in ('place', 'title', 'id')).lower()
    for r in recs:
        name = (r.get('region') or r['name']).lower()
        if name and name in text:
            return r
    if trip['country'] == 'United Kingdom':
        scot = ('tweed', 'tay', 'spey', 'dee', 'scotland', 'highland', 'loch')
        return next((r for r in recs if r['id'] == ('gb-scotland' if any(w in text for w in scot) else 'gb-england-and-wales')), None)
    if trip['country'] == 'Australia':
        au = {'eucumbene': 'au-new-south-wales', 'jindabyne': 'au-new-south-wales', 'snowy': 'au-new-south-wales', 'cairns': 'au-queensland',
              'great barrier': 'au-queensland', 'top end': 'au-northern-territory', 'darwin': 'au-northern-territory', 'exmouth': 'au-western-australia'}
        rid = next((v for k, v in au.items() if k in text), None)
        return next((r for r in recs if r['id'] == rid), None)
    if trip['country'] == 'New Zealand':
        return next((r for r in recs if r['id'] == ('nz-taupo' if 'taupo' in text else 'nz-fish-and-game')), None)
    return None


def options_table(r, visitor_only=False):
    rows = [o for o in r.get('options', []) if not visitor_only or o.get('who') in ('non-resident', 'any', None)]
    if not rows:
        return ''
    h = '<div class="guide-table lic-table" role="region" tabindex="0" aria-label="Licence options"><table><thead><tr><th scope="col">Licence</th><th scope="col">For</th><th scope="col">Length</th><th scope="col">Price</th></tr></thead><tbody>'
    for o in rows:
        h += f'<tr><th scope="row">{E(o["name"])}</th><td>{E((o.get("who") or "any").replace("-", " "))}</td><td>{E(o.get("duration") or "")}</td><td>{E(money(o) or "See official site")}</td></tr>'
    return h + '</tbody></table></div>'


def buttons(r):
    b = ''
    if r.get('buyUrl'):
        b += link(r['buyUrl'], 'Buy a licence online ↗', 'btn')
    if r.get('authority', {}).get('url'):
        b += link(r['authority']['url'], 'Official rules ↗', 'btn btn-quiet')
    return f'<div class="lic-actions">{b}</div>' if b else ''


URL = re.compile(r'(?::\s*)?(https?://[^\s)]+?)([.,;]?)(?=\s|$)')


def linkify(text):
    out, last = '', 0
    for m in URL.finditer(text):
        out += E(text[last:m.start()]).rstrip(' :') + ' ' + link(m.group(1), 'official regulations ↗') + E(m.group(2))
        last = m.end()
    return out + E(text[last:])


def rule_list(title, items):
    items = [i for i in items or [] if i]
    return f'<h3>{E(title)}</h3><ul class="lic-rules">' + ''.join(f'<li>{linkify(i)}</li>' for i in items) + '</ul>' if items else ''


def bullets(title, items):
    items = [i for i in items or [] if i]
    return f'<h3>{E(title)}</h3><ul>' + ''.join(f'<li>{E(i)}</li>' for i in items) + '</ul>' if items else ''


def trip_panel(trip, rec, permits, federal):
    p = permits.get(trip['id'], {})
    h = '<section class="prose-block lic-panel" id="licence"><span class="eyebrow">LICENCE &amp; PERMITS</span>'
    if rec:
        h += f'<h2>Fishing licence for {E(rec["name"])}</h2><p>{E(rec["summary"])}</p>'
        visitor = [o for o in rec.get('options', []) if o.get('who') in ('non-resident', 'any', None)][:4]
        if visitor:
            h += '<ul class="lic-chips">' + ''.join(
                f'<li><b>{E(o.get("duration") or o["name"])}</b><span>{E(money(o) or o["name"])}</span></li>' for o in visitor) + '</ul>'
        h += buttons(rec)
    else:
        h += f'<h2>Fishing licence for {E(trip["country"])}</h2><p>Rules depend on the exact water. Ask your guide or the local fisheries office which licence covers this trip.</p>'
    extra = p.get('permits') or []
    if extra:
        h += '<h3>Permits for this trip</h3><ul class="lic-permits">'
        for x in extra:
            price = money(x)
            name = link(x['url'], x['name'] + ' ↗') if x.get('url') else E(x['name'])
            h += f'<li><b>{name}</b>{(" · " + E(price)) if price else ""}<br><span>{E(x.get("who") or "")}{(" " + E(x["how"])) if x.get("how") else ""}</span></li>'
        h += '</ul>'
    if p.get('rules'):
        h += rule_list('Rules for this water', p['rules'])
    if federal and set(trip.get('habitats', [])) & OFFSHORE and trip['country'] == 'United States':
        h += f'<p class="small">Fishing for tuna or billfish offshore? You may also need a federal permit. <a class="link" href="{page_path(federal)}">US federal rules</a>.</p>'
    if rec:
        h += f'<p class="small"><a class="link" href="{page_path(rec)}">Full {E(rec["name"])} licence guide ↗</a> · Checked {MONTH}.</p>'
    return h + '</section>'


def jurisdiction_page(r, trips):
    name = r['name']
    body = f'<div class="wrap lic-page"><nav class="breadcrumbs"><a href="/">Home</a> / <a href="{HUB}">Fishing licenses</a> / {E(name)}</nav>'
    body += f'<header class="lic-head"><span class="eyebrow">FISHING LICENCE · {E(r["country"].upper())}</span><h1>{E(name)} fishing licence</h1><p class="lic-answer">{E(r["summary"])}</p>{buttons(r)}<p class="small">Updated {E(r['checked'])}</p></header>'
    body += '<div class="lic-grid"><div>'
    body += bullets('Who needs one', r.get('whoNeedsOne')) + bullets('Who doesn’t', r.get('exemptions'))
    if r.get('options'):
        body += '<h2>Licence options and prices</h2>' + options_table(r)
    if r.get('extras'):
        body += '<h2>Extra stamps and permits</h2><ul>' + ''.join(
            f'<li><b>{E(x["name"])}</b>{(" · " + E(money(x))) if money(x) else ""}<br>{E(x.get("when") or "")}</li>' for x in r['extras']) + '</ul>'
    if r.get('saltwater'):
        body += f'<h2>Saltwater</h2><p>{E(r["saltwater"])}</p>'
    if r.get('guidedTrips'):
        body += f'<h2>Fishing with a guide or charter</h2><p>{E(r["guidedTrips"])}</p>'
    body += bullets('Rules visitors should know', r.get('keyRules'))
    if r.get('howToBuy'):
        body += f'<h2>How to buy</h2><p>{E(r["howToBuy"])}</p>'
    if r.get('freeFishingDays'):
        body += '<h2>License-free days</h2><p>' + E(r['freeFishingDays']) + '</p>'
    if r['id'] == 'us-florida':
        body += '<p><a href="/guides/florida-visitor-fishing-license-planner/">Check a visitor outing with the Florida license planner</a>.</p>'
    body += '</div><aside>'
    if trips:
        body += f'<div class="panel"><span class="eyebrow">TRIPS IN {E(name.upper())}</span><ul>' + ''.join(
            f'<li><a href="{t.get("canonicalPath", "/trips/" + t["id"] + "/")}">{E(t["title"])}</a></li>' for t in trips[:12]) + '</ul></div>'
    body += '</aside></div>'
    srcs = r.get('sources', [])
    body += f'<details class="lic-sources"><summary>Sources ({len(srcs)})</summary><ol>' + ''.join(
        f'<li>{link(s["url"], s.get("title") or s["url"])}</li>' for s in srcs) + f'</ol><p class="small">Checked {MONTH}. Prices and rules change: confirm on the official site before you fish.</p></details></div>'
    faq = [(f'Do I need a fishing licence in {name}?', r['summary'])]
    vis = [o for o in r.get('options', []) if o.get('who') in ('non-resident', 'any') and money(o)]
    if vis:
        faq.append((f'How much is a visitor fishing licence in {name}?', '; '.join(f'{o["name"]}: {money(o)}' for o in vis[:4]) + f' (checked {MONTH}).'))
    if r.get('howToBuy'):
        faq.append((f'Where do I buy a fishing licence in {name}?', r['howToBuy']))
    body += '<section class="wrap"><h2>Common license questions</h2>' + ''.join('<details><summary>' + E(q) + '</summary><p>' + E(a) + '</p></details>' for q,a in faq) + '</section>'
    schema = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}
    body += '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    return body


def install(pages, root, add, trips):
    recs = json.loads((root / 'src/licenses.json').read_text())['jurisdictions']
    permits_path = root / 'src/trip-permits.json'
    permits = json.loads(permits_path.read_text()).get('trips', {}) if permits_path.exists() else {}
    by_id = {r['id']: r for r in recs}
    by_country = {}
    for r in recs:
        if r['id'] in ('us-federal', 'ca-national-parks'):
            continue
        by_country.setdefault(r['country'], []).append(r)
    federal = by_id.get('us-federal')
    per_rec = {}
    for t in trips:
        rec = by_id.get(permits.get(t['id'], {}).get('jurisdiction')) or match(t, by_country)
        if rec:
            per_rec.setdefault(rec['id'], []).append(t)
        path = t.get('canonicalPath', '/trips/' + t['id'] + '/')
        page = pages.get(path)
        if not page or page.get('redirectTo'):
            continue
        panel = trip_panel(t, rec, permits, federal)
        marker = '</div><aside class="article-aside">'
        page['body'] = page['body'].replace(marker, panel + marker, 1) if marker in page['body'] else page['body'] + '<div class="wrap">' + panel + '</div>'
    for r in recs:
        title = f'{r["name"]} Fishing License | Castward'
        if len(title) > 60:
            title = f'{r["name"]} Fishing License'
        add(page_path(r), title, (r['summary'][:150]).rstrip(), jurisdiction_page(r, per_rec.get(r['id'], [])), 'article')
        pages[page_path(r)]['modified'] = max(r['checked'], '2026-11-12')
        pages[page_path(r)]['citations'] = [s['url'] for s in r.get('sources', [])]
    groups = {}
    for r in recs:
        groups.setdefault(r['country'], []).append(r)
    body = f'<div class="wrap lic-page"><header class="lic-head"><span class="eyebrow">FISHING LICENSES</span><h1>Fishing licenses, state by state and country by country.</h1><p class="lic-answer">Check the rules for the place you will fish. Compare visitor licenses, extra permits, and exemptions, then use the official purchase link.</p></header>'
    body += '<label class="lic-search"><span>Find a state or country</span><input type="search" placeholder="Try “Alaska”, “Norway” or “Queensland”" data-lic-filter></label><div class="lic-groups">'
    order = ['United States', 'Canada', 'Mexico'] + sorted(c for c in groups if c not in ('United States', 'Canada', 'Mexico'))
    for c in order:
        items = sorted(groups[c], key=lambda r: r['name'])
        body += f'<section class="lic-group" data-lic-group><h2>{E(c)}</h2><ul>' + ''.join(
            f'<li data-lic-name="{E((r["name"] + " " + c).lower(), quote=True)}"><a href="{page_path(r)}">{E(r["name"])}</a></li>' for r in items) + '</ul></section>'
    body += '</div><p><a href="/guides/florida-visitor-fishing-license-planner/">Florida visitors: check shore, pier, and charter coverage</a>.</p><p class="small">Checked ' + MONTH + ' against official sources. Always confirm on the official site before you fish.</p></div>'
    body += '<script>(()=>{const i=document.querySelector("[data-lic-filter]");if(!i)return;i.addEventListener("input",()=>{const q=i.value.trim().toLowerCase();document.querySelectorAll("[data-lic-group]").forEach(g=>{let n=0;g.querySelectorAll("li").forEach(li=>{const m=!q||li.dataset.licName.includes(q);li.hidden=!m;n+=m});g.hidden=!n;});});})();</script>'
    add(HUB, 'Fishing Licenses by State and Country | Castward',
        f'Fishing licence rules for {len(recs)} US states, Canadian provinces and countries: who needs one, visitor prices and official links to buy.', body, 'article')
    pages[HUB]['modified'] = '2026-11-11'
    return len(recs), sum(len(v) for v in per_rec.values())
