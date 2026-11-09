"""World edition: source-backed articles, multidimensional discovery and trip kits.

Executed in build.py's namespace after the retained starter routes have rendered.
Only authored records become articles; filters never generate combination pages.
"""
from collections import Counter
from urllib.parse import urlencode

WORLD=json.loads((ROOT/'src/world.json').read_text())
TRIPS=WORLD['trips']; HABITATS=WORLD['habitats']; SOURCES=WORLD['sources']
TBY={t['id']:t for t in TRIPS}; HBY={h['name']:h for h in HABITATS}
REGIONS=['North America','South America','Europe','Africa','Asia','Oceania']
DISPLAY_TRIPS=[]
regional_queues=[[t for t in TRIPS if t['region']==r] for r in REGIONS]
for slot in range(max(map(len,regional_queues))):
    DISPLAY_TRIPS.extend(q[slot] for q in regional_queues if slot<len(q))
MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
COUNTRIES=sorted({t['country'] for t in TRIPS})
SLUG=lambda s:re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
DATE='September 13, 2026'
COVERAGE=WORLD['coverage']
N=len(TRIPS); DETAIL=sum(t.get('contentTier')=='detailed-guide' for t in TRIPS); BRIEFS=N-DETAIL
COLLECTIONS=len(COUNTRIES)

DATA['edition']=WORLD['edition']
DATA['world']={'trips':TRIPS,'habitats':HABITATS,'sources':SOURCES,'reviewed':WORLD['reviewed']}
DATA['styleLabels']={'bank':'Bank / shore','guidedwade':'Guided wading','skiff':'Skiff','hike':'Hike-in / bank','ice':'Guided ice','guidedboat':'Guided boat','charter':'Charter boat','float':'River float'}
for sid,s in SOURCES.items():
    DATA['sources']['world-'+sid]={'label':s['title'],'url':s['url']}
access_map={'Bank':'bank','River float':'float','Charter boat':'charter','Guided boat':'guidedboat','Guided wading':'guidedwade','Skiff':'skiff','Hike-in':'hike','Guided ice':'ice'}
for t in TRIPS:
    s=SOURCES[t['sourceIds'][0]] if t['sourceIds'] else {'title':'Open research and trip questions','url':'/production/north-america/'}
    # Research resources are not portrayed as booked/vetted operator inventory.
    DATA['destinations'].append({'id':t['id'],'name':t['title'].split(':')[0], 'region':t['country'], 'species':t['fish'],
      'styles':[access_map[x] for x in t['access']], 'defaultStyle':access_map[t['access'][0]],'climate':t['climate'],
      'tripProfile':t['id'],'technicalGear':True,'guideUrl':t.get('canonicalPath','/trips/'+t['id']+'/'), 'seasonNote':t['season'],
      'seasonWindows':t.get('seasonWindows',[]),
      'operator':{'name':s['title'],'type':'Research source' if t['sourceIds'] else 'Research pending','url':s['url'],'note':'A research resource, not a booked trip or Atlas operator partnership. Confirm all inclusions and availability independently.'}})
    for i,k in enumerate(t['kit']):
        DATA['gear'].append({'id':t['id']+'-kit-'+str(i+1),'name':k['name'],
          'group':'Trip-specific decisions','why':k['specification']+' '+k['why'],
          'query':k.get('query',''),'essential':k['decision']!='optional','scope':'trip','tripId':t['id'],'qty':'one',
          'confirm':k['decision']=='confirm','decision':k['decision']})

# Populate existing planner and sharing forms with all trip profiles.
options='<optgroup label="Original broad trip profiles">'+''.join(f'<option value="{d["id"]}">{E(d["name"])}</option>' for d in DATA['destinations'][:3])+'</optgroup>'
for r in REGIONS:
    options+=f'<optgroup label="{E(r)}">'+''.join(f'<option value="{t["id"]}">{E(t["title"].split(":")[0])} · {E(t["country"])}</option>' for t in TRIPS if t['region']==r)+'</optgroup>'
for p in pages.values():
    p['body']=re.sub(r'(<select\b[^>]*\bname="destination"[^>]*>).*?(</select>)',lambda m:m.group(1)+options+m.group(2),p['body'],flags=re.S)

HEADER=f'<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner">{BRAND}<nav class="nav" id="site-nav" aria-label="Main navigation"><a href="/trips/">Explore trips</a><a href="/countries/">Countries</a><a href="/environments/">Types of water</a><a href="/species/">Find your fish</a><a href="/research/">Research desk</a></nav><div class="header-action"><span class="edition">GLOBAL EDITION / 003</span><a class="btn small" href="/plan/">My fishing plan ↗</a><button class="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="site-nav" data-action="menu">☰</button></div></div></header>'
FOOTER=f'<footer class="site-footer"><div class="wrap"><div class="footer-top"><div>{BRAND}<p class="footer-desc">Different waters. Different seasons. Different ways to fish. Research first; buy what your actual trip needs.</p></div><div class="footer-links"><a href="/trips/">Explore trips</a><a href="/environments/">Environment guides</a><a href="/guides/">Preparation library</a><a href="/seasons/">Seasonal evidence</a><a href="/for-guides/">For operators</a><a href="/research/">Sources &amp; quality</a><a href="/about/">Release notes</a></div></div><div class="footer-bottom"><span>© 2026 Fishing Atlas · Working name · Edition 003</span><span>{len(TRIPS)} trip profiles · {len(COUNTRIES)} country / jurisdiction collections · Coverage is not exhaustive.</span><span>Map illustrations are decorative, not navigation charts.</span></div></div></footer><div id="toast" class="toast" role="status" aria-live="polite"></div>'

