"""Outdoor editorial presentation; route and evidence records stay with the atlas."""
from photography import photo, credits, water_photo
from urllib.parse import urlencode

def install(pages, root, header, footer, brand, featured, trip_card, trips):
    header=f'''<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner">{brand}<nav class="nav" id="site-nav" aria-label="Main navigation"><a href="/trips/">Trips</a><a href="/environments/">Waters</a><a href="/guides/">Field guides</a><a href="/videos/">Films</a><a class="mobile-plan" href="/plan/">My fishing plan</a></nav><div class="header-action"><a class="plan-link" href="/plan/">My fishing plan</a><button class="search-toggle" type="button" aria-label="Search trips" aria-haspopup="dialog"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></svg></button><button class="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="site-nav" data-action="menu">☰</button></div></div></header><dialog id="search-dialog" aria-labelledby="search-title"><button class="search-close" aria-label="Close search" type="button">✕</button><h2 id="search-title">Find your water.</h2><form action="/trips/" method="get"><label for="header-search">A place, a fish, a kind of water</label><div><input id="header-search" name="q" type="search" placeholder="Where will you go?"><button class="btn" type="submit">Search</button></div></form></dialog>'''
    old=pages['/']['body'];films=old[old.index('<section class="wrap section watch-section"'):]
    films=films.replace('<h2>Watch</h2>','<h2>Castward Films</h2>').replace('Short animated fishing stories. Find the guide behind each film.','Short animated stories from a life around water.')
    home='<section class="outdoor-hero">'+photo('coast',eager=True)+'<div class="hero-shade"></div><div class="wrap outdoor-hero-copy"><h1>Out there.<br>On the water.</h1><p>Find a place to fish. Make a plan to go.</p><a class="quiet-button" href="/trips/">Explore the trips <span aria-hidden="true">↗</span></a></div></section>'
    home+='<section class="outdoor-intro wrap"><p>Some days belong outside.</p><h2>Follow the water.</h2><p>From a quiet river bend to the open sea.</p></section>'
    for key,title,line,habitat in [('inshore','Inshore','Stay close to the edge. Explore the shallows.','Estuaries & mangroves'),('coast','Offshore','Beyond the shoreline. Into open water.','Offshore'),('stream','Rivers & streams','Take the long way upstream.','Rivers & streams'),('ice','Ice','A quieter kind of winter.','Ice fishing')]:
        home+='<section class="water-story">'+photo(key)+'<div class="wrap story-copy"><h2>'+title+'</h2><div><p>'+line+'</p><a class="link" href="/trips/?'+urlencode({'habitat':habitat})+'">Explore '+title.lower()+' ↗</a></div></div></section>'
    selected=[t for t in featured if t.get('planId') in ['US-NC-002','US-GA-002','US-FL-001']]
    home+='<section class="section featured-trips"><div class="wrap"><div class="section-head"><h2>A place to begin.</h2><a class="link" href="/trips/">All trips ↗</a></div><div class="world-grid">'+''.join(trip_card(t) for t in selected)+'</div><p class="photo-note">Photographs show representative waters. Read each guide for destination details.</p></div></section>'+films
    home+='<section class="region-band wrap"><h2>Near. Far. Yours to find.</h2><div><a href="/north-america/">North America <span>↗</span></a><a href="/continents/">World atlas <span>↗</span></a></div></section>'
    pages['/']['body']=home
    pages['/']['photoPreload']='<link rel="preload" as="image" href="/media/photos/coast-1280.webp" imagesrcset="/media/photos/coast-640.webp 640w, /media/photos/coast-1280.webp 1280w, /media/photos/coast-2200.webp 2200w" imagesizes="100vw" fetchpriority="high">'
    for path,key in [('/trips/','river'),('/videos/','stream'),('/guides/','ice')]:
        pages[path]['body']='<div class="collection-photo">'+photo(key,eager=True)+'</div>'+pages[path]['body']
    trip_by_path={t.get('canonicalPath','/trips/'+t['id']+'/'):t for t in trips}
    for path,p in pages.items():
        if p['kind']=='article' and not p.get('redirectTo'):
            # Use environment images as editorial context, never destination evidence.
            image='<figure class="guide-landscape">'+photo(water_photo(trip_by_path.get(path,{})), eager=True)+'<figcaption>A water study. Representative scenery, not the named destination. <a href="/about/#photo-credits">Photo credits</a></figcaption></figure>'
            p['body']=image+p['body']
    pages['/about/']['body']+=credits().replace('<section class="section">','<section class="section" id="photo-credits">',1)
    footer=footer.replace('Release notes','About &amp; photo credits').replace('Illustrations are not navigation charts.','Go prepared. Leave the water better.')
    return header,footer
