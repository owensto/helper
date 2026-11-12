"""A searchable, source-linked field guide to regional fishing language."""
import hashlib
import json
import re
from html import escape as E

PATH = '/fishing-lingo/'
CONTINENTS = ['North America', 'Latin America & Caribbean', 'Europe', 'Africa', 'Asia-Pacific']


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def fish_icon(name=''):
    shapes = {
        'flounder': 'M9 12 2 7v10Zm0 0Q25-6 44 12 25 30 9 12Z',
        'permit': 'M9 12 1 2v20Zm0 0Q22-3 38 5l6 7-6 7Q22 27 9 12ZM18 6 31 0l-4 7m-7 11 11 6-4-7',
        'bonefish': 'M11 12 1 3l3 9-3 9Zm0 0Q25 3 46 12 25 21 11 12ZM22 8l4-6 7 7',
        'tarpon': 'M9 12 1 2v20Zm0 0Q27 0 44 8l3 4-5 6Q24 24 9 12ZM21 6l5-5 8 6',
        'trout': 'M9 12 1 5v14Zm0 0Q28 0 46 12 28 24 9 12ZM19 7l7-6 7 6',
        'trevally': 'M10 12 1 1l3 11-3 11Zm0 0Q25-4 43 8l4 4-5 6Q24 25 10 12ZM22 5l8-5-1 6',
        'triggerfish': 'M10 12 2 5v14Zm0 0Q23-2 39 7l7 5-7 5Q23 26 10 12ZM20 6l3-6 6 6',
    }
    shape = next((v for k,v in shapes.items() if k in name.lower()), 'M9 12 1 4v16zm0 0C17-2 35 0 46 12 35 24 17 26 9 12Z')
    return f'<svg viewBox="0 0 48 24" aria-hidden="true"><path d="{shape}" fill="currentColor"/><circle cx="37" cy="10" r="1.5" fill="var(--paper)"/></svg>'


def regional_art(continent):
    # Small original landscape engravings, not geographic maps.
    mountain = continent in ('Europe', 'North America')
    land = 'M0 65 30 42 48 51 81 15 115 52 145 34 180 65Z' if mountain else 'M0 65Q35 45 70 59T180 48V75H0Z'
    trees = ''.join(f'<path d="M{x} 64V{y}m0 3-10 15h20Zm0 10-13 16h26Z"/>' for x,y in [(22,31),(148,25),(164,38)]) if mountain else '<path d="M135 66q-8-24 0-43m0 0q-20-13-30 3 19-4 30-3m0 0q20-14 31 2-17-5-31-2m0 0q-2-18 12-18-9 6-12 18" fill="none"/>'
    return f'<svg class="region-art" viewBox="0 0 180 90" aria-hidden="true"><circle cx="70" cy="26" r="13" fill="#dec58a"/><path d="{land}" fill="#b6c3ad"/><g stroke="#405f4c" fill="#405f4c" stroke-width="1.2">{trees}</g><path d="M0 70h180M15 76h70m18 0h55M35 83h85" stroke="#75998b" fill="none"/></svg>'