def source_link(sid, label=None):
    s=SOURCES[sid]
    return f'<a class="evidence-link" href="{E(s["url"],quote=True)}" target="_blank" rel="noopener noreferrer">{E(label or s["title"])} ↗</a>'

def evidence_block(evidence,technique=None):
    out='<section class="evidence-panel"><span class="eyebrow">WHAT THE RESEARCH ESTABLISHES</span>'
    if not evidence: out+='<p>No local fishery claims have been source-checked for this preparation brief. Its access, methods and target list are research candidates, not confirmed recommendations.</p>'
    for n,e in enumerate(evidence,1):
        out+=f'<div class="evidence-item"><p>{E(e["claim"])}</p>{source_link(e["source"])}</div>'
    if technique:out+=f'<div class="evidence-item"><p>{E(technique["text"])}</p>{source_link(technique["source"])}</div>'
    return out+'</section>'

def review_line(count,trip=None):
    status='Detailed guide · source text inspected' if trip is None or trip.get('contentTier')=='detailed-guide' else 'Trip brief · '+trip.get('evidenceDepth','source-linked')
    if trip and trip.get('contentTier')=='preparation-brief': status='Preparation brief · local research pending'
    return f'<div class="review-line"><span class="review-dot"></span><span>{E(status)} · {DATE}</span><span>{count} reference{"s" if count!=1 else ""}</span><span>Not independently expert-reviewed</span></div>' 

def refs_block(ids):
    unique=list(dict.fromkeys(ids))
    if not unique: return '<section class="reference-foot"><h2>Research still to complete</h2><p>The source leads in the production queue have not been inspected for this location. This page is a preparation framework, not a sourced destination recommendation. Candidate species, access and dates need local verification.</p><a class="link" href="/production/north-america/">Open the research queue ↗</a></section>'
    return '<section class="reference-foot"><h2>Sources &amp; review notes</h2><p>The linked sources support the attributed claims above. The setup and preparation sections are editorial decision guidance, not a personal field test. Local conditions, availability and exact equipment still require confirmation.</p>'+''.join(f'<div class="reference-row">{source_link(sid)}<span>{E(SOURCES[sid]["type"].replace("-"," "))} · {E(SOURCES[sid].get("status","text-inspected").replace("-"," "))} · {DATE}</span>'+ (f'<p>{E(SOURCES[sid]["scopeNote"])}</p>' if SOURCES[sid]['scopeNote'] else '')+'</div>' for sid in unique)+'<p class="small">Product searches are not exact-model endorsements. No current prices or stock are asserted. <a class="link" href="/research/">Inspect the research standard ↗</a></p></section>'

def trip_card(t):
    windows=','.join(str(m) for m in sorted({m for w in t.get('seasonWindows',[]) for m in w['months']}))
    attrs={'depth':t.get('contentTier','detailed-guide'),'region':t['region'],'country':t['country'],'water':t['water'],'habitat':'|'.join(t['habitats']),'method':'|'.join(t['methods']),'month':windows,'state':t.get('state',''),'subregion':t.get('subregion',''),'search':' '.join([t.get('candidateTargets',''),t.get('state',''),t.get('subregion',''),t['title'],t['place'],t['country'],t['region'],*t['fish'],*t['habitats'],*t['landscape'],*t['methods']])}
    attr=' '.join(f'data-{k}="{E(v,quote=True)}"' for k,v in attrs.items())
    tier={'detailed-guide':'Source-checked guide','trip-brief':'Source-linked brief','preparation-brief':'Preparation · research pending'}.get(t.get('contentTier'),'Trip profile')
    glyph='≈' if t['water']=='Saltwater' else '⌁' if t['water']=='Freshwater' else '⋈'
    return f'<article class="world-card" data-trip-card {attr}><div class="world-card-top"><span class="water-glyph" aria-hidden="true">{glyph}</span><span class="eyebrow">{E(t["country"])} / {E(t["water"])}</span><span class="depth-pill">{tier}</span></div><h3><a href="{E(t.get("canonicalPath","/trips/"+t["id"]+"/"),quote=True)}">{E(t["title"])}</a></h3><p>{E(t["summary"])}</p><div class="tag-row">'+''.join(f'<span class="pill">{E(h)}</span>' for h in t['habitats'])+f'</div><div class="world-card-bottom"><span>{E(' · '.join(t['fish'][:2]) or ('Targets to verify: '+t.get('candidateTargets','')))}</span><a href="{E(t.get("canonicalPath","/trips/"+t["id"]+"/"),quote=True)}" aria-label="Read {E(t["title"],quote=True)}">Open trip ↗</a></div></article>'

def habitat_card(h):
    n=sum(h['name'] in t['habitats'] for t in TRIPS)
    return f'<a class="habitat-card" href="/environments/{h["id"]}/"><span class="eyebrow">{n} LINKED TRIP GUIDE{"S" if n!=1 else ""}</span><h3>{E(h["name"])}</h3><p>{E(h["summary"])}</p><span class="link">Understand this water ↗</span></a>'

