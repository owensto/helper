"""Build one self-hosted map catalog from the same records used by trip styles."""
import hashlib
import json
import re
from html import escape as E
from photography import TRIP_IMAGES, MANIFEST, water_photo, ALIASES, trip_photo
from preview_images import TRIP_PREVIEWS, available, image_url


def install(pages, root, origin, add, data, trips, styles):
    by_id = {t['id']:t for t in trips}
    locations = json.loads((root/'src/atlas-locations.json').read_text())['locations']
    (root/'dist/media/atlas/locations.json').write_text((root/'src/atlas-locations.json').read_text())
    records = []
    for d in data['destinations']:
        t = by_id.get(d['id'], {})
        slug = d['id']
        if slug in TRIP_IMAGES:
            image = '/media/trips/'+slug+'-640.webp'
        elif available(TRIP_PREVIEWS.get(slug)):
            image = '/'+image_url(TRIP_PREVIEWS[slug])
        else:
            scene = ALIASES.get(water_photo(t),water_photo(t)) if t else 'hero'
            options = [p for p in MANIFEST if p['slot']==scene and p['kind']=='web' and p['file'].endswith('.webp')]
            image = '/media/scenes/'+options[0]['file'].split('/')[-1]
        location = locations.get(slug)
        records.append({'id':slug,'name':d['name'],'region':' · '.join(filter(None,[t.get('state'),t.get('country',d['region'])])),
                        'path':d.get('guideUrl','/destinations/'+slug+'/'),'species':d.get('species',[]),
                        'candidateTargets':t.get('candidateTargets',''),'styles':d['tripStyleIds'],
                        'classicNames':t.get('tripTypeNames',[]),'water':t.get('water','To confirm'),
                        'waters':[t['water']] if t else {'yakutat':['Freshwater','Saltwater'],'florida-keys':['Saltwater'],'bozeman':['Freshwater']}[slug],
                        'ice':'Ice fishing' in t.get('habitats',[]),'months':sorted({m for w in d.get('seasonWindows',[]) for m in w['months']}),
                        'coordinates':d['coordinates'],'locationLabel':location['label'] if location else 'Location not established',
                        'precision':d['locationPrecision'],'image':image,'imageHtml':trip_photo(t, '320px'),'tier':t.get('contentTier','detailed-guide')})
    payload = json.dumps({'trips':records,'styles':[{'slug':s['slug'],'name':s['name']} for s in styles]},ensure_ascii=False,separators=(',',':'))
    version = hashlib.sha256(payload.encode()).hexdigest()[:12]
    (root/'dist/assets'/('atlas-data-'+version+'.json')).write_text(payload)
    def versioned(name):
        digest=hashlib.sha256((root/'public/assets'/name).read_bytes()).hexdigest()[:12]
        return '/assets/'+name+'?v='+digest
    def markup(full=False):
        heading = '<span class="eyebrow">THE ATLAS, OPEN</span><h1>One world. More water.</h1>' if full else '<span class="eyebrow">THE ATLAS, OPEN</span><h2>One world.<br>More water.</h2>'
        body = '<section class="atlas-journey '+('atlas-full' if full else 'wrap')+'"><div class="section-head"><div>'+heading+'</div><p>Find your water. Make it a plan.<br>'+('801 destinations, one open atlas.' if full else '<a href="/atlas/">Open the full atlas ↗</a>')+'</p></div>'
        body += '<div class="interactive-atlas" data-atlas data-catalog="/assets/atlas-data-'+version+'.json" data-module="'+versioned('atlas-map.js')+'"><button type="button" class="atlas-filter-toggle" data-filter-toggle aria-expanded="false">Filter destinations <span aria-hidden="true">+</span></button><div class="atlas-tools"><label>Species or place<input type="search" name="search" placeholder="Try tarpon or Alaska" autocomplete="off"></label><label>Water<select name="water"><option value="">All waters</option>'+''.join('<option>'+x+'</option>' for x in ['Saltwater','Freshwater','Brackish','Ice','To confirm'])+'</select></label><label>Trip style<select name="style"><option value="">All styles</option>'+''.join('<option value="'+s['slug']+'">'+E(s['name'])+'</option>' for s in styles)+'</select></label><label>Month / season<select name="month"><option value="">Any month</option><optgroup label="Documented months">'+''.join('<option value="'+str(i)+'">'+m+'</option>' for i,m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'],1))+'</optgroup><optgroup label="Three-month windows">'+''.join('<option value="'+value+'">'+label+'</option>' for value,label in [('12,1,2','Dec–Feb'),('3,4,5','Mar–May'),('6,7,8','Jun–Aug'),('9,10,11','Sep–Nov')])+'</optgroup></select></label></div>'
        body += '<div class="atlas-toolbar"><p class="atlas-status" role="status" aria-live="polite">'+str(len(records))+' destinations</p><button type="button" data-clear>Clear filters</button><a href="#atlas-list">Browse the list ↓</a></div><div class="atlas-map-stage" data-lenis-prevent><div class="atlas-map" tabindex="0" role="region" aria-label="World fishing map. Use arrow keys to pan, plus and minus to zoom. Destination links are in the list below."></div><p class="atlas-loading" role="status">The atlas loads as you approach. All destinations are in the list below.</p><div class="atlas-map-controls"><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" data-reset>Reset map</button></div><aside class="atlas-preview" aria-label="Selected destination" hidden></aside><div class="atlas-map-credit"><a href="https://www.naturalearthdata.com/">Natural Earth</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> · <a href="https://www.geonames.org/">GeoNames</a></div></div>'
        body += '<div class="atlas-regions" aria-label="Explore a region">'+''.join('<button type="button" data-region="'+region+'">'+region+' <span aria-hidden="true">↗</span></button>' for region in ['World','Alaska','Florida','Norway','Australia'])+'</div><p class="atlas-evidence-note">Pins mark approximate places or regional reference areas, not launch sites. Seven broad records use a country reference only. Species and months retain each guide’s research limits. Scene images are illustrations. <a href="/media/atlas/locations.json">Location sources</a>.</p><p class="atlas-season-note" hidden>Only documented month windows appear. Missing months do not mean no fishing. These are not legal openings or current conditions.</p>'
        fallback=records if full else records[:12]
        body += '<details class="atlas-list" id="atlas-list"><summary>Browse all destinations as a list</summary><div class="atlas-list-content"><ul>'+''.join('<li><a href="'+E(r['path'],quote=True)+'">'+E(r['name'])+'</a><span>'+E(r['region'])+'</span></li>' for r in fallback)+'</ul>'+('' if full else '<p><a href="/atlas/#atlas-list">Browse all 801 destinations in the full atlas ↗</a></p>')+'</div></details></div>'
        if not full:
            body += '<div class="atlas-counts"><a href="/trips/"><b>'+str(len(records))+'</b><span>planner destinations</span></a><a href="/countries/"><b>'+str(len({t['country'] for t in trips}))+'</b><span>country & jurisdiction collections</span></a></div>'
        return body+'</section>'
    start=pages['/']['body'].index('<section class="atlas-journey wrap">')
    end=pages['/']['body'].index('<section class="region-band wrap">',start)
    pages['/']['body']=pages['/']['body'][:start]+markup()+pages['/']['body'][end:]
    add('/atlas/','Interactive fishing atlas | Castward','Explore all 801 fishing destinations on a world map. Filter water, trip style, documented months, species and places.',markup(True),'atlas')
    for route in ['/','/atlas/']:
        pages[route]['atlasAssets']='<link rel="stylesheet" href="'+versioned('atlas.css')+'"><script src="'+versioned('atlas-loader.js')+'" defer></script>'
        pages[route]['modified']='2026-11-10'
    for route,p in pages.items():
        if route.startswith('/trip-types/') or route in ['/local-classics/','/atlas/']:
            parts=[('Home','/')]
            if route.startswith('/trip-types/') and route!='/trip-types/':
                parts.append(('Trip styles','/trip-types/'))
                if route not in ['/trip-types/'+s['slug']+'/' for s in styles]:parts.append(('Local classics','/local-classics/'))
            parts.append((p['title'].split(' | ')[0],route))
            schema={'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':i,'name':label,'item':origin+url} for i,(label,url) in enumerate(parts,1)]}
            p['body']+='<script type="application/ld+json">'+json.dumps(schema).replace('</','<\\/')+'</script>'