def install(pages, root, add, intro, bread, origin=''):
    data = json.loads((root / 'src/local-lingo.json').read_text())
    sources, regions = data['sources'], data['regions']
    region_by_id = {r['id']: r for r in regions}
    terms = [(r,t) for r in regions for t in r['terms']]
    count = len(terms)
    body = '<div class="lingo-page">' + bread('Fishing lingo')
    body += f'''<header class="lingo-hero wrap"><div class="lingo-hero-copy"><span class="eyebrow">THE CASTWARD FIELD GUIDE / 02</span><h1>Talk like<br>you fish.</h1><p>The local words. The fish behind them.</p><div class="lingo-hero-foot"><span>{count} terms <i> / </i> {len(regions)} regions</span><a href="#lingo-filters">Find your word <span aria-hidden="true">↓</span></a></div></div><figure><picture><source type="image/avif" srcset="/media/field-club/river-640.avif 640w, /media/field-club/river-1200.avif 1200w, /media/field-club/river-1600.avif 1600w" sizes="(max-width: 700px) 100vw, 55vw"><img src="/media/field-club/river-1200.webp" srcset="/media/field-club/river-640.webp 640w, /media/field-club/river-1200.webp 1200w, /media/field-club/river-1600.webp 1600w" sizes="(max-width: 700px) 100vw, 55vw" width="1536" height="1024" alt="A wooden drift boat beside a clear forest river" fetchpriority="high"></picture><figcaption>Good water. Better conversation.</figcaption></figure></header>'''
    body += '<div class="wrap"><section class="lingo-filters" id="lingo-filters" aria-label="Find fishing terms"><div class="lingo-search-row"><label for="lingo-search">What did they call it?</label><div class="lingo-search-box"><span aria-hidden="true">⌕</span><input id="lingo-search" type="search" placeholder="Try “speck”, “slam” or “tarpon”…" autocomplete="off"><button type="button" id="lingo-clear">Clear filters</button></div></div><details class="lingo-regions"><summary>Choose a region <span>Five corners of the fishing world <b aria-hidden="true">+</b></span></summary><div class="lingo-region-options"><div class="lingo-global"><button type="button" data-region="" aria-pressed="true">All waters</button><button type="button" data-region="international-billfish" aria-pressed="false">Worldwide slams</button></div>'
    for continent in CONTINENTS:
        body += f'<fieldset><legend>{E(continent)}</legend>'
        for r in regions:
            if r['continent'] == continent:
                body += f'<button type="button" data-region="{r["id"]}" aria-pressed="false">{E(r["name"])}</button>'
        body += '</fieldset>'
    body += '</div></details><nav class="lingo-continents" aria-label="Filter by continent"><button type="button" data-continent="" aria-pressed="true">All waters</button>'
    body += ''.join(f'<button type="button" data-continent="{E(c,quote=True)}" aria-pressed="false">{E(c)}</button>' for c in CONTINENTS)
    body += '</nav></section>'
    featured = [('gulf-coast','Inshore slam','01 / THE COASTAL CLASSIC'),('florida-keys','Grand slam','02 / THE FLATS TRIFECTA'),('seychelles','Flats slam / Alphonse slam','03 / THE ISLAND CHALLENGE')]
    body += '<section class="lingo-slams" id="slams"><div class="lingo-section-head"><div><span class="eyebrow">THREE FISH. ONE VERY GOOD DAY.</span><h2>Meet the slams.</h2></div><p>A slam is a set of different fish.<br>The place sets the lineup. The rules set the clock.</p></div><div class="slam-grid">'
    short_names={'Red drum':'Redfish','Spotted seatrout':'Trout','Atlantic bonefish':'Bonefish','Atlantic tarpon':'Tarpon','Yellowmargin triggerfish':'Triggerfish','Giant trevally':'Giant trevally'}
    for rid, name, label in featured:
        t = next(t for t in region_by_id[rid]['terms'] if t['term'] == name)
        title = 'Island slam' if rid == 'seychelles' else name
        body += f'<a class="slam-card" href="#{rid}-{slug(name)}"><span class="eyebrow">{label}</span><h3>{E(title)}</h3><div class="slam-fish">'
        for fish in t['species'][:3]:
            body += f'<span>{fish_icon(fish)}<b>{E(short_names.get(fish,fish))}</b></span>'
        body += f'</div><div class="slam-bottom"><span>{"Seychelles" if rid == "seychelles" else "Gulf Coast & Lowcountry" if rid == "gulf-coast" else "Keys & Caribbean"}</span><span aria-hidden="true">↗</span></div></a>'
    body += '</div><p class="slam-note">Some slams take one day; others take a trip or a lifetime. Each term below explains its own rules.</p></section>'
    body += f'<section class="lingo-reference" id="lingo-results" aria-label="Fishing terms"><div class="lingo-results-heading"><h2>The local language.</h2><p id="lingo-count" role="status" aria-live="polite">{count} terms / all waters</p></div><nav class="lingo-alphabet" aria-label="Terms A to Z"><button type="button" data-letter="" aria-pressed="true">All</button>'
    letters={t['term'][0].upper() for _,t in terms}
    for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        body += f'<button type="button" data-letter="{letter}" aria-pressed="false"'+(' disabled' if letter not in letters else '')+f'>{letter}</button>'
    body += '</nav><p id="lingo-empty" hidden>No bites. Try another word or clear the filters.</p>'
    for r in regions:
        rid=r['id']
        body += f'<section class="lingo-region" id="{rid}" data-lingo-region data-continent="{E(r["continent"],quote=True)}"><header class="lingo-region-heading">{regional_art(r["continent"])}<div><span class="eyebrow">{E(r["continent"])}</span><h3>{E(r["name"])}</h3><p>{E(r["intro"])}</p></div><span class="region-count">{len(r["terms"]):02d} TERMS</span></header><div class="lingo-grid">'
        for t in r['terms']:
            tid=rid+'-'+slug(t['term'])
            membership=[rid]+t.get('also_in',[])
            continents=list(dict.fromkeys(region_by_id[m]['continent'] for m in membership))
            search=' '.join([t['term'],t['meaning'],t.get('example','')]+t['species']+[region_by_id[m]['name'] for m in membership])
            body += f'<article class="lingo-card" id="{tid}" data-lingo-term data-search="{E(search,quote=True)}" data-regions="{" ".join(membership)}" data-continents="{E(json.dumps(continents),quote=True)}" data-letter="{t["term"][0].upper()}">'
            body += ''.join(f'<span id="{E(anchor)}" class="lingo-legacy-anchor"></span>' for anchor in t.get('alternate_anchors',[]))
            body += f'<h4><a href="#{tid}">{E(t["term"])}<span class="term-anchor" aria-hidden="true">#</span></a></h4><p class="lingo-meaning">{E(t["meaning"])}</p><div class="lingo-species">'
            body += ''.join(f'<span>{fish_icon()}{E(s)}</span>' for s in t['species'])
            body += '</div>'
            if t.get('also_in'):
                body += '<p class="lingo-shared">Also heard in '+E(', '.join(region_by_id[m]['name'] for m in t['also_in']))+'</p>'
            example=t.get('example')
            body += '<details class="lingo-usage"><summary>Where you’ll hear it <span aria-hidden="true">+</span></summary><div>'
            if example:
                body += f'<span class="lingo-usage-label">EXAMPLE / {E(r["name"])}</span><p class="lingo-example">“{E(example)}”</p>'
            else:
                # An editorial usage example, not a quotation attributed to the source.
                body += f'<p class="lingo-example">For example, on a trip in {E(r["name"])}: “{E(t["term"])}” is a word for {"this catch" if t["species"] else "this part of the fishing day"}.</p>'
            for note in t.get('regional_notes',[]):
                body += f'<p><b>{E(region_by_id[note["region"]]["name"])}:</b> {E(note["meaning"])}</p>'
            body += '<div class="lingo-sources">'+''.join(f'<a href="{E(sources[s]["url"],quote=True)}" target="_blank" rel="noopener noreferrer">{E(sources[s]["title"])} ↗</a>' for s in t['sources'] if s in sources)+'</div></div></details></article>'
        body += '</div></section>'
    body += '</section><footer class="lingo-end"><span class="eyebrow">PUT A PLACE TO THE WORDS</span><h2>Now go hear it for yourself.</h2><a href="/local-classics/">Find a local fishing classic ↗</a><a href="/glossary/">Explore the fish names A–Z ↗</a></footer></div></div>'
    schema={'@context':'https://schema.org','@type':'DefinedTermSet','name':'Fishing lingo by region','hasDefinedTerm':[{'@type':'DefinedTerm','name':t['term'],'description':t['meaning'],'url':origin+PATH+'#'+r['id']+'-'+slug(t['term']),'inDefinedTermSet':origin+PATH} for r,t in terms]}
    body += '<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('</','<\\/')+'</script>'
    add(PATH, 'Fishing Lingo by Region: Slams, Nicknames and Local Terms | Castward',f'A field guide to {count} fishing terms from {len(regions)} regions. Find local fish names, slams, and the words you hear on the water.',body,'article')
    def asset(name):
        digest=hashlib.sha256((root/'public/assets'/name).read_bytes()).hexdigest()[:12]
        return '/assets/'+name+'?v='+digest
    pages[PATH]['atlasAssets']='<link rel="stylesheet" href="'+asset('lingo.css')+'"><script defer src="'+asset('lingo.js')+'"></script>'
    pages[PATH]['modified']='2026-11-11'
    link='<div class="wrap"><p class="lingo-link"><a class="link" href="/fishing-lingo/">Fishing lingo by region: slams, nicknames and local terms ↗</a></p></div>'
    for path in ['/glossary/','/local-classics/']+['/trip-types/'+s+'/' for s in ('keys-grand-slam','texas-slam','lowcountry-inshore-grand-slam','ascension-bay-grand-slam')]:
        if path in pages: pages[path]['body'] += link