def filters():
    fields=[('region','Region',REGIONS),('water','Water type',['Freshwater','Saltwater','Brackish','To confirm']),('habitat','Environment',[h['name'] for h in HABITATS]),('method','Method',sorted({m for t in TRIPS for m in t['methods']})),('country','Country / jurisdiction',COUNTRIES),('state','State / province',sorted({t['state'] for t in TRIPS if t.get('state')})),('subregion','Editorial region',sorted({t['subregion'] for t in TRIPS if t.get('subregion')}))]
    out='<div class="library-filter" data-library-filter><label class="filter-search"><span>Search place, species or trip</span><input id="trip-search" type="search" placeholder="Try glacier, permit, Japan or alpine" autocomplete="off"></label>'
    for key,label,values in fields:
        out+=f'<label><span>{label}</span><select id="filter-{key}" data-library-select="{key}"><option value="">All {label.lower()}s</option>'+''.join(f'<option value="{E(v,quote=True)}">{E(v)}</option>' for v in values)+'</select></label>'
    out+='<label><span>Research depth</span><select id="filter-depth" data-library-select="depth"><option value="">All profiles</option><option value="detailed-guide">Detailed guides</option><option value="trip-brief">Source-linked briefs</option><option value="preparation-brief">Preparation briefs · research pending</option></select></label>'
    out+='<label><span>Documented seasonal window</span><select id="filter-month" data-library-select="month"><option value="">Any / not specified</option>'+''.join(f'<option value="{i}">{m}</option>' for i,m in enumerate(MONTHS,1))+'</select></label><button type="button" class="btn outline" data-action="clear-library">Clear filters</button></div>'
    return out+f'<div class="library-status"><p id="trip-count" role="status" aria-live="polite">{len(TRIPS)} trip profiles</p><a href="/seasons/">How seasonal filtering works ↗</a></div><p class="season-filter-note" id="season-filter-note" hidden>This filter finds only documented windows in this edition. Missing results do not mean fishing is unavailable. Partial months, operator-specific opportunities and historical guidance retain their qualifications in each guide.</p>'

# Trip library is the primary discovery surface. Destination page is a geography hub, not a duplicated article.
library=bread('Explore trips')+intro('WORLD ATLAS / RESEARCHED TRIP LIBRARY','Find your kind of fishing.','Search across location-specific guides and preparation frameworks. Research depth is visible: not every profile has verified species, dates or access. Start with your country, state, environment or method.')+'<section class="section library-section"><div class="wrap">'+filters()+'<div class="world-grid" id="trip-grid">'+''.join(trip_card(t) for t in DISPLAY_TRIPS)+'</div><div class="library-pagination"><button class="btn outline" type="button" data-action="more-trips" id="load-more-trips">Show more trips</button><span id="trip-page-status" class="small muted"></span></div><div class="empty panel" id="trip-empty" hidden><h2>No researched match yet.</h2><p>Try fewer filters. This edition does not cover every fishery; an empty result is a coverage gap, not a claim that the trip does not exist.</p><a class="link" href="/research/">View the expansion queue ↗</a></div></div></section>'
add('/trips/','Fishing trip guides by environment, species and region | Fishing Atlas',f'Explore {N} fishing trip profiles across {COLLECTIONS} country and jurisdiction collections. Filter water type, habitat, method, research depth and documented seasons.',library,'library')

