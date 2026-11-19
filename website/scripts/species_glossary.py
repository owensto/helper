"""Shared species IDs and reviewed evidence from source data to public pages."""
import hashlib
import json
import re
from functools import lru_cache
from html import escape as E


@lru_cache(maxsize=1)
def catalogs(root):
    load = lambda name: json.loads((root / 'src' / name).read_text())
    return (load('species-catalog.json')['species'],
            load('destination-species.json')['destinations'],
            load('glossary.json')['terms'])


def compile_into(world, trips, root):
    species, destinations, _ = catalogs(root)
    by_id = {s['id']: s for s in species}
    research = {d['id']: d for d in destinations}
    assert len(research) == len(destinations) == 801
    for trip in trips:
        record = research[trip['id']]
        trip['speciesIds'] = [t['speciesId'] for t in record['targets']]
        trip['fish'] = [by_id[sid]['name'] for sid in trip['speciesIds']]
        trip['speciesEvidence'] = record['targets']
        trip['speciesReview'] = {k: record[k] for k in ('status', 'reviewed', 'seasonStatus', 'methodStatus')}
        trip['speciesResearchUrls'] = record['researchSourceUrls']
        for target in record['targets']:
            source_ids = []
            for url in target['sourceUrls']:
                sid = 'species-' + hashlib.sha256(url.encode()).hexdigest()[:12]
                source_ids.append(sid)
                world['sources'].setdefault(sid, {
                    'title': 'Fishery source for ' + record['place'], 'url': url,
                    'type': 'species-reference', 'status': target['status'],
                    'checked': '2026-11-10', 'scopeNote': 'Supports the attributed target. Exact access, method and legal season need a separate check.',
                })
                if sid not in trip['sourceIds']:
                    trip['sourceIds'].append(sid)
            if source_ids:
                trip['evidence'].append({'source': source_ids[0], 'claim': target['commonName'] + ' is documented in the linked fishery source. Check its named water or departure area.'})
    world['speciesReviewed'] = '2026-11-10'


def planner_data(data, root):
    species, destinations, _ = catalogs(root)
    by_id = {s['id']: s for s in species}
    research = {d['id']: d for d in destinations}
    assert {d['id'] for d in data['destinations']} == set(research)
    # Keep the planner payload small. Full taxonomy lives in its source catalog.
    data['species'] = [{k: s[k] for k in ('id', 'name', 'scientificName', 'taxonType', 'sourceUrls')} for s in species]
    for d in data['destinations']:
        r = research[d['id']]
        d['speciesIds'] = [t['speciesId'] for t in r['targets']]
        d['species'] = [by_id[sid]['name'] for sid in d['speciesIds']]
        d['speciesEvidence'] = r['targets']
        d['speciesReview'] = {k: r[k] for k in ('status', 'reviewed', 'seasonStatus', 'methodStatus')}
        d['speciesResearchUrls'] = r['researchSourceUrls']


def link(url, label, cls=''):
    return '<a' + (' class="' + cls + '"' if cls else '') + ' href="' + E(url, quote=True) + '">' + E(label) + '</a>'


def species_url(sid):
    return '/species/' + sid + '/'


def source_links(urls):
    return '<ul class="field-sources">' + ''.join('<li>' + link(u, 'Source ' + str(i)) + '</li>' for i, u in enumerate(dict.fromkeys(urls), 1)) + '</ul>'


