"""Authored guide records feed the catalog, static articles, FAQ and discovery."""
import json
from copy import deepcopy
from datetime import date
from html import escape as E
from urllib.parse import urlencode

DATE = '2026-11-10'


def catalog(root):
    content = json.loads((root / 'src/guides.json').read_text())
    overrides = root / 'src/title-overrides.json'
    if overrides.exists():
        for key, o in json.loads(overrides.read_text()).get('trips', {}).items():
            if key in content['trips']:
                content['trips'][key]['title'] = o['title']
                content['trips'][key]['description'] = o['summary']
    return content


def compile_into(world, trips, root):
    content = catalog(root)
    # Authored references can omit catalog classifications. Normalize at the boundary.
    for key, source in content['sources'].items():
        record = deepcopy(source)
        record.setdefault('type', 'reference')
        record.setdefault('status', 'source-linked')
        record.setdefault('scopeNote', '')
        world['sources'][key] = record
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
    return list(dict.fromkeys([*guide.get('quickSources', []),
        *(s for section in guide['sections'] for s in section.get('sources', []))]))


SOURCE_GROUPS = ('Manufacturer', 'Government/agency', 'Independent')


def source_numbers(guide, sources, items=()):
    ids = list(dict.fromkeys([*source_ids(guide),
        *(sid for item in items for sid in item.get('sources', []))]))
    ordered = [sid for group in SOURCE_GROUPS for sid in ids if sources[sid]['group'] == group]
    urls, numbers = {}, {}
    for sid in ordered:
        url = sources[sid]['url'].rstrip('/')
        urls.setdefault(url, len(urls) + 1)
        numbers[sid] = urls[url]
    return numbers


def page_source_numbers(guide, content, root, path):
    shopping = json.loads((root / 'src/shopping-lists.json').read_text()).get(path, {})
    return source_numbers(guide, content['sources'], shopping.get('items', []))


def citations(ids, numbers):
    if not ids:
        return ''
    return '<sup class="guide-citations">' + ' '.join(
        f'<a href="#source-{numbers[sid]}" aria-label="Source {numbers[sid]}">[{numbers[sid]}]</a>'
        for sid in ids) + '</sup>'


def source_disclosure(numbers, sources):
    # Several catalog IDs can cite the same page. Render each reference once.
    seen = set()
    numbers = {sid: n for sid, n in numbers.items() if n not in seen and not seen.add(n)}
    out = f'<section class="guide-sources" id="sources"><details><summary>Sources ({len(numbers)})</summary>'
    months = {date.fromisoformat(sources[sid]['checked']).strftime('%B %Y') for sid in numbers}
    # Never replace the recorded check date with the build date.
    out += '<p class="source-checked">Checked ' + E(', '.join(sorted(months))) + '</p><div class="source-groups">'
    for group in SOURCE_GROUPS:
        ids = [sid for sid in numbers if sources[sid]['group'] == group]
        if not ids:
            continue
        out += '<div class="source-group"><h3>' + E(group) + f'</h3><ol start="{numbers[ids[0]]}">'
        for sid in ids:
            source = sources[sid]
            out += f'<li id="source-{numbers[sid]}" tabindex="-1">' + link(source['url'], source['publisher'] + ' — ' + source['shortTitle']) + '</li>'
        out += '</ol></div>'
    return out + '</div></details></section>'


def link(url, label):
    return f'<a href="{E(url, quote=True)}">{E(label)}</a>'