# Homepage: research-led discovery, not a three-destination shopping funnel.
featured_ids=['andros-bonefish','tanana-glacial-system','norway-skrei','rio-negro-peacock','rocky-mountain-alpine','cosmoledo-gt']
home=f'''<section class="hero world-hero"><div class="hero-visual">{contour('hero')}</div><div class="wrap"><span class="eyebrow">GLOBAL EDITION / 003 · BUILT AROUND THE WATER</span><h1>Different waters.<br><em>A better way to fish them.</em></h1><p class="hero-desc">From mountain lakes to tropical flats, start with a researched guide. Understand the season, choose a method, and build a gear list for your actual trip.</p><form class="world-search" data-form="world-search"><label class="sr-only" for="home-world-search">Search the fishing atlas</label><input id="home-world-search" name="q" type="search" placeholder="A place, fish or kind of water…"><button class="btn lime" type="submit">Explore the atlas ↗</button></form><div class="hero-shortcuts"><a href="/trips/?water=Freshwater">Freshwater ↗</a><a href="/trips/?water=Saltwater">Saltwater ↗</a><a href="/environments/glacier-influenced/">Glacier-influenced rivers ↗</a><a href="/seasons/">Plan by season ↗</a></div><div class="world-metrics"><div><b>{len(TRIPS)}</b><span>trip profiles</span></div><div><b>{len(HABITATS)}</b><span>environment guides</span></div><div><b>{len(COUNTRIES)}</b><span>country collections</span></div><div><b>{len(SOURCES)}</b><span>inspected source records</span></div></div></div></section>'''
home+='<section class="section soft"><div class="wrap coverage-strip"><div><span class="eyebrow">GLOBAL CATALOG</span><h2>'+str(N)+' trip profiles. '+str(COLLECTIONS)+' country collections.</h2><p>'+str(DETAIL)+' detailed guides and '+str(BRIEFS)+' source-linked briefs, with visible research depth.</p></div><a class="btn outline" href="/countries/">Browse countries ↗</a></div></section>'
home+='<section class="section"><div class="wrap"><div class="section-head"><div><span class="eyebrow">START WITH THE ENVIRONMENT</span><h2>One atlas. Not one template.</h2></div><p>Saltwater is a water type. Offshore is a setting. Fly fishing is a method. Keep those decisions separate.</p></div><div class="habitat-grid">'+''.join(habitat_card(h) for h in HABITATS)+'</div></div></section>'
home+='<section class="section soft"><div class="wrap"><div class="section-head"><div><span class="eyebrow">ACROSS THE WORLD</span><h2>Real differences, useful detail.</h2></div><a class="link" href="/trips/">Explore all 309 trip profiles ↗</a></div><div class="world-grid">'+''.join(trip_card(TBY[i]) for i in featured_ids)+'</div></div></section>'
home+='<section class="section"><div class="wrap editorial-split"><div><span class="eyebrow">RESEARCH → DECISIONS → PREPARATION</span><h2>Gear follows the fishing.<br>Not the other way around.</h2><p class="spaced">A winter cod charter, a spring-fed grayling stream and a tropical flats trip do not share one universal shopping list. Each trip guide adds specific equipment decisions to your saved plan.</p><a class="btn spaced" href="/plan/">Build my preparation list ↗</a></div><div class="panel"><span class="eyebrow">QUALITY YOU CAN INSPECT</span><h3 class="spaced">Show the evidence. Keep the uncertainty.</h3><p class="spaced">Sourced facts are separated from editorial advice. Every guide shows its references and review status. Historical observations stay historical; missing seasonal data stays unknown.</p><p>Source-checked does not mean field-tested, expert-approved or live. Exact product reviews and current booking inventory are not part of this release.</p><a class="link spaced" href="/research/">Open the research desk ↗</a></div></div></section>'
add('/','Fishing Atlas | Research the water. Plan the trip. Go prepared.','Research fishing trips across freshwater, saltwater, rivers, lakes, flats, offshore and ice. Source-backed guides and trip-specific equipment decisions.',home,'home')

# Environment guides: substantive authored chapters, not filter landing-page permutations.
envhub=bread('Types of water')+intro('ENVIRONMENT LIBRARY','The water changes the plan.','Learn how environment, access, method and season interact. These chapters connect to specific researched trips around the world.')+'<section class="section library-section"><div class="wrap"><div class="taxonomy-note"><b>Not a flat list of trip types.</b> Water type → environment → landscape → species → method → access → seasonal opportunity. A glacier-influenced river can be freshwater, mountainous, boat-accessed and fished with lures—all at once.</div><div class="habitat-grid">'+''.join(habitat_card(h) for h in HABITATS)+'</div></div></section>'
add('/environments/','Fishing environments: freshwater, saltwater, rivers, flats and more | Fishing Atlas','Twelve researched fishing environment guides connect water type, landscape, technique and access to real trip examples.',envhub,'environment-hub')
for h in HABITATS:
    ids=list(dict.fromkeys(e['source'] for e in h['evidence']))
    links=[t for t in TRIPS if h['name'] in t['habitats']]
    body=bread(h['name'],('/environments/','Types of water'))+intro('ENVIRONMENT GUIDE',E(h['name']),E(h['summary']))
    body+='<div class="wrap">'+review_line(len(ids))+'</div><section class="section article-section"><div class="wrap article-layout"><div class="article-main">'+evidence_block(h['evidence'])
    body+=''.join(f'<section class="prose-block"><h2>{E(s["title"])}</h2><p>{E(s["text"])}</p></section>' for s in h['sections'])
    body+=refs_block(ids)+'</div><aside class="article-aside"><div class="panel"><span class="eyebrow">FIVE DECISIONS TO MAKE</span><ol class="decision-list">'+''.join(f'<li>{E(c)}</li>' for c in h['checklist'])+'</ol><p class="small">The environment narrows the question. A named water and seasonal assessment are still necessary.</p><a class="btn spaced" href="/trips/?'+urlencode({'habitat':h['name']})+'">Find matching trips ↗</a></div></aside></div></section>'
    body+='<section class="section soft"><div class="wrap"><div class="section-head"><div><span class="eyebrow">PUT THE ENVIRONMENT IN CONTEXT</span><h2>Related trip guides.</h2></div></div><div class="world-grid">'+''.join(trip_card(t) for t in links)+'</div></div></section>'
    add('/environments/'+h['id']+'/',h['title']+' | Fishing Atlas',h['summary'],body,'article')

