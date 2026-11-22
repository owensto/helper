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
        visitor = sorted([o for o in rec.get('options', []) if o.get('who') in ('non-resident', 'any', None)],
                         key=lambda o: (o.get('price') is None, o.get('price') or 0))[:3]
        if visitor:
            h += '<ul class="lic-chips">' + ''.join(
                f'<li><b>{E(o.get("duration") or o["name"])}</b><span>{E(price_text(o) or o["name"])}</span></li>' for o in visitor) + '</ul>'
        if rec.get('howToBuy'):
            h += f'<p class="small">{E(rec["howToBuy"])}</p>'
        h += f'<div class="lic-actions">{buy_button(rec)}<a class="btn btn-quiet" href="{page_path(rec)}">{E(rec["name"])} licence steps</a></div>'
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
        h += f'<p class="small">Checked against official sources on {nice_date(rec["checked"])}.</p>'
    return h + '</section>'


MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split()
WATER = {'freshwater': 'Freshwater', 'saltwater': 'Saltwater', 'both': 'Fresh and salt water'}
WHO = {'non-resident': 'Visitor', 'resident': 'Resident', 'any': 'Any angler'}

STYLE = """<style>
.lic2{max-width:1040px;padding-top:8px;padding-bottom:64px}
.lic2 h1{font-size:clamp(38px,5.2vw,64px);line-height:1.02;margin:10px 0 18px}
.lic2 h2{font-size:clamp(24px,2.4vw,30px);margin:0 0 16px;display:flex;gap:12px;align-items:baseline}
.lic2 h3{font:600 12px/1.4 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.lic2 ul{margin:0;padding:0;list-style:none}
.lic-top{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:40px;align-items:start;margin:8px 0 44px}
.lic-top .lic-answer{font-size:1.15rem;line-height:1.55;margin:0;max-width:56ch}
.lic-ticket{background:var(--forest);color:#fffefa;border-radius:18px;padding:24px;display:grid;gap:14px}
.lic-ticket small{display:block;font:600 11px/1.4 var(--font);letter-spacing:.12em;text-transform:uppercase;color:#d2c5b5}
.lic-ticket strong{font:400 44px/1 var(--display);letter-spacing:-.02em;display:block;margin-top:6px}
.lic-ticket span{font-size:14px;color:#e6e2d6}
.lic-ticket .btn,.lic-step .btn{display:inline-flex;justify-content:center;align-items:center;width:100%;text-align:center;white-space:normal}
.lic-ticket .btn{background:#f5f2e9;color:#142d3a}.lic-ticket .btn:hover{background:#fff;color:#142d3a}
.lic-ticket em{font-style:normal;font-size:12px;color:#c9cdc6}
.lic-step{border-top:1px solid var(--line);padding:32px 0}
.lic-num{flex:0 0 auto;width:30px;height:30px;border-radius:50%;background:var(--lime);color:var(--ink);font:600 14px/30px var(--font);text-align:center;letter-spacing:0;transform:translateY(-3px)}
.lic-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.lic-box{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
.lic-box li{position:relative;padding-left:26px;margin:8px 0;line-height:1.45}
.lic-box li:before{position:absolute;left:0;top:0;font-weight:700}
.lic-yes li:before{content:"\\2713";color:#2f6b4f}
.lic-no li:before{content:"\\2013";color:var(--gold)}
.lic-cards+h3{margin-top:22px}
.lic-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:18px}
.lic-card{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:4px}
.lic-card b{font:600 12px/1.3 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.lic-card strong{font:400 30px/1.1 var(--display);letter-spacing:-.02em}
.lic-card span{font-size:13px;line-height:1.35;color:var(--muted)}
.lic-rows li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 18px;padding:14px 0;border-bottom:1px solid var(--line)}
.lic-rows li:last-child{border-bottom:0}
.lic-rows b{font-weight:600}
.lic-rows i{font-style:normal;font-weight:600;white-space:nowrap}
.lic-rows span{grid-column:1/-1;font-size:14px;color:var(--muted);line-height:1.45}
.lic-buy{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:center}
.lic-buy p{margin:0}
.lic-more details{border-top:1px solid var(--line);padding:16px 0}
.lic-more details:last-child{border-bottom:1px solid var(--line)}
.lic-more summary{cursor:pointer;font-weight:600;font-size:17px}
.lic-more p,.lic-more ol{margin:12px 0 4px;color:var(--ink)}
.lic-more ol{padding-left:20px}
.lic-more .lic-sources{margin-top:0}
.lic-hub header{margin:8px 0 28px}.lic-hub header .lic-answer{font-size:1.15rem;margin:0}.lic-hub .lic-search span{font-weight:600;margin-bottom:8px}
.lic-trips{display:flex;flex-wrap:wrap;gap:8px}
.lic-trips a,.lic-hub-list a{display:block;border:1px solid var(--line);background:var(--white);border-radius:12px;padding:10px 14px;font-size:14px;line-height:1.3;text-decoration:none}
.lic-trips a:hover,.lic-hub-list a:hover{border-color:var(--gold)}
.lic-note{font-size:13px;color:var(--muted);margin-top:14px}
.lic-hub .lic-search{max-width:560px;margin:0 0 36px}
.lic-hub .lic-search input{font-size:17px;padding:16px 18px;border-radius:14px}
.lic-hub .lic-group{margin:0 0 36px}
.lic-hub .lic-group h2{font-size:24px;margin-bottom:12px}
.lic-hub-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.lic-hub-list b{display:block;font-weight:600}
.lic-hub-list span{font-size:12px;color:var(--muted)}
@media(max-width:820px){.lic-top,.lic-buy{grid-template-columns:1fr;gap:22px}.lic-two{grid-template-columns:1fr}.lic-cards{grid-template-columns:1fr 1fr}.lic-step{padding:26px 0}.lic-hub-list{grid-template-columns:1fr 1fr}}
</style>"""