def render(guide, content, trips, root, origin, path):
    if guide.get('rich'):
        return render_rich(guide, content, root, origin, path)
    from photography import trip_photo
    by_id = {t['id']: t for t in trips}
    destination = guide['destination']
    plan = '/plan/?' + urlencode({'destination': destination})
    sources = content['sources']
    numbers = page_source_numbers(guide, content, root, path)
    article = '<nav class="guide-toc" aria-label="In this guide"><b>In this guide</b><ul>'
    article += ''.join(f'<li>{link("#" + s["id"], s["title"])}</li>' for s in guide['sections'])
    article += '<li><a href="#faq">Questions and answers</a></li><li><a href="#sources">Sources</a></li></ul></nav>'
    for number, section in enumerate(guide['sections'], 1):
        article += f'<section class="prose-block guide-section" id="{E(section["id"])}"><div class="guide-section-heading"><span aria-hidden="true">{number:02}</span><h2>{E(section["title"])}</h2></div>'
        paragraphs = section.get('paragraphs', [])
        if paragraphs:
            article += '<div class="guide-notes">' + ''.join('<p>' + E(p) + (citations(section.get('sources', []), numbers) if i == len(paragraphs) - 1 else '') + '</p>' for i, p in enumerate(paragraphs)) + '</div>'
        if section.get('table'):
            table = section['table']
            article += '<p class="guide-table-hint">Scroll the table to compare all columns.</p><div class="guide-table" role="region" tabindex="0" aria-label="' + E(section['title'], quote=True) + '"><table><thead><tr>'
            article += ''.join('<th scope="col">' + E(h) + '</th>' for h in table['heads']) + '</tr></thead><tbody>'
            for row in table['rows']:
                article += '<tr><th scope="row">' + E(row[0]) + '</th>' + ''.join('<td>' + E(c) + '</td>' for c in row[1:]) + '</tr>'
            article += '</tbody></table></div>'
        if section.get('items'):
            tag = 'ol' if section.get('ordered') else 'ul'
            article += '<' + tag + ' class="guide-checks">' + ''.join('<li>' + E(i) + '</li>' for i in section['items']) + '</' + tag + '>'
        if not paragraphs:
            article += citations(section.get('sources', []), numbers)
        article += '</section>'
    article += '<section class="prose-block" id="faq"><h2>Questions and answers</h2>'
    article += ''.join('<details class="guide-faq"><summary>' + E(f['q']) + '</summary><p>' + E(f['a']) + '</p></details>' for f in guide['faq']) + '</section>'
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': f['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': f['a']}} for f in guide['faq']]}
    article += '<script type="application/ld+json">' + json.dumps(faq).replace('</', '<\\/') + '</script>'
    article += source_disclosure(numbers, sources)
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
    body += '<figure class="wrap guide-hero">' + trip_photo(by_id[destination], '(max-width: 900px) 100vw, 1100px', eager=True) + '</figure>'
    body += '<section class="section article-section"><div class="wrap article-layout"><div class="article-main">' + article + '</div><aside class="article-aside"><div class="panel plan-cta"><h2>Your trip plan</h2><p>' + E(guide['plannerNote']) + '</p><a class="btn" href="' + plan + '">Plan this trip ↗</a><p class="small">The plan saves in this browser. No reservation is created.</p></div>' + related + '<section class="panel guide-booking" aria-labelledby="booking-title"><span class="eyebrow">FUTURE BOOKING</span><h2 id="booking-title">Book a guide here</h2><p>Guide booking is not available on Castward yet. No operator inventory or availability is listed here.</p>' + link('/guides/how-to-choose-a-fishing-guide/', 'Use the guide selection checklist') + '</section></aside></div></section>'
    if guide.get('reel'):
        from videos import section as video_section
        videos = json.loads((root / 'src/videos.json').read_text())
        reel = next(v for v in videos if v['slug'] == guide['reel']['slug'])
        body += video_section([reel], origin, guide['reel']['note'])
    body += '<div class="wrap guide-end"><h2>Make the next decision</h2><p>' + E(guide['nextStep']) + '</p><a class="btn" href="' + plan + '">Plan this trip ↗</a></div>'
    return body


def rich_image(image, eager=False, sizes='(max-width: 700px) calc(100vw - 32px), 560px'):
    """An image stem always addresses the same three generated WebP variants."""
    if image.get('route'):
        from photography import preview_photo
        return preview_photo(image['route'], sizes, eager)
    stem = '/media/guides/' + image['name']
    loading = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="{E(stem)}-1200.webp" srcset="{E(stem)}-640.webp 640w, '
            f'{E(stem)}-1200.webp 1200w, {E(stem)}-1600.webp 1600w" sizes="{E(sizes)}" '
            f'width="1536" height="1024" alt="{E(image["alt"], quote=True)}" {loading} decoding="async">')


def rich_table(table, title):
    out = '<p class="gr-table-hint">Swipe the table to compare all columns.</p><div class="gr-table-wrap" role="region" tabindex="0" aria-label="' + E(title, quote=True) + '"><table>'
    if table.get('caption'):
        out += '<caption><span>' + E(table['caption']) + '</span></caption>'
    out += '<thead><tr>' + ''.join('<th scope="col">' + E(h) + '</th>' for h in table['heads']) + '</tr></thead><tbody>'
    for row in table['rows']:
        out += '<tr><th scope="row">' + E(str(row[0])) + '</th>' + ''.join('<td>' + E(str(c)) + '</td>' for c in row[1:]) + '</tr>'
    return out + '</tbody></table></div>'