# Local trip guides: attributed evidence -> seasonal context -> original planning -> specific kit.
for t in TRIPS:
    related=[TBY[i] for i in t['related'] if i in TBY]
    body=bread(t['place'],('/trips/','Trip guides'))+intro(E(t['region']+' / '+t['country']),E(t['title']),E(t['summary']))
    body+='<div class="wrap">'+review_line(len(set(t['sourceIds'])),t)+'<div class="trip-facts">'+''.join(f'<div><span>{E(label)}</span><b>{E(value)}</b></div>' for label,value in [('Water',t['water']),('Environment',' · '.join(t['habitats'])),('Method',' · '.join(t['methods'])),('Access',' · '.join(t['access']))])+'</div></div>'
    if t.get('contentTier')=='preparation-brief':
        body+='<div class="wrap"><div class="brief-note"><b>Preparation framework — local research is not complete.</b> Target candidates: '+E(t.get('candidateTargets','Not yet established'))+'. The water, method and access labels describe the editorial scenario to investigate, not a verified trip. No seasonal recommendation or bookable inventory is asserted.</div></div>'
    if t.get('contentTier')=='trip-brief':
        body+='<div class="wrap"><div class="brief-note"><b>Trip brief, not a complete destination guide.</b> '+E(t['evidenceDepth'])+'. The named trip has a source reference; seasonal detail, local access and exact gear still need deeper review. '+E(t.get('availabilityNote',''))+'</div></div>'
    body+='<section class="section article-section"><div class="wrap article-layout"><div class="article-main">'+evidence_block(t['evidence'],t.get('techniqueNote'))
    body+=f'<section class="prose-block"><span class="eyebrow">SEASONAL CONTEXT, NOT A CATCH FORECAST</span><h2>When this trip makes sense.</h2><p>{E(t["season"])}</p>'
    if t.get('seasonWindows'):
        for win in t['seasonWindows']:
            body+='<div class="season-window"><div class="month-strip" aria-label="Documented months">'+''.join(f'<span class="{"documented" if i in win["months"] else "unknown"}" title="{m}: {"documented reference" if i in win["months"] else "not established here"}">{m[:3]}</span>' for i,m in enumerate(MONTHS,1))+'</div><p>'+E(win['label'])+'. Unhighlighted months mean “not established here,” not “no fishing.”</p>'+source_link(win['source'])+'</div>'
    else:body+='<p class="editorial-note">A reliable month-by-month ranking is not established in this edition. No “best month” score has been invented.</p>'
    body+='</section>'+''.join(f'<section class="prose-block"><h2>{E(s["title"])}</h2><p>{E(s["text"])}</p></section>' for s in t['sections'])
    body+='<section class="prose-block"><span class="eyebrow">EQUIPMENT DECISIONS / NOT A UNIVERSAL KIT</span><h2>What this trip needs.</h2><p>Start with suitability and operator provision. These are requirements and category-level shopping options—not exact-model reviews or a promise that a search result will fit.</p><div class="trip-kit">'
    for i,k in enumerate(t['kit'],1):
        query=k.get('query'); url='https://www.amazon.com/s?'+urlencode({'k':query,**({'tag':CONFIG['amazonTag']} if CONFIG['amazonTag'] else {})}) if query else None
        shopping=f'<a class="category-link" href="{E(url,quote=True)}" target="_blank" rel="sponsored noopener noreferrer" data-outbound="shopping" data-item="{t["id"]}-kit-{i}">Compare this category on Amazon ↗</a>' if url else '<span class="small muted">Confirm the specification before choosing a product.</span>'
        body+=f'<div class="kit-decision"><div class="kit-number">{i:02d}</div><div><span class="eyebrow">{E(k["decision"].replace("confirm","CONFIRM FIRST").replace("consider","CONSIDER AFTER CHECKING").replace("optional","OPTIONAL"))}</span><h3>{E(k["name"])}</h3><p><b>{E(k["specification"])}</b></p><p>{E(k["why"])}</p>{shopping}</div></div>'
    body+='</div><div class="shopping-disclosure">Shopping links are category searches, not vetted product selections. '+('As an Amazon Associate I earn from qualifying purchases.' if CONFIG['amazonTag'] else 'No affiliate tracking tag is configured in this preview.')+'</div></section>'
    body+='<section class="prose-block"><h2>Mistakes to avoid.</h2><div class="mistake-list">'+''.join(f'<p>{E(m)}</p>' for m in t['mistakes'])+'</div></section>'+refs_block(t['sourceIds'])+'</div>'
    body+=f'<aside class="article-aside"><div class="panel plan-cta"><span class="eyebrow">TURN RESEARCH INTO A PLAN</span><h3>{E(t["place"])}</h3><p class="spaced">Mark what you own, confirm what is provided and keep the remaining equipment decisions together.</p><a class="btn" href="/plan/?destination={t["id"]}">Customize this trip ↗</a><span class="small muted">Local browser saving · no booking created</span></div><div class="panel"><span class="eyebrow">QUESTIONS FOR THE LOCAL EXPERT</span><ol class="decision-list">'+''.join(f'<li>{E(q)}</li>' for q in t['questions'])+'</ol></div><div class="panel"><span class="eyebrow">UNDERSTAND THE ENVIRONMENT</span>'+''.join(f'<a class="aside-link" href="/environments/{HBY[h]["id"]}/">{E(h)} ↗</a>' for h in t['habitats'] if h in HBY)+'</div></aside></div></section>'
    body+='<section class="section soft"><div class="wrap"><div class="section-head"><div><span class="eyebrow">COMPARE THE DIFFERENCE</span><h2>Another way to fish.</h2></div><a class="link" href="/trips/">All trip guides ↗</a></div><div class="world-grid">'+''.join(trip_card(x) for x in related)+'</div></div></section>'
    add('/trips/'+t['id']+'/',t['title']+' | Fishing Atlas',t['summary'],body,'article',noindex=not t.get('indexEligible',False))