def nice_date(d):
    y, m, day = d.split('-')
    return f'{int(day)} {MONTHS[int(m) - 1]} {y}'


def price_text(o):
    if o.get('price') == 0:
        return 'Free'
    return money(o)


def cheapest(r):
    priced = [o for o in r.get('options', []) if o.get('who') != 'resident' and o.get('price')]
    return min(priced, key=lambda o: o['price']) if priced else None


def buy_button(r, cls='btn'):
    kind = r.get('licenceNeeded')
    if r.get('buyUrl'):
        return link(r['buyUrl'], {'no': 'Get the local permit ↗', 'local': 'Find a local permit ↗'}.get(kind, 'Buy on the official site ↗'), cls)
    if r.get('authority', {}).get('url'):
        return link(r['authority']['url'], 'Check the official rules ↗' if kind == 'no' else 'Go to the official site ↗', cls)
    return ''


def option_cards(r):
    opts = r.get('options', [])
    waters = [w for w in ('freshwater', 'saltwater', 'both') if any(o.get('water') == w for o in opts)]
    groups = [(WATER[w], [o for o in opts if o.get('water') == w]) for w in waters] if len(waters) > 1 else [('', opts)]
    rest = [o for o in opts if o.get('water') not in WATER]
    if rest and len(waters) > 1:
        groups.append(('Other', rest))
    h = ''
    for label, rows in groups:
        if label:
            h += f'<h3>{E(label)}</h3>'
        h += '<ul class="lic-cards">'
        for o in sorted(rows, key=lambda o: (o.get('price') is None, o.get('price') or 0)):
            h += (f'<li class="lic-card"><b>{E(o.get("duration") or WHO.get(o.get("who"), "Licence"))}</b>'
                  f'<strong>{E(price_text(o) or "See site")}</strong><span>{E(o["name"])}</span></li>')
        h += '</ul>'
    return h


def step(n, title, inner):
    return f'<section class="lic-step"><h2><span class="lic-num">{n}</span>{E(title)}</h2>{inner}</section>'


