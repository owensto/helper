"""Final page pass: strip research/AI meta copy, render shopping lists and tag every Amazon link.

Runs once on the finished page bodies, just before HTML is written, so every
generator (trip guides, environments, styles, glossary...) gets the same rules.
"""
import json, re
from html import escape as E
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl

DISCLOSURE = 'As an Amazon Associate, Castward earns from qualifying purchases.'

# Whole elements that only describe how the page was made.
BLOCKS = [
    r'<figcaption\b[^>]*>.*?</figcaption>',
    r'<p class="photo-note">.*?</p>',
    r'<div class="wrap"><div class="review-line">.*?</div></div>',
    r'<div class="review-line">.*?</div>',
    r'<div class="brief-note">.*?</div>',
    r'<p class="editorial-note">.*?</p>',
    r'<div class="world-card-bottom">.*?</div>',
    r'<span class="small muted">Confirm the specification before choosing a product\.</span>',
    r'<span class="small muted">Local browser saving · no booking created</span>',
    r'<p class="small">Product searches are not exact-model endorsements\..*?</p>',
    r'<p class="small">The environment narrows the question\..*?</p>',
    r'<p class="small">The source describes the fishery\..*?</p>',
    r'<a href="/launch/">Distribution tools</a>',
    r'<a href="/production/">Editorial queues</a>',
]
BLOCK_RE = [re.compile(p, re.S) for p in BLOCKS]

# Sentences that talk about the research process instead of the trip.
META = re.compile('|'.join([
    r'not a promised', r'not established', r'been invented', r'not a verified', r'editorial scenario',
    r'editorial decision guidance', r'not a personal field test', r'not a compatibility check',
    r'already confirmed itinerary', r'directory listing is not confirmation', r'month-only', r'calendar-only',
    r'[Tt]he customer', r'preparation tool', r'this edition', r'[Nn]o seasonal recommendation',
    r'bookable inventory', r'exact-model', r'[Nn]o current prices', r'in the linked research',
    r'Check its named water or departure area', r'[Tt]he linked sources support', r'[Tt]his category guide',
    r'[Tt]he framework includes', r'research is not complete', r'not a national', r'not a catch forecast',
    r'[Tt]reat this as the question', r'[Tt]he local planning question is', r'not a universal',
    r'not exact-model reviews', r'search result will fit', r'[Uu]nhighlighted months',
    r'have not been verified', r'representative scenes', r'[Ss]cene images are illustrative', r'[Ii]mages are illustrative', r'[Tt]he working access question', r'preparation scenario',
    r'regional reference does not establish', r'a state-wide guide does not establish',
]))
SENTENCE = re.compile(r'(?<=[.!?”"])\s+(?=[A-Z“"])')

REPLACE = [
    ('WHAT THE RESEARCH ESTABLISHES', 'KEY FACTS'),
    ('SEASONAL CONTEXT, NOT A CATCH FORECAST', 'SEASON'),
    ('<h2>Sources &amp; review notes</h2>', '<h2>Sources</h2>'),
    ('Build a compatible setup, not a shopping bundle', 'Build your setup'),
    ('EQUIPMENT DECISIONS / NOT A UNIVERSAL KIT', 'SHOPPING LIST'),
    ('<h2>What this trip needs.</h2>', '<h2>What to bring.</h2>'),
    ('Compare this category on Amazon ↗', 'Shop on Amazon ↗'),
    ('About &amp; image notes', 'About'),
    ('>Types of water<', '>Waters<'),
    ('>Fishing environments<', '>Waters<'),
    ('UNDERSTAND THE ENVIRONMENT', 'KNOW THE WATER'),
    ('PUT THE ENVIRONMENT IN CONTEXT', 'GO FISH IT'),
    ('FIND YOUR ELEMENT', 'FIND YOUR WATER'),
    ('CONFIRM FIRST', 'CHECK FIRST'),
    ('CONSIDER AFTER CHECKING', 'RECOMMENDED'),
    (' is documented in the linked fishery source.', ' is recorded in the fishery source.'),
    ('alt="AI illustration: ', 'alt="'),
    ('alt="AI illustration of ', 'alt="'),
    ('alt="Illustration: ', 'alt="'),
    (' — research pending</a>', '</a>'),
    ('suited to the customer', 'suited to your trip'),
    ('the customer', 'you'),
]
DISCLOSURE_RE = re.compile(r'<div class="shopping-disclosure">.*?</div>', re.S)
KIT_INTRO_RE = re.compile(r'<p>Start with suitability and operator provision\..*?</p>', re.S)
AMAZON_HREF = re.compile(r'href="(https?://(?:www\.|smile\.)?amazon\.[a-z.]+/[^"]*)"')


def tag_url(url, tag):
    """Add or overwrite the Associates tag on any amazon.* URL."""
    if not tag:
        return url
    parts = urlsplit(url.replace('&amp;', '&'))
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != 'tag'] + [('tag', tag)]
    return urlunsplit(parts._replace(query=urlencode(query)))


def tag_all(html, tag):
    return AMAZON_HREF.sub(lambda m: 'href="' + E(tag_url(m.group(1), tag), quote=True) + '"', html)


def clean_paragraph(m):
    open_tag, text = m.group(1), m.group(2)
    if '<' in text and not re.fullmatch(r'(?:[^<]|<(?:/?(?:b|i|em|strong|a)\b[^>]*)>)*', text):
        return m.group(0)
    kept = [s for s in SENTENCE.split(text) if not META.search(re.sub(r'<[^>]+>', '', s))]
    return '' if not kept else open_tag + ' '.join(kept) + '</p>'


