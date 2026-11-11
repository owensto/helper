"""Motion markup uses the same authored catalog as the planner and trip pages."""
import json
from html import escape as E
from photography import photo

def install(pages, root, trips, featured, trip_card):
    data=json.loads((root/'src/compiled-data.json').read_text())
    home=pages['/']['body']
    home=home.replace('<div class="hero-shade"></div>', '<div class="hero-shade"></div><div class="hero-caustics" aria-hidden="true"></div>')
    start=home.index('<section class="water-story">'); end=home.index('<section class="section featured-trips">',start)
    sequence='<div class="water-sequence"><div class="sequence-stage">'+home[start:end]+'<nav class="sequence-nav" aria-label="Water stories">'+''.join(f'<button type="button" data-water-step="{i}"><span>0{i+1}</span> {name}</button>' for i,name in enumerate(['Inshore','Offshore','Rivers','Ice']))+'</nav></div></div>'
    home=home[:start]+sequence+home[end:]
    end=home.index('<section class="wrap section watch-section"')
    start=home.index('<section class="section featured-trips">')
    chosen=[]
    for t in featured+trips:
        if t['id'] not in {x['id'] for x in chosen} and t.get('contentTier')!='preparation-brief':chosen.append(t)
        if len(chosen)==8:break
    band='<section class="section featured-trips trip-band"><div class="wrap"><div class="section-head"><div><span class="eyebrow">A CHANGE OF SCENERY</span><h2>A place to begin.</h2></div><div class="band-controls"><button type="button" data-trip-step="-1" aria-label="Previous trips">←</button><button type="button" data-trip-step="1" aria-label="Next trips">→</button><a class="link" href="/trips/">All trips ↗</a></div></div><div class="trip-band-window"><div class="world-grid trip-band-track">'+''.join(trip_card(t) for t in chosen)+'</div></div><p class="photo-note">Illustrative scenes. Read each guide for destination details.</p></div></section>'
    home=home[:start]+band+home[end:]
    # Countries and jurisdictions are deliberately not presented as sovereign countries.
    countries=len({t['country'] for t in trips})
    metrics=[(len(data['destinations']),'planner destinations','/trips/'),(countries,'country & jurisdiction collections','/countries/')]
    counts='<div class="atlas-counts">'+''.join(f'<a href="{url}" aria-label="{n} {label}"><b data-count="{n}" aria-hidden="true">{n}</b><span>{label}</span></a>' for n,label,url in metrics)+'</div>'
    # A stylized, decorative atlas; named links provide the meaningful destination access.
    atlas='''<section class="atlas-journey wrap"><div class="section-head"><div><span class="eyebrow">THE ATLAS, OPEN</span><h2>One world.<br>More water.</h2></div><p>Start nearby. Follow your curiosity.<br>Every place starts with a plan.</p></div><div class="atlas-art" aria-hidden="true"><svg viewBox="0 0 1000 450" fill="none"><defs><pattern id="atlas-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" stroke="currentColor" stroke-opacity=".1"/></pattern></defs><rect width="1000" height="450" fill="url(#atlas-grid)"/><g class="atlas-land" fill="currentColor" opacity=".14"><path d="M80 90l90-40 105 15 35 42-45 63-35 13-23 69-51-44-10-57-57-20zM228 252l60 3 48 63-24 68-35 31-18-80zM395 35l73 4-9 52-39 22-28-33zM460 124l58-43 47 23 19 42-60 27-45-14zM490 181l80-18 54 50-35 105-32 37-24-69-56-50zM559 92l108-39 125 19 120 50-24 44-97 10-31 52-36 40-37-66-86-23zM775 319l79-28 67 53-24 42-97-5zM932 363l18-8-4 43-16 13z"/></g><g class="atlas-routes" stroke="currentColor" stroke-width="1.5"><path d="M179 126Q181 190 247 220" pathLength="1"/><path d="M247 220Q350 36 500 137" pathLength="1"/><path d="M500 137Q725 97 860 333" pathLength="1"/></g>'''+''.join(f'<g class="atlas-pin" style="--pin-delay:{i*.12}s"><circle class="pin-halo" cx="{x}" cy="{y}" r="14"/><circle cx="{x}" cy="{y}" r="4" fill="currentColor"/></g>' for i,(x,y) in enumerate([(179,126),(247,220),(500,137),(860,333)]))+'''</svg></div><div class="atlas-destinations"><a href="/trips/?q=Alaska">Alaska ↗</a><a href="/trips/?q=Florida">Florida ↗</a><a href="/trips/?q=Norway">Norway ↗</a><a href="/trips/?q=Australia">Australia ↗</a></div><p class="photo-note">Illustrated connections, not navigation routes. Coverage and research depth vary.</p>'''+counts+'</section>'
    home=home.replace('<section class="region-band wrap">',atlas+'<section class="region-band wrap">')
    pages['/']['body']=home
    # Add factual reading aids only to known trip records, without turning candidates into verified species.
    for t in trips:
        path=t.get('canonicalPath','/trips/'+t['id']+'/');p=pages.get(path)
        if not p or p.get('redirectTo'):continue
        fish=t.get('fish') or []
        if isinstance(fish,str):fish=[fish]
        season='Documented season' if t.get('seasonWindows') else 'Season: confirm locally'
        labels=fish[:3] if t.get('contentTier')!='preparation-brief' else []
        body=p['body']
        if 'trip-reading-chips' in body:continue
        marker='<h2>When this trip makes sense.</h2>'
        season_anchor=''
        if marker in body:
            season_anchor='trip-season'
            body=body.replace(marker,'<h2 id="trip-season">When this trip makes sense.</h2>',1)
        else:
            sections=t.get('planningGuide',{}).get('sections',[])
            section=next((s for s in sections if any(word in s['title'].lower() for word in ['season','when'])),None)
            if section and 'id="'+section['id']+'"' in body:season_anchor=section['id']
        season_chip=('<a class="trip-chip" href="#'+E(season_anchor,quote=True)+'">'+season+' ↓</a>') if season_anchor else '<span class="trip-chip">'+season+'</span>'
        chips='<nav class="trip-reading-chips" aria-label="Trip reading shortcuts"><div class="wrap"><span class="chip-label">FIELD NOTES</span>'+''.join('<span class="trip-chip">'+E(x)+'</span>' for x in labels)+season_chip+'<a class="trip-chip" href="/disclaimer/">Safety ↗</a></div></nav>'
        pos=body.find('</figure>')
        if pos>=0:body=body[:pos+9]+chips+body[pos+9:]
        elif '<section class="section article-section">' in body:
            body=body.replace('<section class="section article-section">',chips+'<section class="section article-section">',1)
        else:body=chips+body
        p['body']=body