def jurisdiction_page(r, trips):
    name = r['name']
    checked = nice_date(r['checked'])
    low = cheapest(r)
    body = STYLE + f'<div class="wrap lic-page lic2"><nav class="breadcrumbs"><a href="/">Home</a> / <a href="{HUB}">Fishing licenses</a> / {E(name)}</nav>'
    body += f'<header class="lic-top"><div><span class="eyebrow">FISHING LICENCE · {E(r["country"].upper())}</span><h1>{E(r.get("h1", name + " fishing licence"))}</h1><p class="lic-answer">{E(r["summary"])}</p></div>'
    kind = r.get('licenceNeeded')
    if kind == 'no':
        ticket = '<div><small>General fishing licence</small><strong>Not needed</strong><span>Local permits and rules can still apply.</span></div>'
    elif low:
        ticket = f'<div><small>Visitor licence from</small><strong>{E(price_text(low))}</strong><span>{E(low.get("duration") or low["name"])}</span></div>'
    elif kind == 'local':
        ticket = '<div><small>Fishing permit</small><strong>Sold per water</strong><span>The owner, club or region sets the price.</span></div>'
    elif not r.get('buyUrl'):
        ticket = '<div><small>Fishing licence</small><strong>Ask locally</strong><span>No official online sale. See “Where can you get the licence?” below.</span></div>'
    else:
        ticket = f'<div><small>Official source</small><span>{E(r.get("authority", {}).get("name") or name)}</span></div>'
    body += f'<aside class="lic-ticket">{ticket}{buy_button(r)}<em>Checked against official sources on {checked}.</em></aside></header>'
    n = 1
    need, exempt = [i for i in r.get('whoNeedsOne') or [] if i], [i for i in r.get('exemptions') or [] if i]
    if need or exempt:
        inner = '<div class="lic-two">'
        if need:
            inner += '<div class="lic-box lic-yes"><h3>You need a licence</h3><ul>' + ''.join(f'<li>{E(i)}</li>' for i in need) + '</ul></div>'
        if exempt:
            inner += '<div class="lic-box lic-no"><h3>You do not need one</h3><ul>' + ''.join(f'<li>{E(i)}</li>' for i in exempt) + '</ul></div>'
        body += step(n, f'Who needs a fishing licence in {name}?', inner + '</div>')
        n += 1
    if r.get('options'):
        cmp_link = f' <a class="link" href="{HUB}non-resident-prices/">Compare trip prices for all 50 states</a>.' if r.get('country') == 'United States' and r['id'] != 'us-federal' else ''
        body += step(n, 'Which licence can you buy?', option_cards(r) + f'<p class="lic-note">Prices from the official source, checked {checked}.{cmp_link}</p>')
        n += 1
    if r.get('extras'):
        rows = ''.join(
            f'<li><b>{E(x["name"])}</b><i>{E(price_text(x))}</i>' + (f'<span>{E(x["when"])}</span>' if x.get('when') else '') + '</li>' for x in r['extras'])
        body += step(n, 'Extra stamps and permits', f'<ul class="lic-rows">{rows}</ul>')
        n += 1
    how = f'<p>{E(r["howToBuy"])}</p>' if r.get('howToBuy') else f'<p>Use the official {E(name)} site.</p>'
    if r['id'] == 'us-florida':
        how = how[:-4] + ' <a class="link" href="/guides/florida-visitor-fishing-license-planner/">Check a visitor outing with the Florida license planner</a>.</p>'
    body += step(n, 'What do you need instead?' if kind == 'no' else 'Where can you buy the licence?' if r.get('buyUrl') else 'Where can you get the licence?', f'<div class="lic-buy"><div>{how}</div>{buy_button(r)}</div>')
    n += 1
    rules = [i for i in r.get('keyRules') or [] if i]
    if rules:
        body += step(n, 'Rules to know before you fish', '<div class="lic-box lic-yes"><ul>' + ''.join(f'<li>{E(i)}</li>' for i in rules) + '</ul></div>')
    more = ''
    for title, key in (('Saltwater fishing', 'saltwater'), ('Fishing with a guide or charter', 'guidedTrips'),
                       ('Licence-free days', 'freeFishingDays'), ('What to confirm before the trip', 'checkOfficial')):
        if r.get(key):
            more += f'<details><summary>{title}</summary><p>{E(r[key])}</p></details>'
    faq = [(f'Do I need a fishing licence in {name}?', r['summary'])]
    vis = [o for o in r.get('options', []) if o.get('who') in ('non-resident', 'any') and money(o)]
    if vis:
        faq.append((f'How much is a visitor fishing licence in {name}?', '; '.join(f'{o["name"]}: {money(o)}' for o in vis[:4]) + f' (checked {MONTH}).'))
    if r.get('howToBuy'):
        faq.append((f'Where do I buy a fishing licence in {name}?', r['howToBuy']))
    if r.get('faq'):
        faq = [(x['q'], x['a']) for x in r['faq']]
    more += ''.join('<details><summary>' + E(q) + '</summary><p>' + E(a) + '</p></details>' for q, a in faq)
    srcs = r.get('sources', [])
    more += f'<details class="lic-sources"><summary>Sources ({len(srcs)})</summary><ol>' + ''.join(
        f'<li>{link(s["url"], s.get("title") or s["url"])}</li>' for s in srcs) + '</ol><p class="small">Prices and rules change. Confirm on the official site before you fish.</p></details>'
    body += f'<section class="lic-step lic-more"><h2>More detail</h2>{more}</section>'
    if trips:
        body += f'<section class="lic-step"><h2>Trips in {E(name)}</h2><div class="lic-trips">' + ''.join(
            f'<a href="{t.get("canonicalPath", "/trips/" + t["id"] + "/")}">{E(t["title"])}</a>' for t in trips[:8]) + '</div></section>'
    body += '</div>'
    schema = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}
    body += '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    return body