def render_rich(guide, content, root, origin, path):
    sources = content['sources']
    sections = guide['sections']
    numbers = page_source_numbers(guide, content, root, path)
    hero_class = ' gr-hero-contain' if guide['hero'].get('fit') == 'contain' else ''
    updated = date.fromisoformat(guide['updated']).strftime('%d %B %Y').lstrip('0')
    body = '<article class="guide-rich">'
    parent = ('/environments/', 'Waters') if path.startswith('/environments/') else ('/guides/', 'Field guides')
    body += '<div class="wrap gr-crumb">' + link(*parent) + '<span aria-hidden="true"> / </span>' + E(guide['category'].split(' / ')[-1 if parent[1] == 'Waters' else 0].title()) + '</div>'
    opening = guide['quickAnswer'] if guide.get('answerFirst') else guide['description']
    opening_cites = citations(guide.get('quickSources', []), numbers) if guide.get('answerFirst') else ''
    body += '<header class="wrap gr-cover"><div class="gr-cover-copy"><span class="eyebrow">' + E(guide['category']) + '</span><h1>' + E(guide['title']) + '</h1><p>' + E(opening) + opening_cites + '</p><div class="gr-byline">By <a href="/about/">Castward</a> <span>Updated ' + E(updated) + '</span></div></div><figure class="guide-hero' + hero_class + '">' + rich_image(guide['hero'], True, '(max-width: 850px) 100vw, 720px') + '</figure></header>'
    body += '<section class="wrap gr-glance" aria-label="At a glance"><span class="eyebrow">At a glance</span><dl>'
    body += ''.join('<div><dt>' + E(f['label']) + '</dt><dd>' + E(f['value']) + '</dd></div>' for f in guide['facts']) + '</dl></section>'
    body += '<div class="wrap gr-opening"><section class="gr-answer" aria-labelledby="quick-answer"><span class="eyebrow">Start here</span><h2 id="quick-answer">Quick answer</h2><p>' + E(guide['quickAnswer']) + citations(guide.get('quickSources', []), numbers) + '</p></section>'
    body += '<nav class="gr-toc" aria-label="On this page"><h2>On this page</h2><ol>'
    body += ''.join('<li>' + link('#' + s['id'], s.get('nav', s['title'])) + '</li>' for s in sections)
    body += '<li><a href="#faq">Common questions</a></li><li><a href="#sources">Sources</a></li></ol></nav></div><div class="wrap gr-content">'
    howto = []
    for number, section in enumerate(sections, 1):
        if section.get('type') == 'products':
            body += '<!-- GUIDE-PRODUCTS -->'
            continue
        body += '<section class="gr-section" id="' + E(section['id']) + '"><div class="gr-section-heading"><span class="gr-index" aria-hidden="true">' + f'{number:02}' + '</span><h2>' + E(section['title']) + '</h2></div>'
        paragraphs = section.get('paragraphs', [])
        body += ''.join('<p class="gr-lede">' + E(p) + (citations(section.get('sources', []), numbers) if i == len(paragraphs) - 1 else '') + '</p>' for i, p in enumerate(paragraphs))
        if section.get('type') == 'ice-rental-worksheet':
            from ice_rental import render as render_ice_rental
            body += render_ice_rental()
        if section.get('type') == 'florida-license-planner':
            from florida_license import render as render_license_planner
            body += render_license_planner()
        if section.get('image'):
            body += '<figure class="gr-plate">' + rich_image(section['image'], sizes='(max-width: 700px) calc(100vw - 32px), 1000px') + '</figure>'
        if section.get('table'):
            body += rich_table(section['table'], section['title'])
        if section.get('steps'):
            illustrated = all(s.get('image') for s in section['steps'])
            body += '<ol class="gr-steps' + (' gr-illustrated' if illustrated else ' gr-short-steps') + '">'
            schema_steps = []
            for i, step in enumerate(section['steps'], 1):
                step_id = section['id'] + '-' + str(i)
                body += '<li id="' + E(step_id) + '">'
                if step.get('image'):
                    body += '<div class="gr-step-image">' + rich_image(step['image']) + '</div>'
                body += '<div class="gr-step-copy"><span class="gr-step-number">' + f'{i:02}' + '</span><h3>' + E(step['title']) + '</h3><p>' + E(step['text']) + '</p>'
                for key, label in [('tip', 'Bench tip' if illustrated else 'Tip'), ('mistake', 'Watch out')]:
                    if step.get(key):
                        body += '<p class="gr-step-tip"><b>' + label + '</b> ' + E(step[key]) + '</p>'
                body += '</div></li>'
                item = {'@type': 'HowToStep', 'position': i, 'name': step['title'], 'text': step['text'], 'url': origin + path + '#' + step_id}
                if step.get('image'):
                    item['image'] = origin + '/media/guides/' + step['image']['name'] + '-1200.webp'
                schema_steps.append(item)
            body += '</ol>'
            if section.get('howTo'):
                howto.append({'@context': 'https://schema.org', '@type': 'HowTo', 'name': guide['title'], 'description': guide['description'], 'image': origin + '/media/guides/' + guide['hero']['name'] + '-1200.webp', 'step': schema_steps,
                              'supply': [{'@type': 'HowToSupply', 'name': s} for s in guide.get('supplies', [])],
                              'tool': [{'@type': 'HowToTool', 'name': s} for s in guide.get('tools', [])]})
        if section.get('checklist'):
            body += '<ul class="gr-checklist">' + ''.join('<li><span aria-hidden="true">✓</span>' + E(s) + '</li>' for s in section['checklist']) + '</ul>'
        if section.get('pros') or section.get('cons'):
            body += '<div class="gr-procon">'
            for key, title in [('pros', 'What works well'), ('cons', 'The trade-offs')]:
                body += '<div><h3>' + title + '</h3><ul>' + ''.join('<li>' + E(s) + '</li>' for s in section.get(key, [])) + '</ul></div>'
            body += '</div>'
        for callout in section.get('callouts', []):
            body += '<aside class="gr-callout gr-' + E(callout.get('kind', 'tip')) + '"><b>' + E(callout['title']) + '</b><p>' + E(callout['text']) + '</p></aside>'
        if section.get('cards'):
            body += '<div class="gr-link-cards">'
            for card in section['cards']:
                shopping = card['url'].startswith('https://www.amazon.com/')
                attrs = ' target="_blank" rel="sponsored noopener noreferrer" data-outbound="shopping"' if shopping else ''
                copy = (rich_image(card['image']) if card.get('image') else '') + '<div><span class="eyebrow">' + E(card.get('label', 'Field guide')) + '</span><h3>' + E(card['title']) + '</h3><p>' + E(card['text']) + '</p>'
                if shopping:
                    body += '<article class="gr-link-product">' + copy + '<a class="gr-buy" href="' + E(card['url'], quote=True) + '"' + attrs + ' aria-label="Check price on Amazon: ' + E(card['title'], quote=True) + '">Check price <span aria-hidden="true">↗</span></a></div></article>'
                else:
                    body += '<a href="' + E(card['url'], quote=True) + '">' + copy + '<span class="gr-card-link">Open the guide <span aria-hidden="true">↗</span></span></div></a>'
            body += '</div>'
        if not paragraphs:
            body += citations(section.get('sources', []), numbers)
        body += '</section>'
    body += '<section class="gr-section" id="faq"><span class="eyebrow">A few good questions</span><h2>Before you head out</h2>'
    body += ''.join('<details class="guide-faq"><summary>' + E(f['q']) + '</summary><p>' + E(f['a']) + '</p></details>' for f in guide['faq']) + '</section>'
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': f['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': f['a']}} for f in guide['faq']]}
    for schema in [faq, *howto]:
        body += '<script type="application/ld+json">' + json.dumps(schema).replace('</', '<\\/') + '</script>'
    body += source_disclosure(numbers, sources)
    body += '<section class="gr-next"><span class="eyebrow">Plan your next outing</span><h2>What do you need next?</h2><div>'
    for slug in guide['relatedGuides']:
        target = next(g for g in content['articles'] if g['slug'] == slug)
        body += link('/guides/' + slug + '/', target['title'] + ' ↗')
    plan = '/plan/?' + urlencode({'destination': guide['destination']}) if guide.get('destination') else '/plan/'
    body += '</div><a class="btn" href="' + plan + '">Plan this trip ↗</a></section></div></article>'
    return body