def clean(body):
    for rx in BLOCK_RE:
        body = rx.sub('', body)
    for a, b in REPLACE:
        body = body.replace(a, b)
    body = KIT_INTRO_RE.sub('<p>Gear for this trip. Ask your guide what they supply before you buy.</p>', body)
    body = re.sub(r'(<p(?: class="[^"]*")?>)(.*?)</p>', clean_paragraph, body, flags=re.S)
    # Drop prose blocks left with a heading only.
    body = re.sub(r'<section class="prose-block">(?:<span class="eyebrow">[^<]*</span>)?<h2[^>]*>[^<]*</h2></section>', '', body)
    if 'id="trip-season"' not in body:
        body = re.sub(r'<a class="trip-chip" href="#trip-season">.*?</a>', '', body)
    return body


def shopping_list(entry, tag, numbers=None):
    from guides import citations
    if entry.get('rich'):
        cards = []
        for item in entry['items']:
            url = item.get('url') or 'https://www.amazon.com/s?' + urlencode({'k': item['query']})
            citation = citations(item.get('sources', []), numbers or {})
            specs = '<ul>' + ''.join('<li>' + E(s) + (citation if i == len(item['specs']) - 1 else '') + '</li>' for i, s in enumerate(item['specs'])) + '</ul>'
            pick = '<span class="gr-pick">My pick</span>' if item.get('pick') else ''
            cards.append('<article class="gr-product' + (' gr-product-pick' if item.get('pick') else '') + '"><div class="gr-badges">' + pick + '<span class="gr-tier">' + E(item['tier']) + '</span></div><h3>' + E(item['name']) + '</h3><p class="gr-best"><b>Best for</b> ' + E(item['bestFor']) + '</p>' + specs + '<p class="gr-product-note">' + E(item.get('note', '')) + '</p><a class="gr-buy" href="' + E(tag_url(url, tag), quote=True) + '" target="_blank" rel="sponsored noopener noreferrer" data-outbound="shopping" aria-label="Check price on Amazon: ' + E(item['name'], quote=True) + '">Check price <span aria-hidden="true">↗</span></a></article>')
        return '<section class="gr-section" id="shopping-list"><span class="eyebrow">Buy with a purpose</span><h2>' + E(entry['title']) + '</h2><p class="gr-lede">' + E(entry.get('intro', 'Choose the fit and features you need. These links open brand and product searches; check the model, seller, size, and current price.')) + '</p><div class="shopping-disclosure">' + DISCLOSURE + '</div><div class="gr-products gr-products-' + str(len(cards)) + '">' + ''.join(cards) + '</div></section>'
    rows = []
    for item in entry['items']:
        url = item.get('url') or ('https://www.amazon.com/s?' + urlencode({'k': item['query']}))
        note = f'<p>{E(item["note"])}</p>' if item.get('note') else ''
        tier = f'<span class="shop-tier shop-tier-{E(item["tier"].split("-")[0].lower())}">{E(item["tier"])}</span>' if item.get('tier') else ''
        rows.append(f'<li class="shop-item"><div>{tier}<h3>{E(item["name"])}</h3>{note}</div>'
                    f'<a class="category-link" href="{E(tag_url(url, tag), quote=True)}" target="_blank" rel="sponsored noopener noreferrer" data-outbound="shopping">Check price ↗</a></li>')
    title = E(entry.get('title', 'Shopping list'))
    return (f'<section class="prose-block shopping-list" id="shopping-list"><span class="eyebrow">SHOPPING LIST</span><h2>{title}</h2>'
            f'<ul class="shop-items">{"".join(rows)}</ul><div class="shopping-disclosure">{DISCLOSURE}</div></section>')


def install(pages, root, config):
    tag = config.get('amazonTag', '')
    lists_path = Path(root) / 'src/shopping-lists.json'
    lists = json.loads(lists_path.read_text()) if lists_path.exists() else {}
    for path, page in pages.items():
        if page.get('redirectTo'):
            continue
        body = clean(page['body'])
        if page.get('ogImageAlt'):
            page['ogImageAlt'] = re.sub(r'^(?:AI illustration(?::| of)|Illustration:)\s*', '', page['ogImageAlt'])
        for a, b in REPLACE[-2:]:
            page['desc'] = page['desc'].replace(a, b)
        entry = lists.get(path)
        if not entry and 'class="trip-kit"' in body:
            env = re.search(r'href="(/environments/[a-z-]+/)"', body)
            entry = lists.get(env.group(1)) if env else None
        if entry:
            block = shopping_list(entry, tag, page.get('guideSourceNumbers'))
            # Put the list at the end of the main article column, else at the end of the page.
            marker = '</div><aside class="article-aside">'
            if '<!-- GUIDE-PRODUCTS -->' in body:
                body = body.replace('<!-- GUIDE-PRODUCTS -->', block, 1)
            else:
                if 'class="guide-sources"' in body:
                    body = body.replace('<section class="guide-sources"', block + '<section class="guide-sources"', 1)
                else:
                    body = body.replace(marker, block + marker, 1) if marker in body else body + '<div class="wrap">' + block + '</div>'
        if tag:
            body = DISCLOSURE_RE.sub(f'<div class="shopping-disclosure">{DISCLOSURE}</div>', body)
        page['body'] = tag_all(body, tag)
    return pages


def clean_chrome(html, tag):
    """Header/footer pass: same block rules and Amazon tagging."""
    for rx in BLOCK_RE:
        html = rx.sub('', html)
    for a, b in REPLACE:
        html = html.replace(a, b)
    return tag_all(html, tag)