COMPARE = HUB + 'non-resident-prices/'
COMPARE_STYLE = """<style>
.lic-cmp table{width:100%;border-collapse:collapse;background:var(--white);border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:15px}
.lic-cmp th,.lic-cmp td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
.lic-cmp th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.lic-cmp th[aria-sort]{cursor:pointer}.lic-cmp th[aria-sort]::after{content:" ↕"}.lic-cmp th[aria-sort=ascending]::after{content:" ↑"}.lic-cmp th[aria-sort=descending]::after{content:" ↓"}
.lic-cmp td b{display:block;font-size:17px}.lic-cmp td span{display:block;font-size:12px;color:var(--muted)}
.lic-cmp tr:last-child td{border-bottom:0}.lic-cmp .lic-scroll{overflow-x:auto}
.lic-cmp .lic-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 28px;padding:0;list-style:none}
.lic-cmp .lic-facts li{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:16px}
.lic-cmp .lic-facts b{display:block;font-size:26px}.lic-cmp .lic-facts span{font-size:13px;color:var(--muted)}
@media(max-width:820px){.lic-cmp .lic-facts{grid-template-columns:1fr}.lic-cmp th,.lic-cmp td{padding:10px}}
</style>"""


def usd(p):
    return f'${int(p)}' if float(p).is_integer() else f'${float(p):.2f}'


def trip_cost(r, n):
    """Lowest adult non-resident licence cost for a trip of n days, from the record's own options.
    Returns (total, label, extra lines) or None."""
    opts = [o for o in r.get('options', []) if o.get('tripDays')]
    need = lambda kind: [x for x in r.get('extras', []) if kind in (x.get('withCompare') or [])]
    plus = lambda kind: sum(x['price'] for x in need(kind))
    cands = []
    for o in opts:
        kind = 'annual' if o['tripDays'] >= 365 else 'short'
        if o['tripDays'] >= n:
            cands.append((round(o['price'] + plus(kind), 2), o['tripDays'], o['name'], kind))
        if o.get('extraDay') is not None:
            cands.append((round(o['price'] + (n - 1) * o['extraDay'] + plus('short'), 2), n, f'{n} days at the daily price', 'short'))
    if not cands:
        return None
    total, _, label, kind = min(cands)
    lines = [f'Includes the required {x["name"]}, {usd(x["price"])}' for x in need(kind)]
    one = [o for o in opts if o['tripDays'] == 1 and o.get('extraDay') is None]
    if one:
        alt = round(min(o['price'] for o in one) * n + plus('short'), 2)
        if alt < total:
            lines.append(f'{n} one-day licences cost {usd(alt)}')
    return total, label, lines


