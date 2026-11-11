"""Trip styles are a discovery taxonomy, separate from legacy local-classic presets."""
import json
import re
from html import escape as E
from photography import photo


def style_ids(trip, styles):
    habitats = set(trip.get('habitats', []))
    methods = ' '.join(trip.get('methods', [])).lower()
    access = set(trip.get('access', []))
    # Narrow title/summary fields avoid matching hypothetical gear/questions in long articles.
    description = ' '.join(str(trip.get(k, '')) for k in ('title', 'summary', 'place')).lower()
    rules = {
        'inshore-flats': bool(habitats & {'Saltwater flats', 'Estuaries & mangroves'}),
        'offshore-bluewater': 'Offshore' in habitats,
        'surf-pier': 'Surf & beaches' in habitats or bool(re.search(r'\bpier fishing\b', description)),
        'fly-fishing': 'fly' in methods,
        'river-float': 'River float' in access,
        'lake-reservoir': bool(habitats & {'Lakes & reservoirs', 'Alpine lakes'}),
        'ice-fishing': 'Ice fishing' in habitats or 'Guided ice' in access,
        'remote-lodge': bool(re.search(r'\bfly[- ]in\b|\bremote lodge\b', description)),
        'kayak': bool(re.search(r'\bkayak\b', description)) or 'Kayak' in access,
        'bottom-combo': 'Reef & bottom' in habitats or 'bottom' in methods,
        'night-fishing': bool(re.search(r'\bnight[- ](?:fishing|jig|charter)', description)),
        'sight-fishing': bool(re.search(r'\bsight[- ](?:fish|cast)', description)),
        'big-game': bool(re.search(r'\b(marlin|sailfish|billfish|bluefin|big.game)\b', (' '.join(trip.get('fish', [])) + ' ' + trip.get('title', '')).lower())),
        'multi-species-slams': bool(re.search(r'\bslam\b', trip.get('title', '').lower())),
        'bank-wading': bool(access & {'Bank', 'Guided wading', 'Hike-in'}),
        'river-fishing': bool(habitats & {'Rivers & streams', 'Spring-fed streams', 'Glacier-influenced rivers', 'Tropical floodplains'}),
    }
    classics = set(trip.get('tripTypeIds', []))
    return [s['slug'] for s in styles if rules[s['slug']] or classics.intersection(s['classicIds'])]


def compile_into(world, trips, root):
    styles = json.loads((root/'src/trip-styles.json').read_text())['styles']
    known = {t['slug'] for t in world['tripTypes']}
    for s in styles:
        assert set(s['classicIds']) <= known, s['slug']
    assert known <= {c for s in styles for c in s['classicIds']}
    for trip in trips:
        trip['tripStyleIds'] = style_ids(trip, styles)
    world['tripStyles'] = styles


def path(style):
    return '/trip-types/' + style['slug'] + '/'