# Region navigation hubs are explicitly navigation, not counted as researched articles.
geo=bread('World regions')+intro('GEOGRAPHY','A world of different fisheries.','Six regional collections connect to individual trip profiles. These are selected examples, not complete country or continent coverage.')+'<section class="section library-section"><div class="wrap region-grid">'
for r in REGIONS:
    ts=[t for t in TRIPS if t['region']==r]
    countries=sorted({t['country'] for t in ts})
    desc=', '.join(countries)
    geo+=f'<a class="region-card panel" href="/regions/{SLUG(r)}/"><span class="eyebrow">{len(ts)} TRIP PROFILES / {len(countries)} COLLECTIONS</span><h2>{r}</h2><p>{E(desc)}</p><span class="link">Explore this collection ↗</span></a>'
    body=bread(r,('/destinations/','World regions'))+intro('REGIONAL COLLECTION',r,'Selected trip profiles from '+desc+'. Coverage is intentionally specific rather than exhaustive.')+'<section class="section library-section"><div class="wrap"><div class="world-grid">'+''.join(trip_card(t) for t in ts)+'</div></div></section>'
    add('/regions/'+SLUG(r)+'/',r+' fishing trip collection | Fishing Atlas','Explore researched fishing trip examples in '+desc+'. Compare environments, methods and seasonal evidence.',body,'region-hub')
geo+='</div></section>'
add('/destinations/','Fishing destinations by world region | Fishing Atlas',f'Six regions connect {N} fishing profiles across {COLLECTIONS} country and jurisdiction collections, with transparent evidence depth.',geo,'region-index')

# Country/jurisdiction collections keep geographic browsing useful at global scale.
countryhub=bread('Countries')+intro('WORLD COVERAGE',str(COLLECTIONS)+' places to start exploring.',str(COVERAGE['countriesExcludingFreeAssociatedStates'])+' countries, plus the Cook Islands and Niue. These are selected fishing opportunities—not complete national inventories.')+'<section class="section library-section"><div class="wrap"><div class="country-jump">'+''.join(f'<a class="pill" href="#country-{SLUG(r)}">{E(r)}</a>' for r in REGIONS)+'</div>'
for region in REGIONS:
    countries=sorted({t['country'] for t in TRIPS if t['region']==region})
    countryhub+=f'<section class="research-section" id="country-{SLUG(region)}"><h2>{E(region)}</h2><div class="country-grid">'
    for country in countries:
        ts=[t for t in TRIPS if t['country']==country];habitats=sorted({h for t in ts for h in t['habitats']});d=sum(t.get('contentTier')=='detailed-guide' for t in ts)
        countryhub+=f'<a class="panel country-card" href="/countries/{SLUG(country)}/"><span class="eyebrow">{len(ts)} TRIP PROFILES</span><h3>{E(country)}</h3><p>{E(" · ".join(habitats[:3]))}</p><span class="link">Explore the collection ↗</span></a>'
        countrybody=bread(country,('/countries/','Countries'))+intro(E(region+' / COUNTRY COLLECTION'),E(country)+' fishing trips',str(len(ts))+' selected trip profiles across '+', '.join(h.lower() for h in habitats)+'. Compare named opportunities and preparation decisions; coverage is not exhaustive.')
        countrybody+='<section class="section library-section"><div class="wrap"><div class="brief-note"><b>'+str(d)+' detailed guides · '+str(len(ts)-d)+' trip briefs.</b> New briefs show whether source text or a search excerpt was inspected. No live availability or local expert review is implied.</div><div class="world-grid">'+''.join(trip_card(t) for t in ts)+'</div><div class="spaced"><a class="btn outline" href="/trips/?'+urlencode({'country':country})+'">Filter these trips ↗</a></div></div></section>'
        add('/countries/'+SLUG(country)+'/',country+' fishing trips, locations and gear planning | Fishing Atlas','Compare '+str(len(ts))+' selected '+country+' fishing trip profiles with source references, methods and personalized preparation lists.',countrybody,'country-hub')
    countryhub+='</div></section>'
countryhub+='</div></section>'
add('/countries/','Fishing trips by country | Fishing Atlas','Explore '+str(COLLECTIONS)+' country and jurisdiction collections of source-linked fishing trips.',countryhub,'country-index')

# Species discovery indexes only what the trip corpus actually supports.
excluded={'Locally confirmed lake fish','Season-dependent coastal fish','Local targets to confirm',' '}
fishnames=sorted({f for t in TRIPS for f in t['fish'] if f not in excluded})
speciesbody=bread('Find your fish')+intro('SPECIES DISCOVERY','Start with what you want to catch.','An index into the researched trip library—not a complete species encyclopedia. Broad group names remain broad; a listing is not a seasonal catch guarantee.')+'<section class="section library-section"><div class="wrap species-index">'
for name in fishnames:
    matches=[t for t in TRIPS if name in t['fish']]
    speciesbody+=f'<section class="species-entry"><h2>{E(name)}</h2><div>'+''.join(f'<a href="{E(t.get("canonicalPath","/trips/"+t["id"]+"/"),quote=True)}">{E(t["place"])} <span>{E(t["country"])} ↗</span></a>' for t in matches)+'</div></section>'
speciesbody+='</div></section>'
add('/species/','Find fishing trips by species | Fishing Atlas','Find researched trip guides by target species, from bonefish and giant trevally to trout, grayling and cod.',speciesbody,'species-index')

