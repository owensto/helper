"""Outdoor editorial presentation; route and evidence records stay with the atlas."""
from photography import photo, credits, water_photo, trip_photo, trip_metadata, preview_photo
from urllib.parse import urlencode
from preview_images import PREVIEWS, available

def install(pages, root, header, footer, brand, featured, trip_card, trips):
    header=f'''<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner">{brand}<nav class="nav" id="site-nav" aria-label="Main navigation"><a href="/trips/">Trips</a><a href="/atlas/">Atlas</a><a href="/trip-types/">Trip styles</a><a href="/environments/">Waters</a><a href="/guides/">Field guides</a><a href="/videos/">Films</a><a href="/play/">Play</a><details class="tools-nav"><summary>Tools</summary><div><a href="/tools/weather/">Weather</a><a href="/tools/tides/">Tides</a><a href="/fishing-licenses/">Fishing licenses</a></div></details><a class="plan-link" href="/plan/">My fishing plan</a></nav><div class="header-action"><button class="search-toggle" type="button" aria-label="Search trips" aria-haspopup="dialog"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></svg></button><button class="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="site-nav" data-action="menu">☰</button></div></div></header><dialog id="search-dialog" aria-labelledby="search-title"><button class="search-close" aria-label="Close search" type="button">✕</button><h2 id="search-title">Find your water.</h2><form action="/search/" method="get"><label for="header-search">A place, a fish, a kind of water</label><div><input id="header-search" name="q" type="search" placeholder="Where will you go?"><button class="btn" type="submit">Search</button></div></form></dialog>'''
    old=pages['/']['body'];films=old[old.index('<section class="wrap section watch-section"'):]
    films=films.replace('<h2>Watch</h2>','<h2>Castward Films</h2>').replace('Short animated fishing stories. Find the guide behind each film.','Short animated stories from a life around water.')
    home='<section class="outdoor-hero">'+photo('hero',eager=True)+'<div class="hero-shade"></div><div class="wrap outdoor-hero-copy"><h1><span class="line-mask"><span>Out there.</span></span><span class="line-mask"><span>On the water.</span></span></h1><p>Find a place to fish. Make a plan to go.</p><a class="quiet-button" href="/trips/">Explore the trips <span aria-hidden="true">↗</span></a></div><a class="scroll-cue" href="#water-stories" aria-label="Scroll to the water">Scroll to the water <span aria-hidden="true">↓</span></a><button class="motion-toggle" type="button" aria-pressed="false">Pause motion</button></section>'
    home+='<section class="outdoor-intro wrap" id="water-stories"><p>Some days belong outside.</p><h2>Follow the water.</h2><p>From a quiet river bend to the open sea.</p></section>'
    for key,title,line,habitat in [('inshore','Inshore','Stay close to the edge. Explore the shallows.','Estuaries & mangroves'),('coast','Offshore','Beyond the shoreline. Into open water.','Offshore'),('stream','Rivers & streams','Take the long way upstream.','Rivers & streams'),('ice','Ice','A quieter kind of winter.','Ice fishing')]:
        home+='<section class="water-story">'+'<div class="story-image">'+preview_photo('/environments/'+{'inshore':'estuaries-mangroves','coast':'offshore','stream':'rivers-streams','ice':'ice-fishing'}[key]+'/', fallback=key)+'</div>'+'<div class="wrap story-copy"><h2>'+title+'</h2><div><p>'+line+'</p><a class="link" href="/trips/?'+urlencode({'habitat':habitat})+'">Explore '+title.lower()+' ↗</a></div></div></section>'
    selected=[t for t in featured if t.get('planId') in ['US-NC-002','US-GA-002','US-FL-001']]
    home+='<section class="section featured-trips"><div class="wrap"><div class="section-head"><h2>A place to begin.</h2><a class="link" href="/trips/">All trips ↗</a></div><div class="world-grid">'+''.join(trip_card(t) for t in selected)+'</div></div></section>'+films
    home+='<section class="region-band wrap"><h2>Near. Far. Yours to find.</h2><div><a class="country-card" href="/north-america/">North America <span>↗</span></a><a class="country-card" href="/continents/">World atlas <span>↗</span></a></div></section>'
    pages['/']['body']=home
    pages['/']['photoPreload']='<link rel="preload" as="font" href="/assets/fonts/google-font-5.woff2" type="font/woff2" crossorigin><link rel="preload" as="image" type="image/avif" media="(min-width: 601px)" imagesrcset="/media/scenes/hero-640.avif 640w, /media/scenes/hero-1280.avif 1280w, /media/scenes/hero-1536.avif 1536w" imagesizes="100vw" fetchpriority="high"><link rel="preload" as="image" type="image/avif" media="(max-width: 600px)" imagesrcset="/media/scenes/hero-mobile-480.avif 480w, /media/scenes/hero-mobile-800.avif 800w, /media/scenes/hero-mobile-1120.avif 1120w" imagesizes="100vw" fetchpriority="high">'
    for path,key in [('/trips/','river'),('/videos/','stream'),('/guides/','ice')]:
        pages[path]['body']='<div class="collection-photo">'+photo(key,eager=True)+'</div>'+pages[path]['body']
    trip_by_path={t.get('canonicalPath','/trips/'+t['id']+'/'):t for t in trips}
    def hero_for(path, trip):
        # A trip uses its own scene; any other article uses the scene made for that page, then a scene matched to its topic.
        if trip:
            return trip_photo(trip, eager=True)
        if PREVIEWS.get(path) and available(PREVIEWS[path]):
            return preview_photo(path, eager=True)
        words=path.lower()
        for needle,key in (('ice','ice'),('surf','surf-beach'),('offshore','coast'),('reef','coast'),('flat','tropical-flats'),('mangrove','inshore'),('estuar','inshore'),('salt','inshore'),('inshore','inshore'),('alpine','northern-lake'),('lake','northern-lake'),('river','stream'),('stream','stream'),('spring','stream'),('trout','stream'),('fly','stream')):
            if needle in words:
                return photo(key, eager=True)
        return photo('hero', eager=True)
    for path,p in pages.items():
        if p['kind']=='article' and not p.get('redirectTo'):
            # Use environment images as editorial context, never destination evidence.
            image='<figure class="guide-landscape">'+hero_for(path, trip_by_path.get(path))+'</figure>'
            p['body']=image+p['body']
            p.update(trip_metadata(trip_by_path.get(path, {})))
    pages['/about/']['body']+=credits().replace('<section class="section">','<section class="section" id="photo-credits">',1)
    footer=footer.replace('<div class="footer-links">','<div class="footer-links"><div class="footer-tools"><strong>Tools</strong><a href="/tools/weather/">Weather</a><a href="/tools/tides/">Tides</a><a href="/fishing-licenses/">Fishing licenses</a></div><a href="/play/">Play</a><a href="/atlas/">Atlas</a><a href="/trip-types/">Trip styles</a><a href="/local-classics/">Local classics</a><a href="/glossary/">Local glossary</a>')
    footer=footer.replace('Release notes','About').replace('Illustrations are not navigation charts.','Go prepared. Leave the water better.')
    pages['/404/']['body']='<section class="lost-water">'+photo('hero',eager=True)+'<div class="wrap"><span class="eyebrow">404 / OFF THE CHART</span><h1>A little off course.</h1><p>There is still good water ahead.</p><a class="quiet-button" href="/">Find your way home ↗</a></div></section>'
    return header,footer
