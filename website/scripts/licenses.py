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
    if r.get('buyUrl'):
        return link(r['buyUrl'], 'Buy on the official site ↗', cls)
    if r.get('authority', {}).get('url'):
        return link(r['authority']['url'], 'Go to the official site ↗', cls)
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
    if low:
        ticket = f'<div><small>Visitor licence from</small><strong>{E(price_text(low))}</strong><span>{E(low.get("duration") or low["name"])}</span></div>'
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
        body += step(n, 'Which licence can you buy?', option_cards(r) + f'<p class="lic-note">Prices from the official source, checked {checked}.</p>')
        n += 1
    if r.get('extras'):
        rows = ''.join(
            f'<li><b>{E(x["name"])}</b><i>{E(price_text(x))}</i>' + (f'<span>{E(x["when"])}</span>' if x.get('when') else '') + '</li>' for x in r['extras'])
        body += step(n, 'Extra stamps and permits', f'<ul class="lic-rows">{rows}</ul>')
        n += 1
    how = f'<p>{E(r["howToBuy"])}</p>' if r.get('howToBuy') else f'<p>Use the official {E(name)} site.</p>'
    if r['id'] == 'us-florida':
        how = how[:-4] + ' <a class="link" href="/guides/florida-visitor-fishing-license-planner/">Check a visitor outing with the Florida license planner</a>.</p>'
    body += step(n, 'Where can you buy the licence?', f'<div class="lic-buy"><div>{how}</div>{buy_button(r)}</div>')
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
    body += '<label class="lic-search"><span>Where will you fish?</span><input type="search" placeholder="Try “Alaska”, “Norway” or “Queensland”" data-lic-filter></label><div>'
    order = ['United States', 'Canada', 'Mexico'] + sorted(c for c in groups if c not in ('United States', 'Canada', 'Mexico'))
    solo = [c for c in order if len(groups[c]) == 1]
    blocks = [(c, groups[c]) for c in order if len(groups[c]) > 1] + ([('Other countries', [groups[c][0] for c in solo])] if solo else [])
    for c, rs in blocks:
        items = sorted(rs, key=lambda r: r['name'])
        body += f'<section class="lic-group" data-lic-group><h2>{E(c)}</h2><ul class="lic-hub-list">'
        for r in items:
            low = cheapest(r)
            sub = f'<span>Visitor licence from {E(price_text(low))}</span>' if low else '<span>Rules and official link</span>'
            body += f'<li data-lic-name="{E((r["name"] + " " + r["country"]).lower(), quote=True)}"><a href="{page_path(r)}"><b>{E(r["name"])}</b>{sub}</a></li>'
        body += '</ul></section>'
    body += '</div><p><a class="link" href="/guides/florida-visitor-fishing-license-planner/">Florida visitors: check shore, pier, and charter coverage</a>.</p><p class="small">Checked ' + MONTH + ' against official sources. Always confirm on the official site before you fish.</p></div>'
    body += '<script>(()=>{const i=document.querySelector("[data-lic-filter]");if(!i)return;i.addEventListener("input",()=>{const q=i.value.trim().toLowerCase();document.querySelectorAll("[data-lic-group]").forEach(g=>{let n=0;g.querySelectorAll("li").forEach(li=>{const m=!q||li.dataset.licName.includes(q);li.hidden=!m;n+=m});g.hidden=!n;});});})();</script>'
    add(HUB, 'Fishing Licenses by State and Country | Castward',
        f'Fishing licence rules for {len(recs)} US states, Canadian provinces and countries: who needs one, visitor prices and official links to buy.', body, 'article')
    pages[HUB]['modified'] = max(r.get('contentModified', max(r['checked'], '2026-11-15')) for r in recs)
    return len(recs), sum(len(v) for v in per_rec.values())