def install(pages, root, origin, add, trips, trip_card, intro, bread):
    from photography import trip_metadata
    from preview_images import PREVIEWS, image_url
    content = catalog(root)
    for water_id, guide in content.get('waters', {}).items():
        path = '/environments/' + water_id + '/'
        page = pages[path]
        related_marker = '<section class="section soft">'
        related_at = page['body'].find(related_marker)
        related = page['body'][related_at:] if related_at >= 0 else ''
        scene = PREVIEWS[path]
        page.update(ogImage='/' + image_url(scene, 1200), ogImageAlt=scene['alt'], photoPreload='')
        page.update(body=render_rich(guide, content, root, origin, path) + related, desc=guide['description'],
                    modified=guide['updated'], published=guide['published'], richGuide=True, guideStyle=True,
                    citations=[content['sources'][sid]['url'] for sid in source_ids(guide)],
                    guideSourceNumbers=page_source_numbers(guide, content, root, path))
    ice_path = '/environments/ice-fishing/'
    if ice_path in pages:
        pages[ice_path]['body'] += '<section class="wrap section"><h2>Is this your first rental trip?</h2><p>Compare the guide time, transport, gear, and overnight supplies before you book.</p><a class="btn" href="/guides/minnesota-fish-house-rental-checklist/">Compare two fish-house rentals</a></section>'
        pages[ice_path]['modified'] = '2026-11-13'
    by_id = {t['id']: t for t in trips}
    for tid, guide in content['trips'].items():
        path = by_id[tid]['canonicalPath']
        pages[path].update(title=guide['title'] + ' | Castward', desc=guide['description'],
                           body=render(guide, content, trips, root, origin, path), modified=DATE, guideStyle=True)
        pages[path]['guideSourceNumbers'] = page_source_numbers(guide, content, root, path)
        pages[path].update(trip_metadata(by_id[guide['destination']]))
    for guide in content['articles']:
        path = '/guides/' + guide['slug'] + '/'
        add(path, guide['title'] + ' | Castward', guide['description'], render(guide, content, trips, root, origin, path), 'article')
        pages[path]['modified'] = guide.get('updated', DATE)
        pages[path]['citations'] = [content['sources'][sid]['url'] for sid in source_ids(guide)]
        pages[path]['guideStyle'] = True
        pages[path]['guideSourceNumbers'] = page_source_numbers(guide, content, root, path)
        pages[path].update(trip_metadata(by_id[guide['destination']]))
        if guide.get('rich'):
            pages[path].update(richGuide=True, modified=guide['updated'],
                               ogImage='/media/guides/' + guide['hero']['name'] + '-1200.webp',
                               ogImageAlt=guide['hero']['alt'], photoPreload='')
        pages[path]['published'] = guide.get('published', DATE)
    body = bread('Field guides') + intro('CHOOSE / PREPARE / GO', 'Fishing trip guides that answer the next question.', 'Compare a destination, choose your dates, and build a packing list around what your guide actually supplies.')
    body += '<section class="section"><div class="wrap"><h2>Start with your trip decision</h2><div class="article-grid">'
    for guide in sorted(content['articles'], key=lambda g: not g['new']):
        body += '<a class="article-card" href="/guides/' + guide['slug'] + '/"><span class="eyebrow">' + E(guide['category']) + '</span><h3>' + E(guide['title']) + '</h3><p>' + E(guide['description']) + '</p><span class="link">Read the guide ↗</span></a>'
    checked = [t for t in trips if t.get('review', {}).get('status') == 'source-checked']
    body += '</div><h2 class="spaced">Choose your fishing destination</h2><p>Compare the water, trip style, and season. Check current access and local rules before you travel.</p><div class="world-grid">'
    body += ''.join(trip_card(t) for t in sorted(checked, key=lambda t: (t['id'] not in content['trips'], t['country'], t['place'])))
    body += '</div><div class="panel spaced"><h2>Explore the atlas</h2><p>' + ' · '.join(link(u, text) for u, text in [('/trips/', 'All trip profiles'), ('/environments/', 'Fishing environments'), ('/seasons/', 'Seasonal evidence'), ('/trip-types/', 'Local trip types'), ('/glossary/', 'Fishing terms')]) + '</p></div></div></section>'
    add('/guides/', 'Fishing trip guides, seasons and packing lists | Castward', 'Plan a fishing trip with source-checked destination guides, charter comparisons, seasonal advice and practical packing lists from Castward.', body, 'guide-index')
    pages['/guides/']['modified'] = max(g.get('updated', DATE) for g in content['articles'])
    pages['/guides/']['guideStyle'] = True
    florida = pages.get('/destinations/florida-keys/')
    if florida:
        florida['body'] += '<section class="wrap panel"><h2>Does your Florida outing need a license?</h2><p>Check shore, pier, and charter coverage with the <a href="/guides/florida-visitor-fishing-license-planner/">Florida visitor fishing license planner</a>.</p></section>'
        florida['modified'] = '2026-11-12'
