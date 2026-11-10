"""Local names have one source of truth, separate from destination evidence tiers."""
import json
import re
from copy import deepcopy
from html import escape as E
from urllib.parse import urlencode, urlsplit
from photography import photo


def compile_into(world, trips, root):
    catalog = json.loads((root / 'src/trip-types.json').read_text())
    additions = json.loads((root / 'src/trip-type-profiles.json').read_text())
    existing = {t['id'] for t in trips}
    for trip in additions:
        if trip['id'] in existing:
            raise ValueError('Duplicate trip-type gap profile: ' + trip['id'])
        trips.append(trip)
    by_id = {t['id']: t for t in trips}
    types = catalog['types']
    assert len({t['slug'] for t in types}) == len(types)
    for trip in trips:
        trip['tripTypeIds'] = []
        trip['tripTypeNames'] = []
    for kind in types:
        assert kind['profileIds'], kind['slug']
        assert kind['plannerDestination'] in kind['profileIds'], kind['slug']
        for pid in kind['profileIds']:
            if pid not in by_id:
                raise ValueError('Unknown destination for ' + kind['slug'] + ': ' + pid)
            trip = by_id[pid]
            trip['tripTypeIds'].append(kind['slug'])
            trip['tripTypeNames'] += list(dict.fromkeys([
                kind['name'], *kind['aliases'],
                *[s['local_name'] for s in kind['species']],
                *[g['term'] for g in kind['glossary']],
            ]))
        # Only the two new destination profiles inherit their own inspected sources.
        if any(t['id'] in kind['profileIds'] for t in additions):
            for source in kind['sources']:
                world['sources'][source['source_id']] = {
                    'title': source['title'], 'url': source['url'],
                    'type': source['publisher_type'], 'status': 'text-inspected', 'checked': '2026-11-10',
                    'scopeNote': 'Checked 2026-11-10. Supports the named place and format; current availability is unconfirmed.',
                }
    world['tripTypes'] = types
    world['tripTypesReviewed'] = catalog['reviewed']


def planner_data(data, types):
    data['tripTypes'] = [{
        'slug': t['slug'], 'name': t['name'], 'profileIds': t['profileIds'],
        'season': t['season']['window'], 'plannerStyle': t['plannerStyle'],
        'guideChecklist': t['guideChecklist'],
    } for t in types]
    for kind in types:
        for i, text in enumerate(kind['bring'] + kind['guideChecklist'], 1):
            data['gear'].append({
                'id': 'type-' + kind['slug'] + '-' + str(i),
                'name': ('Personal kit ' if i <= len(kind['bring']) else 'Guide provision ') + str(i if i <= len(kind['bring']) else i-len(kind['bring'])),
                'group': kind['name'] + ' · trip-type preset', 'why': text,
                'query': '', 'essential': True, 'scope': 'tripType',
                'tripTypeId': kind['slug'], 'qty': 'one', 'confirm': True,
                'decision': 'confirm',
            })


def type_path(kind):
    return '/trip-types/' + kind['slug'] + '/'


def planner_url(kind, destination=None):
    return '/plan/?' + urlencode({
        'destination': destination or kind['plannerDestination'],
        'tripType': kind['slug'], 'style': kind['plannerStyle'],
    })


def term_id(term):
    return re.sub(r'[^a-z0-9]+', '-', term.lower()).strip('-')


def link(url, label):
    return f'<a href="{E(url, quote=True)}">{E(label)} ↗</a>'


def paragraphs(text):
    return '<p>' + E(text) + '</p>'


def listing(items):
    return '<ul>' + ''.join('<li>' + E(item) + '</li>' for item in items) + '</ul>'


def citations(kind, season=False):
    urls = kind['season']['source_urls'] if season else [s['url'] for s in kind['sources']]
    labels = {s['url']: s['title'] for s in kind['sources']}
    return '<div class="type-citations">' + ''.join(link(u, labels.get(u, 'Research source')) for u in urls) + '</div>'