# Public seasonal evidence register: no invented universal seasonal heatmap.
seasonbody=bread('Seasonal evidence')+intro('WHEN TO GO / EVIDENCE REGISTER','Seasonal detail, without false precision.','A runoff program, a winter migration and a summer insect opportunity are different kinds of seasonal evidence. The scope of each reference stays visible.')+'<section class="section library-section"><div class="wrap narrow"><div class="note">Dates below are broad source references—not weather forecasts, guaranteed availability, legal opening dates or catch probabilities. A partial month does not become a full-month promise.</div>'
for t in TRIPS:
    for win in t.get('seasonWindows',[]):
        seasonbody+=f'<section class="season-register-row"><span class="eyebrow">{E(t["country"])}</span><h2><a href="{E(t.get("canonicalPath","/trips/"+t["id"]+"/"),quote=True)}">{E(t["title"])}</a></h2><div class="tag-row">'+''.join(f'<span class="pill">{MONTHS[m-1]}</span>' for m in win['months'])+f'</div><p>{E(win["label"])}</p>{source_link(win["source"])}</section>'
seasonbody+='<section class="prose-block"><h2>What remains unknown.</h2><p>The remaining trip guides have qualitative seasonal discussion, but this edition does not establish a dependable month range for them. The planner does not translate missing evidence into a confident recommendation.</p><a class="btn" href="/trips/">Explore all trip guides ↗</a></section></div></section>'
add('/seasons/','Fishing seasons: documented windows and their limits | Fishing Atlas','Inspect source-backed seasonal windows, partial months and historical qualifications before choosing a fishing trip.',seasonbody,'season-register')

# Research desk is an auditable registry, not an invented badge or fabricated expert review.
source_use=Counter()
for t in TRIPS:
    source_use.update(set(t['sourceIds']))
for h in HABITATS:
    source_use.update({e['source'] for e in h['evidence']})
research=bread('Research desk')+intro('QUALITY / PROVENANCE / COVERAGE','Know what each page establishes.','A growing catalog is not the same as a finished encyclopedia. Each trip identifies its evidence, editorial preparation decisions and remaining gaps.')
newsourcecounts=Counter(s.get('status','text-inspected') for k,s in SOURCES.items() if k.startswith('global-'))
research+='<section class="section library-section"><div class="wrap"><div class="quality-grid"><div class="panel"><span class="eyebrow">RETAINED DEPTH</span><h3>'+str(DETAIL)+' detailed trip guides</h3><p>The existing guides keep their longer local discussion, source references and qualified seasonal information. They have not received independent expert sign-off.</p></div><div class="panel"><span class="eyebrow">GLOBAL EXPANSION</span><h3>'+str(BRIEFS)+' source-linked briefs</h3><p>Each adds an explicitly selected place or program, an attributed source statement and an original preparation decision. Many are based on inspected search excerpts, not a complete page review. Shared environment modules are not counted as unique local research.</p></div><div class="panel"><span class="eyebrow">TRACEABLE SOURCES</span><h3>'+str(len(SOURCES))+' source records</h3><p>New sources: '+str(newsourcecounts['search-excerpt-inspected'])+' inspected search excerpts and '+str(newsourcecounts['text-inspected']+newsourcecounts['page-text-inspected'])+' inspected page texts. These records support named claims, not current availability or every equipment suggestion.</p></div></div>'
research+='<section class="research-section"><h2>Coverage, without inflated counts.</h2><p>'+str(N)+' trip profiles across '+str(COVERAGE['countriesExcludingFreeAssociatedStates'])+' countries, plus the Cook Islands and Niue, in six continental regions. Profiles are distinct trip scenarios, not necessarily distinct waterbodies: offshore and flats programs can share one island. Country pages are navigation collections, not additional researched articles.</p><p>A missing country or month means the information has not been established in this edition. It does not mean fishing is absent. No dates, species or destinations are expanded through a keyword cross-product.</p><a class="btn outline" href="/countries/">Browse country coverage ↗</a></section>'
research+='<section class="research-section"><h2>What the checks do—and do not prove.</h2><p>The included tests check stable IDs, source links, profile structure, seasonal references, equipment decisions, routes, filters and planner behavior. They do not establish factual truth or replace field expertise. No live weather, booking inventory or retailer stock feed is connected. Shopping links remain category searches, not exact-model reviews.</p></section>'
research+='<section class="research-section"><h2>Recorded research decisions.</h2><div class="issue-grid">'+''.join(f'<div class="issue-card"><span class="eyebrow">{E(i["severity"])}</span><h3>{E(SOURCES[i["source"]]["title"])}</h3><p>{E(i["issue"])}</p><p><b>Decision:</b> {E(i["decision"])}</p></div>' for i in WORLD['issues'])+'</div></section>'
research+='<section class="research-section"><h2>Source register.</h2><p>Operator pages describe their own programs. Agency and tourism sources have different scopes. An excerpt inspection is explicitly labeled below.</p><div class="source-register">'
for sid,s in SOURCES.items():
    research+=f'<article class="register-entry">{source_link(sid)}<div><span class="pill">{E(s["type"].replace("-"," "))}</span><span>{source_use[sid]} linked profiles · {E(s.get("status","text-inspected").replace("-"," "))} · {DATE}</span></div><p>{E(s.get("scopeNote", ""))}</p></article>'
