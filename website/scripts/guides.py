"""Authored guide records feed the catalog, static articles, FAQ and discovery."""
import json
from copy import deepcopy
from html import escape as E
from urllib.parse import urlencode

DATE = '2026-11-10'


def catalog(root):
    return json.loads((root / 'src/guides.json').read_text())


def compile_into(world, trips, root):
    content = catalog(root)
    world['sources'].update(content['sources'])
    by_id = {t['id']: t for t in trips}
    for key, guide in content['trips'].items():
        trip = by_id[key]
        trip.update(deepcopy(guide.get('catalog', {})))
        trip['title'] = guide['title']
        trip['summary'] = guide['description']
        trip['planningGuide'] = guide
        trip['review'] = {'checked': DATE, 'status': 'source-checked',
                          'fieldTested': False, 'independentExpertReviewed': False}
        trip['evidenceDepth'] = 'Official source text checked 2026-11-10; preparation advice is editorial'
        trip['sourceIds'] = source_ids(guide)
        trip['evidence'] = guide['evidence']
        trip['season'] = guide['season']
        trip['seasonWindows'] = guide.get('seasonWindows', [])
        trip['sections'] = [{'title': s['title'], 'text': ' '.join(s.get('paragraphs', []) + s.get('items', []) +
                            ['; '.join(row) for row in s.get('table', {}).get('rows', [])])}
                            for s in guide['sections']]
        trip['related'] = guide['relatedTrips']


def source_ids(guide):
    return list(dict.fromkeys(s for section in guide['sections'] for s in section.get('sources', [])))


def link(url, label):
    return f'<a href="{E(url, quote=True)}">{E(label)}</a>'


def render(guide, content, trips, root, origin, path):
    from photography import trip_photo
    by_id = {t['id']: t for t in trips}
    destination = guide['destination']
    plan = '/plan/?' + urlencode({'destination': destination})
    sources = content['sources']
    article = '<nav class="guide-toc" aria-label="In this guide"><b>In this guide</b><ul>'
    article += ''.join(f'<li>{link("#" + s["id"], s["title"])}</li>' for s in guide['sections'])
    article += '<li><a href="#faq">Questions and answers</a></li><li><a href="#sources">Sources and dates</a></li></ul></nav>'
    for section in guide['sections']:
        article += f'<section class="prose-block" id="{E(section["id"])}"><h2>{E(section["title"])}</h2>'
        article += ''.join(f'<p>{E(p)}</p>' for p in section.get('paragraphs', []))
        if section.get('table'):
            table = section['table']
            article += '<p class="guide-table-hint">Scroll the table to compare all columns.</p><div class="guide-table" role="region" tabindex="0" aria-label="' + E(section['title'], quote=True) + '"><table><thead><tr>'
            article += ''.join('<th scope="col">' + E(h) + '</th>' for h in table['heads']) + '</tr></thead><tbody>'
            for row in table['rows']:
                article += '<tr><th scope="row">' + E(row[0]) + '</th>' + ''.join('<td>' + E(c) + '</td>' for c in row[1:]) + '</tr>'
            article += '</tbody></table></div>'
        if section.get('items'):
            tag = 'ol' if section.get('ordered') else 'ul'
            article += '<' + tag + '>' + ''.join('<li>' + E(i) + '</li>' for i in section['items']) + '</' + tag + '>'
        if section.get('sources'):
            article += '<p class="guide-citations">Source: ' + ' · '.join(link(sources[s]['url'], sources[s]['title']) for s in section['sources']) + '</p>'
        article += '</section>'
    article += '<section class="prose-block" id="faq"><h2>Questions and answers</h2>'
    article += ''.join('<details class="guide-faq"><summary>' + E(f['q']) + '</summary><p>' + E(f['a']) + '</p></details>' for f in guide['faq']) + '</section>'
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': f['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': f['a']}} for f in guide['faq']]}
    article += '<script type="application/ld+json">' + json.dumps(faq).replace('</', '<\\/') + '</script>'
    article += '<section class="reference-foot" id="sources"><h2>Sources and checked dates</h2><p>Official source text checked on 10 November 2026. The packing lists and trip comparisons are Castward editorial advice. No local operator reviewed this article. It is not a field test or a live conditions report.</p>'
    for sid in source_ids(guide):
        source = sources[sid]
        article += '<div class="reference-row">' + link(source['url'], source['title']) + '<span>Checked ' + E(source['checked']) + '</span><p>' + E(source['scopeNote']) + '</p></div>'
    article += '<p>Revision: 10 November 2026. ' + E(guide['revision']) + '</p></section>'
    related = '<section class="panel"><h2>Related trips and guides</h2><ul>'
    for tid in guide['relatedTrips']:
        trip = by_id[tid]
        label = trip['title'] + (' — research pending' if trip['contentTier'] == 'preparation-brief' else ' — source-linked brief' if trip['contentTier'] == 'trip-brief' else '')
        related += '<li>' + link(trip['canonicalPath'], label) + '</li>'
    for slug in guide['relatedGuides']:
        target = next(g for g in content['articles'] if g['slug'] == slug)
        related += '<li>' + link('/guides/' + slug + '/', target['title']) + '</li>'
    types = json.loads((root / 'src/trip-types.json').read_text())['types']
    for kind in types:
        if destination in kind['profileIds']:
            related += '<li>' + link('/trip-types/' + kind['slug'] + '/', kind['name']) + '</li>'
    related += '</ul>' + link(guide['regionPath'], guide['regionLabel']) + '</section>'
    body = '<div class="wrap breadcrumbs">' + link('/guides/', 'Field guides') + ' / ' + E(guide['title']) + '</div>'
    body += '<header class="wrap page-intro"><span class="eyebrow">' + E(guide['category']) + '</span><h1>' + E(guide['title']) + '</h1><p>' + E(guide['description']) + '</p><p class="guide-review">Source-checked · Updated 10 November 2026 · Castward editorial</p><a class="btn" href="' + plan + '">Plan this trip ↗</a></header>'
    body += '<figure class="wrap guide-hero">' + trip_photo(by_id[destination], '(max-width: 900px) 100vw, 1100px', eager=True) + '<figcaption class="photo-note">Representative scene illustration, not a photograph of this destination. <a href="/about/#photo-credits">Image notes</a></figcaption></figure>'
    body += '<section class="section article-section"><div class="wrap article-layout"><div class="article-main">' + article + '</div><aside class="article-aside"><div class="panel plan-cta"><h2>Your trip plan</h2><p>' + E(guide['plannerNote']) + '</p><a class="btn" href="' + plan + '">Plan this trip ↗</a><p class="small">The plan saves in this browser. No reservation is created.</p></div>' + related + '<section class="panel guide-booking" aria-labelledby="booking-title"><span class="eyebrow">FUTURE BOOKING</span><h2 id="booking-title">Book a guide here</h2><p>Guide booking is not available on Castward yet. No operator inventory or availability is listed here.</p>' + link('/guides/how-to-choose-a-fishing-guide/', 'Use the guide selection checklist') + '</section></aside></div></section>'
    from videos import section as video_section
    videos = json.loads((root / 'src/videos.json').read_text())
    reel = next(v for v in videos if v['slug'] == guide['reel']['slug'])
    body += video_section([reel], origin, guide['reel']['note'])
    body += '<div class="wrap guide-end"><h2>Make the next decision</h2><p>' + E(guide['nextStep']) + '</p><a class="btn" href="' + plan + '">Plan this trip ↗</a></div>'
    return body


