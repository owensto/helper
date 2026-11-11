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
        pages[path]['modified'] = '2026-11-10'
    for path in ['/species/', '/glossary/', *[species_url(s['id']) for s in species]]:
        pages[path]['modified'] = '2026-11-10'