def install(pages, root, origin, add, trips, types):
    by_id = {t['id']: t for t in trips}
    by_slug = {t['slug']: t for t in types}
    videos = json.loads((root / 'src/videos.json').read_text())
    all_terms = {}
    for kind in types:
        for item in kind['glossary']:
            key = term_id(item['term'])
            record = all_terms.setdefault(key, {'term': item['term'], 'entries': []})
            record['entries'].append((kind, item['definition']))

    def breadcrumbs(label):
        return '<div class="wrap breadcrumb"><a href="/">Home</a><span> / </span><a href="/trip-types/">Trip types</a><span> / </span>' + E(label) + '</div>'

    def card(kind, number):
        return f'''<article class="type-card" data-type-card data-search="{E(' '.join([kind['name'], *kind['aliases'], kind['region'], *[g['term'] for g in kind['glossary']]]), quote=True)}"><a class="type-card-image" href="{type_path(kind)}" tabindex="-1">{photo(kind['image'], '(max-width: 700px) 100vw, 33vw')}</a><div class="type-card-meta"><span>{number:02d} / LOCAL KNOWLEDGE</span><span>{E(kind['country'])}</span></div><h2><a href="{type_path(kind)}">{E(kind['name'])}</a></h2><p>{E(kind['region'])}</p><p class="type-card-fish">{E(' · '.join(s['local_name'] for s in kind['species'] if s.get('role') != 'Bait, not the target'))}</p><a class="link" href="{type_path(kind)}">Read the trip ↗</a></article>'''

    intro = '<section class="type-index-hero"><div class="type-index-image">' + photo('inshore', eager=True) + '</div><div class="wrap type-index-copy"><span class="eyebrow">THE WORDS OF THE WATER</span><h1>Local names.<br>Real trips.</h1><p>Know what a local name means before you plan the day.</p><a class="quiet-button" href="#type-library">Find your trip type <span aria-hidden="true">↓</span></a></div></section>'
    body = intro + '<section class="section wrap" id="type-library"><div class="type-index-heading"><div><span class="eyebrow">40 PRIORITY GUIDES + THE DRUM RUN</span><h2>Ask for it by name.</h2></div><p>Species, seasons, and methods change with the place. Each guide names its waters, explains the evidence, and connects to a preparation plan.</p></div><div class="type-index-tools"><label for="type-search">Find a local name, fish, or place<input type="search" id="type-search" placeholder="Try Texas Slam, specks, or greenbacks"></label><a href="/glossary/">Explore the local glossary ↗</a></div><p id="type-count" role="status" aria-live="polite">41 trip types</p><div class="type-grid">'
    body += ''.join(card(kind, n) for n, kind in enumerate(types, 1))
    body += '</div><p id="type-empty" hidden>No matching local name. Try a place or another term.</p><p class="photo-note">Scene illustrations show representative water environments, not the named destinations.</p></section><script src="/assets/trip-types.js" defer></script>'
    add('/trip-types/', 'Local fishing trip types and regional names | Castward', 'Explore local fishing trip names, species, sourced season windows, destination guides, and practical planner presets.', body, 'trip-types')
    pages['/trip-types/']['modified'] = '2026-11-10'

    for kind in types:
        path = type_path(kind)
        destinations = [by_id[pid] for pid in kind['profileIds']]
        destination_paths = {t['canonicalPath'] for t in destinations}
        matched_reels = [v for v in videos if urlsplit(v['page_url']).path in destination_paths]
        body = breadcrumbs(kind['name'])
        body += '<header class="wrap type-heading"><span class="eyebrow">LOCAL TRIP TYPE / ' + E(kind['country']) + '</span><h1>' + E(kind['name']) + '</h1><p class="type-deck">' + E(kind['region']) + '</p><p class="type-aliases"><b>Also called:</b> ' + E(' · '.join(a for a in kind['aliases'] if a != kind['name'])) + '</p><div class="type-actions">' + link(planner_url(kind), 'Open the planner preset') + link('/trips/?' + urlencode({'type': kind['slug']}), 'Filter matching trips') + '</div></header>'
        body += '<figure class="type-landscape">' + photo(kind['image'], eager=True) + '<figcaption>Representative scene illustration. <a href="/about/#photo-credits">Image notes</a></figcaption></figure>'
        body += '<div class="wrap type-body"><aside class="type-toc" aria-label="On this page"><span class="eyebrow">PLAN THE TRIP</span>'
        for anchor, label in [('meaning','What it is'),('species','Species'),('where','Where to go'),('season','Season & sources'),('method','How it is fished'),('kit','What to bring'),('guide','What a guide provides'),('local-terms','Local terms'),('faq','Questions'),('book-a-guide','Book a guide')]:
            body += link('#' + anchor, label)
        body += '</aside><article class="type-prose">'
        body += '<section id="meaning"><span class="eyebrow">THE LOCAL MEANING</span><h2>What it is.</h2>' + paragraphs(kind['definition']) + citations(kind) + '</section>'
        body += '<section id="species"><h2>Know the species.</h2><div class="type-table-wrap"><table><thead><tr><th>Local name</th><th>Standard name</th></tr></thead><tbody>'
        for s in kind['species']:
            body += '<tr><td>' + E(s['local_name']) + '</td><td>' + E(s['standard_name']) + (('<small>' + E(s['role']) + '</small>') if s.get('role') else '') + '</td></tr>'
        body += '</tbody></table></div></section><section id="where"><h2>Where to go.</h2><p>' + E(kind['region']) + '. These destination profiles match the named water or departure base. Each retains its own research status.</p><div class="type-destinations">'
        for trip in destinations:
            tier = {'detailed-guide':'Source-checked guide','trip-brief':'Source-linked brief','preparation-brief':'Research pending · preparation profile'}[trip['contentTier']]
            body += '<div><span class="eyebrow">' + E(tier) + '</span><h3>' + link(trip['canonicalPath'], trip['place']) + '</h3>' + link(planner_url(kind, trip['id']), 'Use this destination preset') + '</div>'
        body += '</div></section><section id="season"><span class="eyebrow">CHECKED 10 NOVEMBER 2026</span><h2>The season, with context.</h2>' + paragraphs(kind['season']['window']) + citations(kind, season=True)
        if kind['uncertainties']:
            body += '<div class="type-note">' + listing(kind['uncertainties']) + '</div>'
        body += '<p>A seasonal pattern, a provider schedule, and a legal opening are different facts. Confirm the current rule for the exact water and trip category.</p><h3>Official rules and permissions</h3><div class="type-citations">' + ''.join(link(r['url'], r['label']) for r in kind['regulations']) + '</div></section>'
        body += '<section id="method"><h2>How it is fished.</h2><p class="type-method">' + E(kind['method']) + '.</p>' + paragraphs(kind['fishingNotes']) + '<p><b>Planning format:</b> ' + E(kind['format']) + '. Confirm the actual duration with the provider.</p></section>'
        body += '<section id="kit"><span class="eyebrow">EDITORIAL PREPARATION ADVICE</span><h2>What to bring.</h2>' + listing(kind['bring']) + '<a class="btn" href="' + E(planner_url(kind), quote=True) + '">Customize this trip-type preset ↗</a></section>'
        body += '<section id="guide"><h2>What a guide provides.</h2><p>No provider inclusions are confirmed here. Use this trip-specific list to ask what the actual guide supplies. Mark an item “Guide provides” only after confirmation.</p>' + listing(kind['guideChecklist']) + '</section>'
        body += '<section id="local-terms"><h2>Words from this water.</h2><dl class="type-terms">' + ''.join('<div><dt>' + link('/glossary/#' + term_id(g['term']), g['term']) + '</dt><dd>' + E(g['definition']) + '</dd></div>' for g in kind['glossary']) + '</dl></section>'
        body += '<section id="faq"><h2>Before you go.</h2>' + ''.join('<details class="type-faq"><summary>' + E(f['question']) + '</summary><p>' + E(f['answer']) + '</p></details>' for f in kind['faq']) + '</section>'
        if matched_reels:
            body += '<section id="film"><h2>A film from this guide.</h2><p>These are animated Castward stories linked to the matching destination. They are not footage of a booked trip or evidence of catches.</p><div class="type-reels">'
            for v in matched_reels:
                base = '/media/videos/' + v['slug']
                body += '<article class="reel-card"><video controls playsinline preload="none" width="720" height="1280" poster="' + base + '.jpg" aria-label="' + E(v['title'], quote=True) + '"><source data-src="' + base + '.mp4" type="video/mp4"><track kind="captions" src="' + base + '.vtt" srclang="en" label="English" default></video><h3>' + E(v['title']) + '</h3>' + link('/videos/#' + v['slug'], 'Film library') + '<noscript>' + link(base + '.mp4', 'Play the film') + '</noscript></article>'
            body += '</div></section><script src="/assets/videos.js" defer></script>'
        body += '<section id="book-a-guide" class="type-book-slot" data-guide-slot="empty"><span class="eyebrow">BOOK A GUIDE</span><h2>Make the local plan.</h2><p>No guide listings or live availability are confirmed for this trip type. Castward does not take a booking here.</p><p>Use the preset to prepare your questions. Confirm the provider, date, route, equipment, and price directly before you book.</p><a class="btn" href="' + E(planner_url(kind), quote=True) + '">Prepare a guide inquiry ↗</a></section>'
        body += '<section id="sources"><h2>Sources and scope.</h2><p>Research checked 10 November 2026. Preparation advice is editorial. Castward has not field-tested these trips or verified current provider availability.</p><ol class="type-source-list">' + ''.join('<li>' + link(s['url'], s['title']) + '<p>' + E(s['publisher_type'] + '. ' + s['access'] + '.') + '</p></li>' for s in kind['sources']) + '</ol></section></article></div>'
        faq = {'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':f['question'],'acceptedAnswer':{'@type':'Answer','text':f['answer']}} for f in kind['faq']]}
        if origin:
            faq['url'] = origin + path
        body += '<script type="application/ld+json">' + json.dumps(faq, ensure_ascii=False).replace('</', '<\\/') + '</script>'
        add(path, kind['name'] + ': species, season and trip plan | Castward', kind['definition'].split('. ')[0] + '. Read the local meaning, sourced season, destination matches, and preparation plan.', body, 'trip-type')
        pages[path]['modified'] = '2026-11-10'

    # Add evidence-scoped type links to canonical profiles without changing their tier.
    for trip in trips:
        if not trip['tripTypeIds']:
            continue
        path = trip['canonicalPath']
        module = '<section class="wrap profile-trip-types" aria-label="Local trip types"><span class="eyebrow">ASK FOR IT BY NAME</span><h2>Local trip types.</h2><p>These linked guides explain the local names and their sources. The destination profile keeps its own research status.</p>'
        for slug in trip['tripTypeIds']:
            kind = by_slug[slug]
            module += '<div><h3>' + link(type_path(kind), kind['name']) + '</h3><p>' + E(' · '.join(s['local_name'] + ' — ' + s['standard_name'] for s in kind['species'])) + '</p><p><b>Also called:</b> ' + E(' · '.join(kind['aliases'])) + '</p>' + link(planner_url(kind, trip['id']), 'Open this trip-type preset') + '</div>'
        module += '</section>'
        marker = '<section class="section article-section">'
        assert marker in pages[path]['body'], path
        pages[path]['body'] = pages[path]['body'].replace(marker, module + marker, 1)
        pages[path]['modified'] = '2026-11-10'

    # Ontario's older country/state collections use plan IDs. The sourced gap is
    # outside that import, so expose it there without fabricating a production ID.
    new_ontario = by_id['kabinakagami-lake-fly-in']
    for parent in ['/north-america/canada/', '/north-america/canada/ontario/']:
        pages[parent]['body'] += '<section class="wrap section type-guide-link"><span class="eyebrow">NEW SOURCE-CHECKED DESTINATION</span><h2>Kabinakagami Lake.</h2><p>A named Ontario fly-in example with a White River air base, source-scoped dates, and a preparation preset.</p>' + link(new_ontario['canonicalPath'], 'Read the destination guide') + link('/trip-types/ontario-fly-in-fishing/', 'Understand the fly-in format') + '</section>'
        pages[parent]['modified'] = '2026-11-10'

    body = breadcrumbs('Glossary') + '<header class="wrap type-heading"><span class="eyebrow">THE LOCAL GLOSSARY</span><h1>Speak the water.</h1><p class="type-deck">A name makes sense when you know the place.</p><p>Use these definitions with their linked trip types. Local names can mean different fish or formats in different regions.</p></header><section class="wrap glossary-body"><label for="glossary-search">Find a local term<input id="glossary-search" type="search" placeholder="Try bull reds, specks, tailing, or albie blitz"></label><p id="glossary-count" role="status" aria-live="polite">' + str(len(all_terms)) + ' local terms</p><dl class="glossary-list">'
    for key, item in sorted(all_terms.items(), key=lambda kv: kv[1]['term'].lower()):
        body += '<div id="' + key + '" data-glossary-term><dt>' + E(item['term']) + '</dt>'
        for kind, definition in item['entries']:
            body += '<dd>' + paragraphs(definition) + link(type_path(kind), kind['name']) + '</dd>'
        body += '</div>'
    body += '</dl><p id="glossary-empty" hidden>No matching term. Try another local name.</p></section><script src="/assets/trip-types.js" defer></script>'
    add('/glossary/', 'Local fishing lingo glossary | Castward', 'Learn bull reds, specks, tailing, slam, drum run, albie blitz, and more local fishing terms. Each definition links to its trip type.', body, 'glossary')
    pages['/glossary/']['modified'] = '2026-11-10'
    pages['/guides/']['body'] += '<section class="wrap section type-guide-link"><span class="eyebrow">LOCAL KNOWLEDGE</span><h2>Know the name. Plan the trip.</h2><p>Connect a local phrase to its species, place, season, and equipment plan.</p>' + link('/trip-types/', 'Explore local trip types') + ' ' + link('/glossary/', 'Read the fishing glossary') + '</section>'