research+='</div></section><section class="research-section"><h2>Next quality improvements.</h2><div class="backlog-grid">'+''.join(f'<div class="panel"><span class="eyebrow">{E(b["country"])}</span><h3>{E(b["topic"])}</h3><p>{E(b["needed"])}</p></div>' for b in WORLD['backlog'])+'</div></section></div></section>'
add('/research/','Fishing Atlas research desk: source depth, quality and coverage','Inspect source provenance, full-page versus excerpt review, limitations and global fishing coverage.',research,'research')

guidehub=bread('Preparation library')+intro('READ → DECIDE → PREPARE','Research that leads somewhere.','The library has three distinct layers: environment fundamentals, location-specific trip guides and general preparation articles.')+'<section class="section library-section"><div class="wrap"><div class="quality-grid"><a class="panel library-path" href="/environments/"><span class="eyebrow">12 ENVIRONMENT GUIDES</span><h2>Understand the water.</h2><p>Rivers, glacial systems, alpine lakes, flats, reefs, offshore and more.</p><span class="link">Open environment library ↗</span></a><a class="panel library-path" href="/trips/"><span class="eyebrow">309 TRIP PROFILES</span><h2>Choose an actual trip.</h2><p>Named waters, seasonal evidence, methods and specific equipment decisions.</p><span class="link">Explore the trip library ↗</span></a><a class="panel library-path" href="/seasons/"><span class="eyebrow">QUALIFIED SEASONAL REFERENCES</span><h2>Know what dates mean.</h2><p>Distinguish a regional season, an operator program and a particular fishing opportunity.</p><span class="link">Read seasonal evidence ↗</span></a></div><div class="section-head spaced"><div><span class="eyebrow">RETAINED PREPARATION ARTICLES</span><h2>Build a better checklist.</h2></div></div><div class="article-grid">'+''.join(article_card(a) for a in ARTICLES)+'</div></div></section>'
add('/guides/','Fishing guides, environment research and packing articles | Fishing Atlas','Read researched fishing environment guides, location-specific trip guides and practical preparation articles.',guidehub,'guide-index')

about=bread('About this release')+intro('GLOBAL EDITION / 003','A global catalog. A visible depth of research.','Discover a trip, understand what is known, and prepare without unnecessary shopping.')+'<section class="section library-section"><div class="wrap narrow prose"><section><h2>What is included.</h2><p>'+str(N)+' trip profiles: '+str(DETAIL)+' retained detailed guides and '+str(BRIEFS)+' new source-linked briefs. '+str(COLLECTIONS)+' country and jurisdiction collections, six regions, 12 environment guides and six retained preparation articles. Every trip connects to its own equipment decisions in the saved planner.</p></section><section><h2>What a brief means.</h2><p>A brief is a starting point supported by a named source and an original planning decision. Many expansion records were researched from search-result excerpts. They are not presented as independently vetted destination guides. Their shared preparation modules are reusable advice, not additional location research.</p></section><section><h2>What is not connected.</h2><p>No live weather, conditions, retailer inventory, native bookings, payments or escrow. Amazon links are category searches; no affiliate tag is configured in the preview. Listed operators are sources, not asserted Atlas partners.</p></section><section><h2>Publishing and maintenance.</h2><p>The source includes authored data, a static build and validation scripts. A real site origin is needed to generate production canonicals and a sitemap. No scheduled research service is running. Changes to source data require review and a rebuild.</p></section><section><h2>Your plan.</h2><p>Plans save on the current browser. Shared links contain snapshots, not collaborative cloud documents. Equipment recommendations are requirements to confirm, not exact-model product endorsements.</p></section><a class="btn" href="/research/">Inspect research depth ↗</a></div></section>'
add('/about/','About Fishing Atlas Global Edition 003','What the global fishing catalog covers and how research depth is disclosed.',about,'about')

# Retained starter content stays accessible but is linked to the newer detail.
for old,newids in [('yakutat',['situk-coho-river','yakutat-halibut']),('florida-keys',['keys-flats','keys-offshore']),('bozeman',['rocky-mountain-alpine','mataura-trout'])]:
    path='/destinations/'+old+'/'
    if path in pages:
        # Bozeman comparisons are explicitly other locations, not Bozeman fisheries.
        title='Compare other trout environments' if old=='bozeman' else 'Read the more specific trip guides'
        pages[path]['body']+=f'<section class="section"><div class="wrap"><h2>{title}.</h2><div class="world-grid spaced">'+''.join(trip_card(TBY[i]) for i in newids)+'</div></div></section>'

(ROOT/'research/content-register.json').write_text(json.dumps({'reviewed':WORLD['reviewed'],'tripGuides':len(TRIPS),'environmentGuides':len(HABITATS),'countries':COUNTRIES,'regions':REGIONS,'sources':len(SOURCES),'articles':[{'id':t['id'],'type':'trip','words':t.get('articleWordCount',sum(len(x['text'].split()) for x in t['sections'])),'sources':t['sourceIds'],'review':t['review']} for t in TRIPS]+[{'id':h['id'],'type':'environment','sources':list({e['source'] for e in h['evidence']}),'review':h['review']} for h in HABITATS],'issues':WORLD['issues'],'backlog':WORLD['backlog']},ensure_ascii=False,indent=2))
(ROOT/'src/compiled-data.json').write_text(json.dumps(DATA,ensure_ascii=False,indent=2))