def install(pages, root, origin, add, trips, destinations):
    styles = json.loads((root/'src/trip-styles.json').read_text())['styles']
    classics = json.loads((root/'src/trip-types.json').read_text())['types']
    # Relocate only the index. Every indexed classic detail URL stays exactly the same.
    pages['/local-classics/'] = pages.pop('/trip-types/')
    p = pages['/local-classics/']
    p.update(title='Local fishing classics | Castward', desc='Local fishing names, species, seasonal evidence and destination trips.', kind='local-classics')
    p['body'] = p['body'].replace('THE WORDS OF THE WATER','LOCAL CLASSICS').replace('Find your trip type', 'Find a local classic').replace('41 trip types', '41 local classics')
    for p in pages.values():
        for field in ('body', 'title', 'desc'):
            p[field] = p[field].replace('Local trip types', 'Local classics').replace('Local trip type', 'Local classic').replace('local trip types', 'local classics').replace('local trip type', 'local classic')
        p['body'] = p['body'].replace('<a href="/trip-types/">Trip types</a>', '<a href="/trip-types/">Trip styles</a><span> / </span><a href="/local-classics/">Local classics</a>')
        p['body'] = p['body'].replace('href="/trip-types/">Explore local classics', 'href="/local-classics/">Explore local classics')
    by_id = {t['id']:t for t in trips}
    records = []
    for d in destinations:
        t = by_id.get(d['id'], {})
        records.append({'id':d['id'], 'name':d['name'], 'region':' · '.join(filter(None,[t.get('state'),t.get('country',d['region'])])),
                        'path':d.get('guideUrl','/destinations/'+d['id']+'/'), 'styles':d['tripStyleIds'],
                        'species':d.get('species',[]), 'tier':t.get('contentTier','detailed-guide')})
    crumb = '<div class="wrap breadcrumb"><a href="/">Home</a><span> / </span><a href="/trip-types/">Trip styles</a>'
    cards = ''
    for s in styles:
        matches = [r for r in records if s['slug'] in r['styles']]
        cards += '<article class="type-card"><a class="type-card-image" tabindex="-1" href="'+path(s)+'">'+photo(s['image'],'(max-width: 700px) 100vw, 33vw')+'</a><div class="type-card-meta"><span>'+str(len(matches))+' MATCHING DESTINATIONS</span></div><h2><a href="'+path(s)+'">'+E(s['name'])+'</a></h2><p>'+E(s['definition'])+'</p></article>'
        body = crumb+'<span> / </span>'+E(s['name'])+'</div><header class="wrap type-heading"><span class="eyebrow">TRIP STYLE</span><h1>'+E(s['name'])+'</h1><p class="type-deck">'+E(s['definition'])+'</p><a class="link" href="/atlas/?style='+s['slug']+'">Find this style on the atlas ↗</a></header>'
        body += '<section class="wrap style-notes">'+''.join('<div><h2>'+title+'</h2><p>'+E(s[key])+'</p></div>' for title,key in [('Who it suits','suits'),('Boats & gear','gear'),('Seasons','season')])+'</section>'
        local = [c for c in classics if c['slug'] in s['classicIds']]
        if local:
            body += '<section class="wrap section"><span class="eyebrow">ASK FOR IT BY NAME</span><h2>Local classics.</h2><div class="style-classics">'+''.join('<a href="/trip-types/'+c['slug']+'/">'+E(c['name'])+' ↗</a>' for c in local)+'</div></section>'
        body += '<section class="wrap section"><h2>Every matching trip.</h2><p>Matches use the catalog’s habitat, method, access and local-classic records. Research status stays with each trip. A style match does not confirm an operator or season.</p><label for="style-search">Find a species or place<input type="search" id="style-search" placeholder="A fish, region or destination"></label><p id="style-count" role="status">'+str(len(matches))+' destinations</p><ul class="style-trip-list">'
        for r in matches:
            status = {'detailed-guide':'Source-checked guide','trip-brief':'Source-linked brief','preparation-brief':'Research pending'}[r['tier']]
            body += '<li data-style-trip data-search="'+E(' '.join([r['name'],r['region'],*r['species']]),quote=True)+'"><a href="'+E(r['path'],quote=True)+'">'+E(r['name'])+'</a><span>'+E(r['region'])+' · '+status+'</span></li>'
        body += '</ul><p id="style-empty" hidden>No matching trip. Try another species or place.</p></section><script src="/assets/trip-types.js" defer></script>'
        add(path(s),s['name']+' fishing trips | Castward',s['definition'],body,'trip-style')
        pages[path(s)]['modified']='2026-11-10'
        collection={'@context':'https://schema.org','@type':'CollectionPage','name':s['name'],'url':origin+path(s),'mainEntity':{'@type':'ItemList','numberOfItems':len(matches),'itemListElement':[{'@type':'ListItem','position':i,'url':origin+r['path'],'name':r['name']} for i,r in enumerate(matches,1)]}}
        pages[path(s)]['body'] += '<script type="application/ld+json">'+json.dumps(collection).replace('</','<\\/')+'</script>'
    body = crumb+'</div><header class="wrap type-heading"><span class="eyebrow">CHOOSE HOW YOU FISH</span><h1>Find your kind<br>of day.</h1><p class="type-deck">A style describes the day. A destination gives it a place.</p><p>Explore the methods, boats and waters that suit you. Then choose from every matching catalog trip.</p><a class="link" href="/local-classics/">Looking for a local name? Explore 41 local classics ↗</a></header><section class="wrap section"><div class="type-grid">'+cards+'</div></section>'
    add('/trip-types/','Fishing trip styles: find your kind of day | Castward','Explore 16 fishing trip styles, with boats, gear, seasons, local classics and all matching destinations.',body,'trip-styles')
    pages['/trip-types/']['modified']='2026-11-10'
    # One semantic contract for all forward and reverse discovery links.
    for c in classics:
        belonging = [s for s in styles if c['slug'] in s['classicIds']]
        block='<section class="wrap section"><span class="eyebrow">THE WAY YOU FISH</span><h2>Trip styles for this classic.</h2><div class="style-classics">'+''.join('<a href="'+path(s)+'">'+E(s['name'])+' ↗</a>' for s in belonging)+'</div></section>'
        p=pages['/trip-types/'+c['slug']+'/'];p['body']=p['body'].replace('LOCAL TRIP TYPE /','LOCAL CLASSIC /')+block
    for r in records:
        if r['path'] not in pages:continue
        belonging=[s for s in styles if s['slug'] in r['styles']]
        pages[r['path']]['body']+='<section class="wrap section"><h2>Explore this trip style.</h2><div class="style-classics">'+''.join('<a href="'+path(s)+'">'+E(s['name'])+' ↗</a>' for s in belonging)+'</div></section>'
    pages['/trips/']['body']='<section class="wrap classics-row"><span class="eyebrow">LOCAL CLASSICS</span><p>Know the name of the day you want?</p><a href="/local-classics/">All 41 local classics ↗</a><a href="/trip-types/lowcountry-inshore-grand-slam/">Lowcountry Grand Slam ↗</a><a href="/trip-types/lake-erie-walleye-charter/">Lake Erie walleye ↗</a></section>'+pages['/trips/']['body']
    return styles