def install(pages, root, origin, add, trips, trip_card, intro, bread):
    from photography import trip_metadata
    content = catalog(root)
    by_id = {t['id']: t for t in trips}
    for tid, guide in content['trips'].items():
        path = by_id[tid]['canonicalPath']
        pages[path].update(title=guide['title'] + ' | Castward', desc=guide['description'],
                           body=render(guide, content, trips, root, origin, path), modified=DATE, guideStyle=True)
        pages[path].update(trip_metadata(by_id[guide['destination']]))
    for guide in content['articles']:
        path = '/guides/' + guide['slug'] + '/'
        add(path, guide['title'] + ' | Castward', guide['description'], render(guide, content, trips, root, origin, path), 'article')
        pages[path]['modified'] = DATE
        pages[path]['guideStyle'] = True
        pages[path].update(trip_metadata(by_id[guide['destination']]))
        if guide['new']:
            pages[path]['published'] = DATE
    body = bread('Field guides') + intro('CHOOSE / PREPARE / GO', 'Fishing trip guides that answer the next question.', 'Compare a destination, choose your dates, and build a packing list around what your guide actually supplies.')
    body += '<section class="section"><div class="wrap"><h2>Start with your trip decision</h2><div class="article-grid">'
    for guide in sorted(content['articles'], key=lambda g: not g['new']):
        body += '<a class="article-card" href="/guides/' + guide['slug'] + '/"><span class="eyebrow">' + E(guide['category']) + '</span><h3>' + E(guide['title']) + '</h3><p>' + E(guide['description']) + '</p><span class="link">Read the guide ↗</span></a>'
    checked = [t for t in trips if t.get('review', {}).get('status') == 'source-checked']
    body += '</div><h2 class="spaced">Choose a source-checked destination</h2><p>Read the date and scope on each page. A source check does not establish current access, bookable guides, or an independent field review.</p><div class="world-grid">'
    body += ''.join(trip_card(t) for t in sorted(checked, key=lambda t: (t['id'] not in content['trips'], t['country'], t['place'])))
    body += '</div><div class="panel spaced"><h2>Explore the atlas</h2><p>' + ' · '.join(link(u, text) for u, text in [('/trips/', 'All trip profiles'), ('/environments/', 'Fishing environments'), ('/seasons/', 'Seasonal evidence'), ('/trip-types/', 'Local trip types'), ('/glossary/', 'Fishing terms')]) + '</p></div></div></section>'
    add('/guides/', 'Fishing trip guides, seasons and packing lists | Castward', 'Plan a fishing trip with source-checked destination guides, charter comparisons, seasonal advice and practical packing lists from Castward.', body, 'guide-index')
    pages['/guides/']['modified'] = DATE
    pages['/guides/']['guideStyle'] = True