def install(pages, root, add, trips, data):
    species, destinations, terms = catalogs(root)
    sb = {s['id']: s for s in species}
    db = {d['id']: d for d in destinations}
    tb = {t['id']: t for t in trips}
    paths = {d['id']: d.get('guideUrl', '/destinations/' + d['id'] + '/') for d in data['destinations']}
    paths.update({t['id']: t.get('canonicalPath', '/trips/' + t['id'] + '/') for t in trips})
    names = {d['id']: d['place'] for d in destinations}
    matched = {s['id']: [d for d in destinations if any(t['speciesId'] == s['id'] for t in d['targets'])] for s in species}
    assets = '<link rel="stylesheet" href="/assets/field-reference.css"><script src="/assets/field-reference.js" defer></script>'

    def heading(label, title, deck):
        return '<div class="wrap breadcrumb">' + link('/', 'Home') + ' / ' + E(label) + '</div><header class="wrap type-heading"><span class="eyebrow">FIELD REFERENCE</span><h1>' + E(title) + '</h1><p class="type-deck">' + E(deck) + '</p></header>'

    def trip_links(ids, limit=None):
        selected = list(dict.fromkeys(i for i in ids if i in paths))
        if limit is not None:
            selected = selected[:limit]
        return '<ul class="field-trip-links">' + ''.join('<li>' + link(paths[i], names[i]) + '</li>' for i in selected) + '</ul>' if selected else ''

    species_count = sum(s['taxonType'] == 'species' for s in species)
    body = heading('Species', 'Find your fish.', 'Common names, local words and the waters that connect them.')
    body += '<section class="wrap field-reference"><div class="field-filter"><label for="species-search">Search fish or local names<input id="species-search" type="search" placeholder="Try rockfish, barra, carp or specks" autocomplete="off"></label></div><p id="species-count" role="status" aria-live="polite">' + str(species_count) + ' species and ' + str(len(species) - species_count) + ' broader fish groups</p><div class="field-species-grid">'
    for s in species:
        aliases = list(dict.fromkeys(a['name'] for a in s['localNames'] if a.get('language') == 'English'))
        search = ' '.join([s['name'], s['scientificName'] or '', *aliases, *s['regions']])
        body += '<article class="field-fish-card" data-species-card data-search="' + E(search, quote=True) + '"><span class="eyebrow">' + E(s['taxonType']) + '</span><h2>' + link(species_url(s['id']), s['name']) + '</h2>'
        if s['scientificName']:
            body += '<p class="field-scientific"><i>' + E(s['scientificName']) + '</i></p>'
        body += '<p>' + E(' · '.join(aliases[:3])) + '</p><span class="small">' + str(len(matched[s['id']])) + ' linked destination' + ('s' if len(matched[s['id']]) != 1 else '') + '</span></article>'
    body += '</div><p id="species-empty" hidden>No fish matches this search. Try a common or scientific name.</p><button class="btn outline" id="species-more" type="button" hidden>Show more fish</button><p class="field-note">Country records describe occurrence. Trip links use separate destination evidence. ' + link('/glossary/', 'Read the fishing glossary') + '</p></section>' + assets
    add('/species/', 'World fish species and local names | Castward', 'Explore ' + str(species_count) + ' fish species, regional names, sourced fishing destinations and agency rules.', body, 'species')

    for s in species:
        body = heading('Species / ' + s['name'], s['name'], s['scientificName'] or 'A broad fishing name. Confirm the exact species before the trip.')
        answer = s.get('searchAnswer')
        if answer:
            body = heading('Species / ' + s['name'], answer['title'], answer['answer'])
            body += '<div class="wrap field-reference"><p class="small">Updated ' + E(answer['updated']) + ' · ' + link('/about/', 'Castward') + '</p>'
            body += '<section><h2>' + E(answer['question']) + '</h2><div class="field-table-scroll" role="region" tabindex="0" aria-label="Species key facts"><table><thead><tr><th scope="col">Key fact</th><th scope="col">Detail</th></tr></thead><tbody>'
            body += ''.join('<tr><th scope="row">' + E(k) + '</th><td>' + E(v) + '</td></tr>' for k, v in answer['facts']) + '</tbody></table></div></section>'
            body += '<section><h2>What should you know about ' + E(s['name'].lower()) + '?</h2>' + ''.join('<details><summary>' + E(q) + '</summary><p>' + E(a) + '</p></details>' for q, a in answer['faq']) + '</section>'
            body += '<details><summary>Sources (' + str(len(answer['sources'])) + ')</summary><ul>' + ''.join('<li>' + link(u, label) + '</li>' for label, u in answer['sources']) + '</ul><p class="small">Checked November 2026</p></details></div>'
            schema = {'@context': 'https://schema.org', '@graph': [
                {'@type': 'Article', 'headline': answer['title'], 'dateModified': answer['updated'], 'author': {'@type': 'Organization', 'name': 'Castward', 'url': 'https://castward.app/about/'}, 'citation': [u for _, u in answer['sources']]},
                {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in answer['faq']]}
            ]}
            body += '<script type="application/ld+json">' + json.dumps(schema).replace('</', '<\\/') + '</script>'
        if s['id'] == 'cachama':
            body = heading('Species / Cachama', 'Cachama fish (Colossoma macropomum): tambaqui', 'Cachama is Colossoma macropomum, also known as tambaqui, black pacu and gamitana. This freshwater fish comes from the Amazon and Orinoco river basins in South America. Use its scientific name when you compare regional names: a shared common name does not mean every fish or fishing destination is the same.')
            body += '<div class="wrap"><p class="small">Updated November 18, 2026 · ' + link('https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Tambaqui.pdf', 'U.S. Fish and Wildlife Service: tambaqui') + '</p></div>'
        if s['id'] == 'cisco':
            body = heading('Species / Cisco', 'Cisco (Coregonus artedi): lake herring', 'Coregonus artedi is the cisco, also called lake herring or tullibee. Look at the snout when comparing it with lake whitefish: the cisco’s lower jaw reaches the snout tip or extends beyond it. Confirm the fish and local rules before planning a catch. Regional names alone are not enough.')
            body += '<div class="wrap"><p class="small">Updated November 16, 2026 · ' + link('https://www.dnr.state.mn.us/areas/fisheries/baudette/whitefish.html', 'Minnesota DNR: cisco and whitefish identification') + '</p></div>'
        if s['id'] == 'sand-steenbras':
            body = heading('Species / Sand steenbras', 'Sand steenbras (Lithognathus mormyrus)', 'Sand steenbras is Lithognathus mormyrus, also called striped seabream. Look for a silver body with dark bands that fade toward the belly. Reef Life Survey describes these marks and lists the species in several marine regions. Use the scientific name when comparing local names, then check the rules for your chosen water.')
            body += '<div class="wrap"><p class="small">Updated November 17, 2026 · ' + link('https://reeflife.org/species/lithognathus-mormyrus/', 'Reef Life Survey: sand steenbras') + '</p></div>'
        if s['id'] == 'tarakihi':
            body = heading('Species / Tarakihi', 'Tarakihi (Nemadactylus macropterus)', 'Tarakihi is Nemadactylus macropterus, known in Australia as jackass morwong. Look for the dark band behind its head and an unusually long ray in the pectoral fin. It lives around southern Australia and New Zealand. Match those features with the scientific name before you compare local names or plan a trip.')
            body += '<div class="wrap"><p class="small">Updated November 17, 2026 · ' + link('https://fishesofaustralia.net.au/home/species/433', 'Fishes of Australia: jackass morwong identification') + '</p></div>'
        if s['id'] == 'common-dace':
            body = heading('Species / Common dace', 'Common dace (Leuciscus leuciscus)', 'Common dace is Leuciscus leuciscus, a slender silver fish of European rivers. Look for a forked tail, a pointed head and a small mouth set slightly below the snout. In summer, it uses flowing water over gravel and pebbles. Compare these features together before relying on a local name.')
            body += '<div class="wrap"><p class="small">Updated November 17, 2026 · ' + link('https://doris.ffessm.fr/Especes/Leuciscus-leuciscus-Vandoise-2166', 'DORIS: common dace identification and habitat') + '</p></div>'
        if s['id'] == 'largemouth-bass':
            body = heading('Species / Largemouth bass', 'Largemouth bass', 'For a first largemouth bass trip, start at a public pier or shoreline beside aquatic plants. Look for weed edges, lily pads and fallen wood. Minnesota DNR identifies these as useful places to find bass. In hot summer weather, also look toward deeper, cooler water rather than staying only in the shallows.')
            body += '<div class="wrap"><p class="small">Updated November 17, 2026 · ' + link('/about/', 'Castward') + '</p><section><h2>Where should a beginner look for largemouth bass?</h2><div class="field-table-scroll"><table><thead><tr><th>Place</th><th>What to look for</th></tr></thead><tbody><tr><td>Public pier or bank</td><td>Nearby rushes, lily pads or submerged plants</td></tr><tr><td>Wooded shoreline</td><td>Fallen trees and branches that provide cover</td></tr><tr><td>Hot summer water</td><td>Deeper, cooler areas</td></tr></tbody></table></div><p>Use this as a place-selection checklist, not a catch forecast.</p></section>'
            questions = [
                ('Can I catch largemouth bass from shore?', 'Yes. A pier or bank beside aquatic plants gives you a useful starting point.'),
                ('Should I look for bass in open water or cover?', 'Start near plants or fallen wood. These features provide cover.'),
                ('Are the shallows always the best choice?', 'No. During hot summer days, Minnesota DNR suggests deeper, cooler water.'),
                ('What simple bait can a beginner try?', 'Minnesota DNR suggests a piece of worm under a bobber for shore fishing beside aquatic plants. Check local bait rules first.'),
                ('Where can I check the rules for my trip?', 'Use the official fisheries links below for the chosen water and date. Local rules can differ from statewide rules.')
            ]
            body += '<section><h2>What else should a first-time bass angler know?</h2>' + ''.join('<details><summary>' + E(q) + '</summary><p>' + E(a) + '</p></details>' for q, a in questions) + '</section><details><summary>Sources (2)</summary><ul><li>' + link('https://www.dnr.state.mn.us/gofishing/how-catch-largemouth-bass.html', 'Minnesota DNR: where and how to catch largemouth bass') + '</li><li>' + link('https://www.dnr.state.mn.us/minnaqua/speciesprofile/largemouthbass.html', 'Minnesota DNR: shore access and beginner bait') + '</li></ul><p class="small">Checked November 2026</p></details><p>' + link('/environments/lakes-reservoirs/', 'Choose a lake trip') + ' · ' + link('/atlas/', 'Find a water on the map') + ' · ' + link('/fishing-licenses/', 'Check the licence') + '</p></div>'
            body += '<script type="application/ld+json">' + json.dumps({'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in questions]}).replace('</','<\\/') + '</script>'
        body += '<div class="wrap field-reference field-detail"><article><nav class="field-local-nav" aria-label="Species sections">' + ' · '.join(link('#' + anchor, label) for anchor, label in [('where-to-fish', 'Where to fish'), ('local-names', 'Local names'), ('seasons', 'Seasons'), ('regulations', 'Rules')]) + '</nav>'
        body += '<section id="where-to-fish"><h2>Where to fish</h2>'
        matches = matched[s['id']]
        if matches:
            body += '<p>These destinations have a source-linked record for this fish. Check the linked guide for the exact water and trip details.</p>' + trip_links([d['id'] for d in matches])
        else:
            body += '<p>A destination match is not yet verified. The country records below describe occurrence, not a confirmed local fishing trip.</p>' + link('/trips/?q=' + s['id'], 'Explore the trip library')
        body += '</section><section id="local-names"><h2>Local names</h2>'
        aliases = []
        seen = set()
        for a in s['localNames']:
            key = (a['name'], a['region'], a.get('language', 'English'))
            if key in seen:
                continue
            seen.add(key); aliases.append(a)
        if aliases:
            body += '<p>A name can refer to different fish in different places.</p><div class="field-table-scroll"><table><thead><tr><th>Name</th><th>Region</th><th>Source</th></tr></thead><tbody>'
            for a in aliases:
                body += '<tr><td>' + E(a['name']) + '</td><td>' + E(a['region']) + (' · ' + E(a['language']) if a.get('language') not in (None, 'English') else '') + '</td><td>' + link(a['sourceUrls'][0], 'Reference') + '</td></tr>'
            body += '</tbody></table></div>'
        else:
            body += '<p>No additional regional name is verified in this catalog.</p>'
        body += '</section><section id="seasons"><h2>Seasons</h2>'
        for season in s['seasons']:
            body += '<h3>' + E(season['region']) + '</h3><p>' + E(season['text']) + '</p>' + source_links(season['sourceUrls'])
        if not s['seasons']:
            body += '<p>A species-wide fishing season is not verified. Use the destination guide and local agency for the water and dates you choose.</p>'
        else:
            body += '<p>These are fishing patterns from the linked sources. Check the agency for current legal seasons and closures.</p>'
        body += '</section><section id="regulations"><h2>Regulations and identification</h2><ul class="field-trip-links">'
        for r in s['regulationNotes']:
            body += '<li>' + link(r['url'], r['region'] + ' — ' + r['agency']) + '<p class="small">' + E(r['note']) + '</p></li>'
        body += '</ul></section><section><h2>Source records</h2>'
        if s['regions']:
            body += '<details><summary>Country occurrence records</summary><p>' + E(' · '.join(s['regions'])) + '</p><p class="small">A country record does not establish local abundance, fishing access or a legal target.</p></details>'
        body += source_links(s['sourceUrls']) + '</section></article><aside class="field-aside"><span class="eyebrow">KNOW THE WORDS</span><h2>Local fishing language.</h2><p>Connect the fish to its regional names, methods and equipment.</p>' + link('/glossary/?q=' + s['id'], 'Search the glossary', 'btn outline') + '<p>' + link('/species/', 'All fish species') + '</p></aside></div>' + assets
        add(species_url(s['id']), s['name'] + ' fishing, local names and destinations | Castward', 'Find ' + s['name'].lower() + ' names, source-linked destinations, seasonal evidence and official fisheries links.', body, 'species-detail')
        if answer:
            pages[species_url(s['id'])].update(title=answer['title'], desc=answer['description'], modified=answer['updated'])
        if s['id'] == 'cachama':
            pages[species_url(s['id'])].update(title='Cachama fish (Colossoma macropomum): tambaqui', desc='Cachama is Colossoma macropomum, also called tambaqui, black pacu or gamitana. Check its native river basins, regional names and linked destinations.', modified='2026-11-18')
        if s['id'] == 'largemouth-bass':
            pages[species_url(s['id'])].update(desc='Find largemouth bass from a pier or bank near weeds, lily pads and fallen wood. Use the beginner habitat table, bait advice and official rules.', modified='2026-11-17')
        if s['id'] == 'tarakihi':
            pages[species_url(s['id'])].update(title='Tarakihi (Nemadactylus macropterus): names and ID', desc='Tarakihi is Nemadactylus macropterus, or jackass morwong. Check its dark shoulder band, long pectoral-fin ray, local names and fishing destinations.', modified='2026-11-17')
        if s['id'] == 'common-dace':
            pages[species_url(s['id'])].update(title='Common dace (Leuciscus leuciscus): names and ID', desc='Identify common dace, Leuciscus leuciscus, by its slender silver body, forked tail and small mouth. Check river habitat, local names and destinations.', modified='2026-11-17')
        if s['id'] == 'sand-steenbras':
            pages[species_url(s['id'])].update(title='Sand steenbras (Lithognathus mormyrus): names and ID', desc='Identify sand steenbras, Lithognathus mormyrus, also called striped seabream. Check its dark bands, local names and source-linked fishing destinations.', modified='2026-11-17')
        if s['id'] == 'cisco':
            pages[species_url(s['id'])].update(title='Cisco (Coregonus artedi): lake herring and local names', desc='Identify cisco, also called lake herring or tullibee. Compare its snout with lake whitefish and check local names, destinations and official rules.', modified='2026-11-16')

    region_map = {d['country']: d['region'] for d in destinations}
    region_map.update({'Alaska': 'North America', 'Pacific Northwest': 'North America', 'North Pacific': 'North America', 'Northern Territory': 'Oceania'})
    def tags_for(regions):
        tags = set(regions)
        for name in regions:
            for country, continent in region_map.items():
                if country.casefold() in name.casefold(): tags.add(continent)
            if re.search(r'Alaska', name, re.I): tags.update(['Alaska', 'North America'])
            if re.search(r'England|Scotland|Wales|United Kingdom|Anglesey', name, re.I): tags.update(['United Kingdom', 'Europe'])
            if re.search(r'Australia|Northern Territory|Queensland|Tasmania', name, re.I): tags.update(['Australia', 'Oceania'])
        return sorted(tags)
    choices = ['Global', 'Alaska', 'North America', 'South America', 'United Kingdom', 'Europe', 'Africa', 'Asia', 'Australia', 'Oceania']
    body = heading('Glossary', 'Speak the water.', 'A name makes sense when you know the place.')
    body += '<section class="wrap field-reference"><div class="field-filter"><label for="glossary-search">Find a fishing term<input id="glossary-search" type="search" placeholder="Try yelloweye, mooching, boilie or barra" autocomplete="off"></label><label for="glossary-region">Region<select id="glossary-region"><option value="">All regions</option>' + ''.join('<option>' + E(r) + '</option>' for r in choices) + '</select></label></div><p id="glossary-count" role="status" aria-live="polite">' + str(len(terms)) + ' fishing terms</p><nav class="field-alphabet" aria-label="Glossary A to Z">'
    letters = sorted({t['term'][0].upper() if t['term'][0].isascii() and t['term'][0].isalpha() else '#' for t in terms})
    body += ''.join(link('#letter-' + ('other' if c == '#' else c), c) for c in letters) + '</nav>'
    for letter in letters:
        body += '<section data-glossary-letter id="letter-' + ('other' if letter == '#' else letter) + '"><h2 class="field-letter">' + E(letter) + '</h2><dl class="glossary-list">'
        for term in terms:
            initial = term['term'][0].upper() if term['term'][0].isascii() and term['term'][0].isalpha() else '#'
            if initial != letter:continue
            tags = tags_for(term['regions'])
            search = ' '.join([term['term'], *term['relatedSpecies'], *[sb[s]['name'] for s in term['relatedSpecies']], *term['regions']])
            body += '<div id="' + E(term['id'], quote=True) + '" data-glossary-term data-search="' + E(search, quote=True) + '" data-regions="' + E(json.dumps(tags), quote=True) + '"><dt>' + E(term['term']) + '</dt>'
            for entry in term['entries']:
                body += '<dd><p>' + E(entry['definition']) + '</p><p class="field-region">' + E(' · '.join(entry['regions'])) + '</p><div class="field-related">'
                # Preserve the first legacy trip-type link and existing term anchors.
                body += ' '.join(link('/trip-types/' + tid + '/', tid.replace('-', ' ').capitalize()) for tid in entry['relatedTripTypes'])
                body += ' '.join(link(species_url(sid), sb[sid]['name']) for sid in entry['relatedSpecies'])
                body += '</div>' + trip_links(entry['relatedTrips'], 3)
                if not entry['relatedTrips']:
                    body += '<p class="small">' + link('/trips/', 'Explore trip methods') + '</p>'
                body += '<details><summary>Sources</summary>' + source_links(entry['sourceUrls']) + '</details></dd>'
            body += '</div>'
        body += '</dl></section>'
    body += '<p id="glossary-empty" hidden>No term matches these filters. Try another word or region.</p></section>' + assets
    add('/glossary/', 'World fishing glossary: local fish names, methods and gear | Castward', 'Search ' + str(len(terms)) + ' fishing terms by name and region, including rockfish, yelloweye, lingcod, carp tackle and barra fishing.', body, 'glossary')

    for d in destinations:
        path = paths[d['id']]
        if path not in pages:continue
        module = '<section class="wrap profile-species" id="target-species"><span class="eyebrow">FISH & LOCAL WORDS</span><h2>Target species</h2>'
        if d['targets']:
            module += '<ul class="field-targets">'
            for t in d['targets']:
                module += '<li>' + link(species_url(t['speciesId']), t['commonName']) + ' <span class="small">· ' + link(t['sourceUrls'][0], 'Fishery source') + '</span></li>'
            module += '</ul><p class="small">The source describes the fishery. Check its exact water, current access and local rules before the trip.</p>'
        else:
            module += '<p>Local target species remain unverified. The research source is available for a location check.</p>' + source_links(d['researchSourceUrls'][:2])
        module += '<p>' + link('/species/', 'Explore fish species') + ' · ' + link('/glossary/', 'Fishing glossary') + '</p></section>'
        marker = '<section class="section article-section">'
        if marker in pages[path]['body']:
            pages[path]['body'] = pages[path]['body'].replace(marker, module + marker, 1)
        else:
            pages[path]['body'] += module
        pages[path]['body'] += '<link rel="stylesheet" href="/assets/field-reference.css">'
        pages[path]['modified'] = max(pages[path].get('modified', ''), '2026-11-10')
    for path in ['/species/', '/glossary/', *[species_url(s['id']) for s in species]]:
        pages[path]['modified'] = max(pages[path].get('modified', ''), '2026-11-10')