def compare_rows(recs):
    rows = []
    for r in sorted(recs, key=lambda r: r['name']):
        if r.get('country') != 'United States' or not any(o.get('compare') for o in r.get('options', [])):
            continue
        ann = next((o for o in r['options'] if o.get('compare') == 'annual'), None)
        year = None
        if ann and ann.get('price'):
            add = [x for x in r.get('extras', []) if 'annual' in (x.get('withCompare') or [])]
            year = (round(ann['price'] + sum(x['price'] for x in add), 2), ann, add)
        rows.append({'r': r, 'd3': trip_cost(r, 3), 'd7': trip_cost(r, 7), 'year': year, 'ann': ann})
    return rows


def compare_page(recs):
    rows = compare_rows(recs)
    d3 = sorted((x['d3'][0], x['r']['name']) for x in rows if x['d3'])
    d7 = sorted((x['d7'][0], x['r']['name']) for x in rows if x['d7'])
    yr = sorted((x['year'][0], x['r']['name']) for x in rows if x['year'])
    med = lambda v: v[len(v) // 2][0]
    newest = max(x['r']['checked'] for x in rows)
    answer = (f'For a fishing trip to another state, the licence costs from {usd(d3[0][0])} ({d3[0][1]}) to {usd(d3[-1][0])} ({d3[-1][1]}) for a 3-day weekend, '
              f'and from {usd(d7[0][0])} ({d7[0][1]}) to {usd(d7[-1][0])} ({d7[-1][1]}) for a week. The median price is {usd(med(d3))} for 3 days and {usd(med(d7))} for 7 days. '
              f'Each price is from the state agency.')
    body = STYLE + COMPARE_STYLE + (f'<div class="wrap lic-page lic2 lic-cmp"><nav class="breadcrumbs"><a href="/">Home</a> / <a href="{HUB}">Fishing licenses</a> / Non-resident prices</nav>'
            f'<header><span class="eyebrow">FISHING TRIPS · UNITED STATES</span><h1>Non-resident fishing license cost by state</h1><p class="lic-answer">{E(answer)}</p></header>')
    body += ('<ul class="lic-facts">'
             f'<li><span>Weekend trip, 3 days</span><b>{usd(d3[0][0])} to {usd(d3[-1][0])}</b><span>Median {usd(med(d3))}</span></li>'
             f'<li><span>Week trip, 7 days</span><b>{usd(d7[0][0])} to {usd(d7[-1][0])}</b><span>Median {usd(med(d7))}</span></li>'
             f'<li><span>Full year</span><b>{usd(yr[0][0])} to {usd(yr[-1][0])}</b><span>Median {usd(med(yr))}, {len(yr)} states with a listed price</span></li></ul>')
    has_free = any(x['r'].get('freeDays') for x in rows)
    body += ('<div class="lic-scroll"><table data-lic-sort><thead><tr><th aria-sort="ascending">State</th><th aria-sort="none">Weekend, 3 days</th>'
             '<th aria-sort="none">Week, 7 days</th><th aria-sort="none">Full year</th>' + ('<th>Free fishing days</th>' if has_free else '') + '</tr></thead><tbody>')

    def trip_cell(t):
        if not t:
            return '<td data-v="99999"><span>See the state page</span></td>'
        return f'<td data-v="{t[0]}"><b>{usd(t[0])}</b><span>{E(t[1])}</span>' + ''.join(f'<span>{E(l)}</span>' for l in t[2]) + '</td>'

    for x in rows:
        r = x['r']
        if x['year']:
            total, o, add = x['year']
            year = (f'<td data-v="{total}"><b>{usd(total)}</b><span>{E(o["name"])} · {E(o["duration"])}</span>'
                    + ''.join(f'<span>Includes the required {E(a["name"])}, {usd(a["price"])}</span>' for a in add) + '</td>')
        elif x['ann']:
            year = f'<td data-v="99999"><span>{E(x["ann"]["name"])}: price on the official site</span></td>'
        else:
            year = '<td data-v="99999"><span>See the state page</span></td>'
        fd = ''
        if has_free:
            f = r.get('freeDays')
            if not f:
                fd = '<td><span>Not confirmed</span></td>'
            elif f['has'] == 'no':
                fd = f'<td><span>None. {link(f["source"], "Source")}</span></td>'
            else:
                when = f.get('dates2027') and f'2027: {f["dates2027"]}' or f.get('rule') or (f.get('dates2026') and f'2026: {f["dates2026"]}') or 'Yes'
                who = {'yes': 'Visitors included.', 'no': 'Residents only.'}.get(f.get('nonResidents'), '')
                if 'residents only' in f.get('notes', '').lower():
                    who = ''
                fd = f'<td>{E(when)}<span>{E(" ".join(i for i in (who, f.get("notes", "")) if i))} {link(f["source"], "Source")}</span></td>'
        body += (f'<tr><td data-v="{E(r["name"], quote=True)}"><a class="link" href="{page_path(r)}">{E(r["name"])}</a><span>Checked {nice_date(r["checked"])}</span></td>'
                 f'{trip_cell(x["d3"])}{trip_cell(x["d7"])}{year}{fd}</tr>')
    body += '</tbody></table></div>'
    body += ('<section class="lic-step"><h2>How to read the table</h2><div class="lic-box lic-yes"><ul>'
             '<li>Each price is for an adult who does not live in the state.</li>'
             '<li>The trip price is the lowest-priced licence that covers all days of the trip. The name of that licence is below the price.</li>'
             '<li>Where the state requires a stamp or fee with that licence, the price includes it and the row names it.</li>'
             '<li>Stamps for one species or one water, such as trout, salmon or saltwater, are not in the price. The state page lists them.</li>'
             '<li>Most rows show the freshwater licence. Where a state sells the coastal licence as the main visitor product, the licence name shows it.</li>'
             '<li>Each row links to the state page, which has all visitor options, the rules and the official link to buy.</li></ul></div></section>')
    fixed = [x['r']['name'] for x in rows if x['ann'] and re.search(r'december 31|calendar year', x['ann']['duration'], re.I)]
    rolling = [x['r']['name'] for x in rows if x['ann'] and re.search(r'^(365 days|1 year|12 months)$', x['ann']['duration'], re.I)]
    hol = '<section class="lic-step"><h2>Holiday and end-of-year trips</h2><div class="lic-box lic-yes"><ul>'
    if fixed:
        hol += (f'<li>In {len(fixed)} states the annual licence in this table ends on 31 December: {E(", ".join(fixed))}. '
                'For a Thanksgiving, Christmas or New Year trip there, compare the short licence first. A trip that crosses 1 January can need a licence for each year.</li>')
    if rolling:
        hol += f'<li>In {len(rolling)} states the annual licence is valid for 12 months from the date you buy it: {E(", ".join(rolling))}. A licence for a holiday trip also covers a trip next summer.</li>'
    season = []
    for x in rows:
        f = x['r'].get('freeDays') or {}
        hit = next((f[k] for k in ('dates2026', 'rule', 'dates2027') if re.search(r'thanksgiving|november|december|veterans', f.get(k) or '', re.I)), None)
        if hit:
            season.append(f'<li><b>{E(x["r"]["name"])}:</b> {E(hit)}' + (' Residents only.' if f.get('nonResidents') == 'no' else '') + f' {link(f["source"], "Source")}</li>')
    if season:
        hol += '<li>Free fishing days in November and December, from the state agencies:<ul>' + ''.join(season) + '</ul></li>'
    hol += ('<li>The other states use a licence year with a fixed end date. The full-year column shows that period for each state.</li>'
            '<li>Buy the licence online before you travel. State offices and many licence agents close on public holidays.</li>'
            f'<li>Seasons and closures change by water and by month. See the <a class="link" href="/seasons/">season notes</a> and the <a class="link" href="/trips/">trips</a> for each state.</li></ul></div></section>')
    body += hol
    low7 = [f'{n} ({usd(p)})' for p, n in d7[:5]]
    faq = [
        ('How much is a fishing license for an out-of-state trip?',
         f'For a 3-day trip the licence costs from {usd(d3[0][0])} ({d3[0][1]}) to {usd(d3[-1][0])} ({d3[-1][1]}), with a median of {usd(med(d3))}. For a 7-day trip it costs from {usd(d7[0][0])} to {usd(d7[-1][0])}, with a median of {usd(med(d7))}.'),
        ('Which states have the cheapest non-resident fishing license for a week?',
         f'The five lowest prices for a 7-day trip in this table are: {", ".join(low7)}.'),
        ('Which state has the most expensive non-resident annual fishing license?',
         f'{yr[-1][1]} has the highest full-year price in this table: {usd(yr[-1][0])}. {yr[0][1]} has the lowest: {usd(yr[0][0])}.'),
        ('Do I need a licence for each state I fish in?',
         'Yes. Each state sells its own licence. A licence from one state is not valid in another state, except on some shared border waters. The state page shows the rule for each place.'),
    ]
    body += '<section class="lic-step lic-more"><h2>Questions</h2>' + ''.join(
        '<details><summary>' + E(q) + '</summary><p>' + E(a) + '</p></details>' for q, a in faq)
    body += '<details class="lic-sources"><summary>Sources (' + str(len(rows)) + ')</summary><ol>' + ''.join(
        f'<li>{link(x["r"]["sources"][0]["url"], x["r"]["name"] + ": " + (x["r"].get("authority", {}).get("name") or "official source"))}</li>'
        for x in rows if x['r'].get('sources')) + '</ol></details></section>'
    body += (f'<p class="small">Prices come from each state agency. The last check of a row was on {nice_date(newest)}. Prices change; confirm on the official site before you buy. '
             f'To cite this table: Castward, “Non-resident fishing license cost by state”, castward.app{COMPARE}.</p></div>')
    body += ('<script>(()=>{const t=document.querySelector("[data-lic-sort]");if(!t)return;const hs=[...t.tHead.rows[0].cells];hs.forEach((h,i)=>{if(!h.hasAttribute("aria-sort"))return;'
             'h.addEventListener("click",()=>{const up=h.getAttribute("aria-sort")!=="ascending";hs.forEach(x=>x.hasAttribute("aria-sort")&&x.setAttribute("aria-sort","none"));'
             'h.setAttribute("aria-sort",up?"ascending":"descending");const rs=[...t.tBodies[0].rows];rs.sort((a,b)=>{const x=a.cells[i].dataset.v,y=b.cells[i].dataset.v;'
             'const n=isNaN(x)||isNaN(y)?x.localeCompare(y):x-y;return up?n:-n});rs.forEach(r=>t.tBodies[0].append(r));});});})();</script>')
    schema = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}
    body += '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    cites = [x['r']['sources'][0]['url'] for x in rows if x['r'].get('sources')] + [x['r']['freeDays']['source'] for x in rows if x['r'].get('freeDays')]
    return body, cites, newest


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
        title = r.get('title', title)
        add(page_path(r), title, r.get('description', (r['summary'][:150]).rstrip()), jurisdiction_page(r, per_rec.get(r['id'], [])), 'article')
        pages[page_path(r)]['modified'] = r.get('contentModified', max(r['checked'], '2026-11-15'))
        pages[page_path(r)]['citations'] = [s['url'] for s in r.get('sources', [])]
    groups = {}
    for r in recs:
        groups.setdefault(r['country'], []).append(r)
    body = STYLE + f'<div class="wrap lic-page lic2 lic-hub"><header><span class="eyebrow">FISHING LICENSES</span><h1>Fishing licenses by state and country</h1><p class="lic-answer">Pick the place you will fish. See who needs a licence, the visitor price, and the official link to buy it.</p></header>'
    body += f'<p><a class="link" href="{COMPARE}">Trip to another state? Compare non-resident prices for all 50 states</a></p>'
    body += '<label class="lic-search"><span>Where will you fish?</span><input type="search" placeholder="Try “Alaska”, “Norway” or “Queensland”" data-lic-filter></label><div>'
    order = ['United States', 'Canada', 'Mexico'] + sorted(c for c in groups if c not in ('United States', 'Canada', 'Mexico'))
    solo = [c for c in order if len(groups[c]) == 1]
    blocks = [(c, groups[c]) for c in order if len(groups[c]) > 1] + ([('Other countries', [groups[c][0] for c in solo])] if solo else [])
    for c, rs in blocks:
        items = sorted(rs, key=lambda r: r['name'])
        body += f'<section class="lic-group" data-lic-group><h2>{E(c)}</h2><ul class="lic-hub-list">'
        for r in items:
            low = cheapest(r)
            kind = r.get('licenceNeeded')
            sub = ('<span>No general licence needed</span>' if kind == 'no' else f'<span>Visitor licence from {E(price_text(low))}</span>' if low
                   else '<span>Permits sold per water</span>' if kind == 'local' else '<span>Online purchase link</span>' if r.get('buyUrl') else '<span>Where to get it</span>')
            body += f'<li data-lic-name="{E((r["name"] + " " + r["country"]).lower(), quote=True)}"><a href="{page_path(r)}"><b>{E(r["name"])}</b>{sub}</a></li>'
        body += '</ul></section>'
    body += '</div><p><a class="link" href="/guides/florida-visitor-fishing-license-planner/">Florida visitors: check shore, pier, and charter coverage</a>.</p><p class="small">Checked ' + MONTH + ' against official sources. Always confirm on the official site before you fish.</p></div>'
    body += '<script>(()=>{const i=document.querySelector("[data-lic-filter]");if(!i)return;i.addEventListener("input",()=>{const q=i.value.trim().toLowerCase();document.querySelectorAll("[data-lic-group]").forEach(g=>{let n=0;g.querySelectorAll("li").forEach(li=>{const m=!q||li.dataset.licName.includes(q);li.hidden=!m;n+=m});g.hidden=!n;});});})();</script>'
    listing = {'@context': 'https://schema.org', '@type': 'ItemList',
               'name': 'Fishing licenses by state and country', 'numberOfItems': len(recs),
               'itemListElement': [{'@type': 'ListItem', 'position': i, 'name': r['name'],
                                    'url': 'https://castward.app' + page_path(r)}
                                   for i, r in enumerate([r for _, rs in blocks for r in sorted(rs, key=lambda r: r['name'])], 1)]}
    body += '<script type="application/ld+json">' + json.dumps(listing, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    add(HUB, 'Fishing Licenses by State and Country | Castward',
        f'Fishing licence rules for {len(recs)} US states, Canadian provinces and countries: who needs one, visitor prices and official links to buy.', body, 'article')
    cmp_body, cmp_sources, cmp_date = compare_page(recs)
    add(COMPARE, 'Non-Resident Fishing License Cost by State: Trip Prices',
        'What a fishing licence costs for a trip to another state: 3-day, 7-day and full-year non-resident prices for all 50 states, from each state agency.', cmp_body, 'article')
    pages[COMPARE]['modified'] = max(cmp_date, '2026-11-22')
    pages[COMPARE]['citations'] = cmp_sources
    pages[HUB]['modified'] = max(r.get('contentModified', max(r['checked'], '2026-11-15')) for r in recs)
    return len(recs), sum(len(v) for v in per_rec.values())
