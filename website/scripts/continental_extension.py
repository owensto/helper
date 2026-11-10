"""Continental release: canonical NA routes, subnational hubs, six editorial queues.
Executed by build.py. A generated preparation page is not promoted to researched content.
"""
from collections import defaultdict,Counter
from copy import deepcopy
import csv,io
PLAN=json.loads((ROOT/'src/north-america-plan.json').read_text())
PLANNED=[t for t in TRIPS if t.get('planId')]
PB={p['id']:p for p in PLAN['trips']}
COUNTRY_PATH={'United States':'united-states','Canada':'canada','Mexico':'mexico'}
COUNTRY_CODE={'United States':'US','Canada':'CA','Mexico':'MX'}
SUBREGIONS={
'Europe':{
'Nordic & Baltic':['Norway','Sweden','Finland','Iceland','Denmark','Estonia','Latvia','Lithuania'],
'Britain & Ireland':['United Kingdom','Ireland'],
'Western & Central Europe':['France','Belgium','Netherlands','Luxembourg','Germany','Poland','Czechia','Slovakia','Hungary'],
'Alpine & Adriatic':['Switzerland','Austria','Italy','Slovenia','Croatia'],
'Balkans & Eastern Europe':['Bosnia and Herzegovina','Serbia','Montenegro','Bulgaria','Romania'],
'Mediterranean & Iberia':['Spain','Portugal','Andorra','Monaco','Malta','Greece']},
'South America':{
'Patagonia & Southern Cone':['Argentina','Chile','Uruguay'],
'Brazil & Atlantic waters':['Brazil'],
'Andes & upper Amazon':['Bolivia','Peru','Ecuador','Colombia'],
'Guianas':['Guyana','Suriname']},
'Africa':{
'North Africa':['Morocco','Tunisia','Egypt'],
'West & Central Atlantic':['Senegal','Gambia','Guinea-Bissau','Cameroon','Gabon','Angola'],
'East Africa & inland waters':['Kenya','Tanzania','Uganda'],
'Southern Africa':['South Africa','Namibia','Botswana','Lesotho','Zambia','Zimbabwe'],
'Indian Ocean coast & islands':['Mozambique','Madagascar','Mauritius','Seychelles']},
'Asia':{
'East Asia':['Japan','South Korea'],
'Mongolia & inland Asia':['Mongolia'],
'Himalaya & South Asia':['Bhutan','Nepal','India','Sri Lanka'],
'Southeast Asia':['Thailand','Malaysia','Indonesia','Singapore','Philippines','Vietnam'],
'Arabian Peninsula':['Oman','United Arab Emirates','Qatar','Saudi Arabia'],
'Eastern Mediterranean':['Turkey','Cyprus','Jordan'],
'Indian Ocean islands':['Maldives']},
'Oceania':{
'Australia':['Australia'],
'New Zealand':['New Zealand'],
'Melanesia':['Fiji','Papua New Guinea','Solomon Islands','Vanuatu'],
'Micronesia':['Palau','Federated States of Micronesia','Marshall Islands','Kiribati'],
'Polynesia':['Cook Islands','Niue','Samoa','Tonga']}}
for continent,groups in SUBREGIONS.items():
 for t in TRIPS:
  if t['region']==continent:
   t['subregion']=next((g for g,cs in groups.items() if t['country'] in cs),'Additional country research')
for t in TRIPS:
 if t['region']=='North America' and not t.get('subregion'):
  t['subregion']='Retained broad U.S. guides' if t['country']=='United States' else 'Central America' if t['country'] in ['Belize','Costa Rica','Guatemala','Honduras','Nicaragua','Panama'] else 'Caribbean'
COV={r:{'profiles':sum(t['region']==r for t in TRIPS),'guides':sum(t['region']==r and t['contentTier']=='detailed-guide' for t in TRIPS),'sourceBriefs':sum(t['region']==r and t['contentTier']=='trip-brief' for t in TRIPS),'preparationBriefs':sum(t['region']==r and t['contentTier']=='preparation-brief' for t in TRIPS),'countries':len({t['country'] for t in TRIPS if t['region']==r})} for r in REGIONS}
COUNTS=Counter(t['contentTier'] for t in TRIPS)
HEADER=f'<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner">{BRAND}<nav class="nav" id="site-nav" aria-label="Main navigation"><a href="/north-america/">North America</a><a href="/continents/">World atlas</a><a href="/trips/">Find a trip</a><a href="/environments/">Types of water</a><a href="/research/">Research</a></nav><div class="header-action"><a class="btn small" href="/plan/">My fishing plan ↗</a><button class="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="site-nav" data-action="menu">☰</button></div></div></header>'
FOOTER=f'<footer class="site-footer"><div class="wrap"><div class="footer-top"><div>{BRAND}<p class="footer-desc">Find your water. Understand the trip. Bring only what you need.</p></div><div class="footer-links"><a href="/north-america/">North America</a><a href="/continents/">Continents</a><a href="/countries/">Countries</a><a href="/environments/">Fishing environments</a><a href="/launch/">Distribution tools</a><a href="/production/">Editorial queues</a><a href="/about/">Release notes</a></div></div><div class="footer-bottom"><span>© 2026 Castward</span><span>Illustrations are not navigation charts.</span></div></div></footer><div id="toast" class="toast" role="status" aria-live="polite"></div>'
# Canonical routes preserve working old links without keeping duplicate articles in search.
REDIRECTS={}
for t in PLANNED:
 old='/trips/'+t['id']+'/';new=t['canonicalPath']
 page=pages.pop(old);pages[new]=page
 REDIRECTS[old]=new
 for oid in t.get('legacyIds',[]):REDIRECTS['/trips/'+oid+'/']=new

def alias(old,new):
 if old==new:return
 add(old,'Continue to Fishing Atlas','This page has moved to its regional guide.',bread('Continue')+intro('MOVED','Continue to the current guide.','The regional guide retains the relevant trip information.')+f'<section class="section"><div class="wrap"><a class="btn" href="{E(new,quote=True)}">Open current page ↗</a></div></section>','redirect',True)
 pages[old]['redirectTo']=new;REDIRECTS[old]=new

def readiness(ts):
 c=Counter(t['contentTier'] for t in ts)
 return f'{c["detailed-guide"]} source-checked guides · {c["trip-brief"]} source-linked briefs · {c["preparation-brief"]} preparation frameworks awaiting local research'

def cards(ts):return '<div class="world-grid">'+''.join(trip_card(t) for t in sorted(ts,key=lambda x:(not x.get('indexEligible'),x.get('state',''),x['place'])))+'</div>'
def indexable(ts):return sum(t.get('indexEligible',False) for t in ts)>=2

def navcard(path,name,n,description,tag='COLLECTION'):
 return f'<a class="panel country-card" href="{path}"><span class="eyebrow">{E(tag)} · {n} PROFILES</span><h3>{E(name)}</h3><p>{E(description)}</p><span class="link">Explore collection ↗</span></a>'

def collection(path,name,ts,parent,description,below=''):
 body=bread(name,parent)+intro('REGIONAL FIELD LIBRARY',E(name),E(description))
 body+='<section class="section library-section"><div class="wrap"><div class="readiness-bar"><span>'+E(readiness(ts))+'</span><a href="/research/">How review works ↗</a></div>'+cards(ts)+below+'</div></section>'
 add(path,name+' fishing trips and preparation | Fishing Atlas',description,body,'collection',not indexable(ts))

# U.S., Canada and Mexico: all production rows have a real subnational page.
for country,cslug in COUNTRY_PATH.items():
 ts=[t for t in PLANNED if t['country']==country];cp='/north-america/'+cslug+'/'
 sublabel='state' if country!='Canada' else 'province or territory'
 groups=defaultdict(list)
 for t in ts:groups[t['state']].append(t)
 body=bread(country,('/north-america/','North America'))+intro('COUNTRY → REGION → '+sublabel.upper(),E(country)+' fishing.',f'{len(ts)} trip profiles across {len(groups)} {"provinces and territories" if country=="Canada" else "states"}. Compare preparation scenarios and source-checked guides without confusing the two.')
 body+='<section class="section library-section"><div class="wrap"><div class="readiness-bar">'+E(readiness(ts))+'</div><div class="country-jump">'
 regions=list(dict.fromkeys(t['subregion'] for t in ts))
 for rg in regions:body+=f'<a class="pill" href="{cp}regions/{SLUG(rg)}/">{E(rg)} ↗</a>'
 body+='</div><div class="section-head spaced"><h2>Choose your '+sublabel+'.</h2></div><div class="country-grid">'
 for state,sts in sorted(groups.items()):
  sp=cp+SLUG(state)+'/'
  assert all(t['canonicalPath'].startswith(sp) for t in sts), (state,sp)
  habitats=sorted({h for t in sts for h in t['habitats']})
  body+=navcard(sp,state,len(sts),', '.join(habitats[:4]),sublabel)
  more=f'<div class="spaced"><a class="btn outline" href="/trips/?'+urlencode({'country':country,'state':state})+'">Search and filter these trips ↗</a></div>'
  collection(sp,state,sts,(cp,country),'Explore '+str(len(sts))+' fishing-trip profiles in '+state+'. Read the evidence level, compare access and methods, and customize a preparation list.',more)
 body+='</div></div></section>'
 add(cp,country+' fishing by '+sublabel+' | Fishing Atlas',f'Browse {len(ts)} fishing-trip profiles across {len(groups)} {sublabel} collections, with region navigation and trip-specific preparation.',body,'country',not indexable(ts))
 alias('/countries/'+SLUG(country)+'/',cp)
 for rg in regions:
  rts=[t for t in ts if t['subregion']==rg]
  collection(cp+'regions/'+SLUG(rg)+'/',rg,rts,(cp,country),'An editorial collection of '+str(len(rts))+' trips in '+rg+'. Start with the specific water and access, then build the equipment plan.')

na=[t for t in TRIPS if t['region']=='North America']
extra=[t for t in na if not t.get('planId')]
body=bread('North America')+intro('NORTH AMERICA / EDITION 004','Every state is a starting point.','Explore 357 U.S., 100 Canadian and 50 Mexican trip profiles, plus retained Central American, Caribbean and broader regional guides. Local research is complete only where the guide says so.')
body+='<section class="section library-section"><div class="wrap"><div class="na-numbers"><div><strong>357</strong><span>U.S. trip profiles</span></div><div><strong>100</strong><span>Canada</span></div><div><strong>50</strong><span>Mexico</span></div><div><strong>'+str(len(extra))+'</strong><span>Additional retained profiles</span></div></div><div class="country-grid">'
for country,cslug in COUNTRY_PATH.items():
 ts=[t for t in PLANNED if t['country']==country]
 body+=navcard('/north-america/'+cslug+'/',country,len(ts),('All 50 states' if country=='United States' else 'All 13 provinces and territories' if country=='Canada' else '15 state collections')+' · '+str(sum(t['indexEligible'] for t in ts))+' search-eligible guides','COUNTRY')
body+='</div><div class="readiness-bar spaced">'+E(readiness(na))+'</div><div class="section-head spaced"><div><span class="eyebrow">NEW SOURCE-PAGE REVIEW</span><h2>Start with the first regional release.</h2></div><a class="link" href="/trips/?region=North+America&depth=detailed-guide">All source-checked guides ↗</a></div>'
featured=[t for t in PLANNED if t.get('planId') in json.loads((ROOT/'src/release-enrichment.json').read_text())['trips']]
body+=cards(featured[:8])
body+='<div class="section-head spaced"><div><span class="eyebrow">NOT DISCARDED IN THE MERGE</span><h2>Caribbean, Central America & broader guides.</h2></div></div>'+cards(extra)
body+='<div class="spaced"><a class="btn" href="/trips/?region=North+America">Search all '+str(len(na))+' North American profiles ↗</a></div></div></section>'
add('/north-america/','North America fishing: every U.S. state, Canada and Mexico | Fishing Atlas','507 U.S., Canadian and Mexican profiles plus 43 retained regional profiles, with state and province navigation, visible research depth and personalized preparation.',body,'continent')
# All populated continents get the same country -> editorial region -> trip -> planner workflow.
conbody=bread('World atlas')+intro('CONTINENT BY CONTINENT','A worldwide library, built locally.','Six populated continental collections. The same research, preparation and publishing workflow applies to each; their coverage is not equally deep.')+'<section class="section library-section"><div class="wrap"><div class="country-grid">'
for r in REGIONS:
 rs=SLUG(r);ts=[t for t in TRIPS if t['region']==r];path='/north-america/' if r=='North America' else '/continents/'+rs+'/'
 conbody+=navcard(path,r,len(ts),readiness(ts),'CONTINENT')
 if r=='North America':
  alias('/continents/north-america/','/north-america/');alias('/regions/north-america/','/north-america/');continue
 cts=sorted({t['country'] for t in ts});groups=SUBREGIONS[r]
 cb=bread(r,('/continents/','World atlas'))+intro('CONTINENT → EDITORIAL REGION → COUNTRY',E(r),str(len(ts))+' existing trip profiles across '+str(len(cts))+' country and jurisdiction collections. These are retained profiles, not a claim of newly completed continent-wide research.')
 cb+='<section class="section library-section"><div class="wrap"><div class="readiness-bar">'+E(readiness(ts))+'</div><div class="section-head"><h2>Explore by region.</h2></div><div class="country-grid">'
 for g,countries in groups.items():
  gts=[t for t in ts if t['country'] in countries];gp='/continents/'+rs+'/regions/'+SLUG(g)+'/'
  cb+=navcard(gp,g,len(gts),', '.join(sorted({t['country'] for t in gts})),'EDITORIAL REGION')
  collection(gp,g,gts,('/continents/'+rs+'/',r),'Selected '+g+' fishing profiles, organized for local research and practical preparation. Region names are editorial groupings, not claims of a formal geographic standard.')
 cb+='</div><div class="section-head spaced"><h2>Browse country collections.</h2></div><div class="country-jump">'+''.join(f'<a class="pill" href="/countries/{SLUG(c)}/">{E(c)} ↗</a>' for c in cts)+'</div><div class="section-head spaced"><h2>Source-checked places to start.</h2></div>'+cards([t for t in ts if t.get('indexEligible')])
 cb+=f'<div class="spaced"><a class="btn outline" href="/production/{rs}/">Open this continent’s production queue ↗</a></div></div></section>'
 add(path,r+' fishing by region and country | Fishing Atlas',str(len(ts))+' retained '+r+' fishing profiles with country, regional and production navigation.',cb,'continent',not indexable(ts))
 alias('/regions/'+rs+'/',path)
conbody+='</div><div class="panel spaced"><span class="eyebrow">ANTARCTICA / NO TRIP INVENTORY</span><h2>A visible coverage gap, not an invented product.</h2><p class="spaced">Atlas has no recreational fishing trip profiles or booking product for Antarctica. It is not included in the six populated collections or in the trip count.</p></div></div></section>'
add('/continents/','Fishing around the world: continent and regional atlas | Fishing Atlas','Browse six populated continental fishing collections and their research status, with no invented Antarctic trip inventory.',conbody,'continents')
alias('/destinations/','/continents/')
# Queue records describe required work. Importing them cannot set an article's review state.
queues={r:[] for r in REGIONS}
for t in TRIPS:
 p=PB.get(t.get('planId'));r=t['region'];tier=t['contentTier']
 q={'id':t.get('planId') or t['id'],'tripId':t['id'],'continent':r,'country':t['country'],'region':t['subregion'],
 'stateOrProvince':t.get('state',''),'location':t['place'],'url':t['canonicalPath'],'currentTier':tier,
 'indexEligible':t['indexEligible'],'sourceIds':t['sourceIds'],'evidenceDepth':t.get('evidenceDepth',''),
 'localDecision':t.get('researchQuestion') or t['summary'],'candidateTargets':t.get('candidateTargets') or ' / '.join(t['fish']),
 'confirmedTargets':t['fish'],'seasonalEvidence':t['season'],'accessToVerify':p['access_research'] if p else ' / '.join(t['access']),
 'tackleDecision':p['tackle_research'] if p else ' | '.join(k['specification'] for k in t['kit']),
 'operatorQuestion':p['operator_provision_question'] if p else 'Confirm actual access, equipment provision, meeting place and date availability.',
 'sourceLeads':t.get('researchLeads',{}),'distributionAngle':p['distribution_angle'] if p else 'Show the local decision: '+t['summary'],
 'nextAction':'Maintain attributed facts; obtain local corroboration and exact product selections.' if tier=='detailed-guide' else 'Inspect full primary/local source pages; establish targets, access and seasonal scope before editorial promotion.',
 'acceptance':['Named fishery and scope supported by inspected sources','Local access and target are not inferred from a country','Seasonal claims have source/date/scope','Equipment requirements fit the actual method','No invented operator availability','Publish gate passed before search indexing']}
 queues[r].append(q)
(ROOT/'research/continent-queues').mkdir(exist_ok=True)
(DIST/'downloads').mkdir(exist_ok=True)
for r,q in queues.items():
 slug=SLUG(r);payload={'continent':r,'generated':'2026-09-13','count':len(q),'records':q,'status':'Editorial production queue, not additional published guides'}
 text=json.dumps(payload,ensure_ascii=False,indent=2)
 (ROOT/'research/continent-queues'/f'{slug}.json').write_text(text);(DIST/'downloads'/f'{slug}-queue.json').write_text(text)
 fields=['id','tripId','continent','country','region','stateOrProvince','location','url','currentTier','indexEligible','localDecision','candidateTargets','accessToVerify','tackleDecision','operatorQuestion','distributionAngle','nextAction']
 buf=io.StringIO();wr=csv.DictWriter(buf,fieldnames=fields,extrasaction='ignore');wr.writeheader();wr.writerows(q)
 (ROOT/'research/continent-queues'/f'{slug}.csv').write_text(buf.getvalue());(DIST/'downloads'/f'{slug}-queue.csv').write_text(buf.getvalue())
 cb=bread(r+' production',('/production/','Production desk'))+intro('EDITORIAL WORKBENCH / NOT SEARCH-INDEXED',E(r)+' production queue.',f'{len(q)} existing records with local research questions, gear decisions, distribution angles and publication gates. This queue does not promise that the work is complete.')
 cb+='<section class="section library-section"><div class="wrap"><div class="readiness-bar">'+E(readiness([t for t in TRIPS if t['region']==r]))+'</div><div class="country-jump"><a class="btn outline" href="/downloads/'+slug+'-queue.json" download>Download JSON queue</a><a class="btn outline" href="/downloads/'+slug+'-queue.csv" download>Download CSV queue</a></div><div class="queue-list spaced">'
 for x in q:
  cb+=f'<details class="queue-record"><summary><span class="eyebrow">{E(x["country"])} / {E(x["stateOrProvince"] or x["region"])}</span><b>{E(x["location"])}</b><span class="pill">{E(x["currentTier"].replace("-"," "))}</span></summary><div class="queue-detail"><p><b>Local decision:</b> {E(x["localDecision"])}</p><p><b>Access:</b> {E(x["accessToVerify"])}</p><p><b>Equipment:</b> {E(x["tackleDecision"])}</p><p><b>Operator:</b> {E(x["operatorQuestion"])}</p><p><b>Distribution:</b> {E(x["distributionAngle"])}</p><p><b>Next action:</b> {E(x["nextAction"])}</p><a class="link" href="{E(x["url"],quote=True)}">Open trip profile ↗</a></div></details>'
 cb+='</div></div></section>'
 add('/production/'+slug+'/',r+' editorial production queue | Fishing Atlas',f'{len(q)} actual records and next actions for researching, publishing and distributing the {r} fishing collection.',cb,'production',True)
production=bread('Production desk')+intro('ONE WORKFLOW / SIX CONTINENTS','Research. Publish. Distribute. Repeat.','The queues use actual catalog records, not a numeric target disguised as inventory. Work proceeds country by country and region by region.')+'<section class="section library-section"><div class="wrap"><div class="country-grid">'
for r in REGIONS:production+=navcard('/production/'+SLUG(r)+'/',r,len(queues[r]),readiness([t for t in TRIPS if t['region']==r]),'EDITORIAL QUEUE')
production+='</div><div class="panel spaced"><h2>Before a page enters search.</h2><p class="spaced">Inspect full sources. Resolve the local target, access and seasonal question. Check the gear system. Publish only the supported guide, then create its operator preparation link and a demonstration of the actual local decision. An imported brief stays noindex until those checks pass.</p><p>Exact-product review, affiliate tracking, operator inventory and hosted analytics remain separate integrations; none is invented by this release.</p></div></div></section>'
add('/production/','Continent-by-continent editorial production | Fishing Atlas','Actual fishing editorial queues across six populated continents, with source evidence, gear decisions and distribution actions.',production,'production',True)
# Research desk retains the full source register while correcting the old expansion claims.
research=bread('Research desk')+intro('SOURCE DEPTH / VISIBLE LIMITATIONS','Useful preparation. Honest evidence.','The release connects the complete North American backlog to the site. Only individually source-checked records are called guides.')+'<section class="section library-section"><div class="wrap"><div class="quality-grid">'
for name,k,desc in [('Source-checked guides','detailed-guide','Full source-page text supports named claims. Not field-tested or independently expert-reviewed.'),('Source-linked briefs','trip-brief','Retained starting points. Many are supported only by inspected search excerpts and require deeper review.'),('Preparation frameworks','preparation-brief','Production briefs with local questions and equipment decisions. No local evidence has been verified yet.')]:
 research+=f'<div class="panel"><span class="eyebrow">{E(name)}</span><h2>{COUNTS[k]}</h2><p class="spaced">{E(desc)}</p></div>'
research+='</div><section class="research-section"><h2>What changed in this release.</h2><p>All 507 U.S., Canadian and Mexican production entries now have a canonical trip page, a state/province collection and a connected planner. Existing matches were retained; one overlapping Great Bear Lake pair was merged. The resulting global count is 796—not 816.</p><p>Ten local guides received source-page research in this release: eight Southeast guides and two Texas guides. These pages cite their specific claims. Other imports remain preparation frameworks, with candidate species and access clearly unverified.</p><p>Search eligibility is separate from browsing. Unfinished and excerpt-only trip pages are excluded from the production sitemap and carry noindex. A real production origin must still be configured before any page is indexable.</p></section>'
research+='<section class="research-section"><h2>Source register.</h2><p>Some records refer to the same webpage in different editions. The '+str(len(SOURCES))+' count is a source-record count, not a unique-URL count or a count of freshly reviewed pages.</p><div class="source-register">'
for sid,s in SOURCES.items():
 research+=f'<article class="register-entry">{source_link(sid)}<div><span class="pill">{E(s["type"].replace("-"," "))}</span><span>{E(s.get("status","text-inspected").replace("-"," "))}</span></div><p>{E(s.get("scopeNote",""))}</p></article>'
research+='</div></section><section class="research-section"><h2>Coverage is not completeness.</h2><p>Profiles are fishing experiences, not necessarily unique lakes or rivers. Multiple methods can share a location; shared waters can have different departure contexts. Region names are editorial groupings. Missing countries, species or months remain gaps—not claims that fishing is absent.</p><a class="btn outline" href="/production/">Open continent production queues ↗</a></section></div></section>'
add('/research/','Fishing Atlas research depth and source register','See which trip profiles are source-checked guides, source-linked briefs or preparation frameworks still awaiting local research.',research,'research')
# Clear new homepage, avoiding giant multi-megabyte content lists on the first view.
home=f'''<section class="hero world-hero continental-hero"><div class="hero-visual">{contour('hero')}</div><div class="wrap"><span class="eyebrow">THE WATER IS CALLING</span><h1>Find your water.<br><em>Go prepared.</em></h1><p class="hero-desc">From a mountain stream to an offshore departure: choose the fishing, understand the decisions, and build a list around what you actually need.</p><form class="world-search" data-form="world-search"><label class="sr-only" for="home-world-search">Search Fishing Atlas</label><input id="home-world-search" name="q" type="search" placeholder="A state, water, fish or kind of trip…"><button class="btn lime" type="submit">Find my trip ↗</button></form><div class="hero-shortcuts"><a href="/north-america/">North America ↗</a><a href="/continents/">Every continent ↗</a><a href="/trips/?depth=detailed-guide">Source-checked guides ↗</a></div></div></section>'''
home+='<section class="section soft"><div class="wrap coverage-strip"><div><span class="eyebrow">NEAR & FAR</span><h2>A whole continent of starting points.</h2><p>All 50 U.S. states. Every Canadian province and territory. Fifteen Mexican state collections. Source-checked guides and research-pending preparation pages are clearly separated.</p></div><a class="btn" href="/north-america/">Explore North America ↗</a></div></section>'
home+='<section class="section"><div class="wrap"><div class="section-head"><div><span class="eyebrow">THE ATLAS</span><h2>Choose where to start.</h2></div><a class="link" href="/continents/">Open the world atlas ↗</a></div><div class="country-grid">'
for r in REGIONS:
 ts=[t for t in TRIPS if t['region']==r]
 home+=navcard('/north-america/' if r=='North America' else '/continents/'+SLUG(r)+'/',r,len(ts),f'{COV[r]["countries"]} country collections · {COV[r]["guides"]} source-checked guides','CONTINENT')
home+='</div></div></section><section class="section soft"><div class="wrap"><div class="section-head"><div><span class="eyebrow">FIELD NOTES</span><h2>A little knowledge. A better trip.</h2></div><a class="link" href="/trips/?depth=detailed-guide">All checked guides ↗</a></div>'+cards([t for t in featured if t['planId'] in ['US-NC-002','US-GA-002','US-FL-001']])+'</div></section>'
home+='<section class="section"><div class="wrap"><div class="section-head"><div><span class="eyebrow">FIND YOUR ELEMENT</span><h2>Every water has its own rhythm.</h2></div></div><div class="habitat-grid">'+''.join(habitat_card(h) for h in HABITATS[:6])+'</div><a class="link spaced water-index" href="/environments/">Explore all types of water</a></div></section>'
home+=f'<section class="section soft"><div class="wrap editorial-split"><div><span class="eyebrow">OWN IT / PROVIDED / STILL NEEDED</span><h2>Buy only what belongs<br>on your trip.</h2><p class="spaced">Add your dates and equipment. Confirm what the guide supplies. Keep missing specifications visible instead of buying a mismatched bundle.</p><a class="btn spaced" href="/plan/">Build my preparation list ↗</a></div><div class="panel"><span class="eyebrow">RESEARCH DEPTH</span><h3 class="spaced">{COUNTS["detailed-guide"]} checked guides.<br>A visible work-in-progress.</h3><p class="spaced">{COUNTS["trip-brief"]} source-linked briefs and {COUNTS["preparation-brief"]} preparation frameworks remain less complete. No one has independently expert-reviewed the whole collection.</p><a class="link spaced" href="/research/">Inspect the evidence ↗</a></div></div></section>'
add('/','Fishing Atlas | Find your water. Go prepared.','Explore 796 fishing profiles worldwide, including 507 U.S., Canadian and Mexican trips with state and province navigation and personalized preparation.',home,'home')
about=bread('About this release')+intro('CONTINENTAL EDITION / 004','A working catalog, not a completed encyclopedia.','Read exactly what is integrated and what remains before a live commercial launch.')+'<section class="section library-section"><div class="wrap narrow prose"><h2>Included in this build</h2><p>796 trip profiles, of which 550 belong to the broad North America collection. All 507 production entries are integrated, not merely held in a spreadsheet. There are 50 U.S. state, 13 Canadian province/territory and 15 Mexican state landing pages. Six continents have working regional navigation and downloadable editorial queues.</p><h2 class="spaced">Not complete</h2><p>479 preparation frameworks await local source verification. Ten guides were individually researched in this release; the collection has no independent local-expert sign-off. Amazon links are category searches without an affiliate tracking tag unless the owner configures one. Exact product selection and live inventory are not connected.</p><h2 class="spaced">Not deployed by a generated file</h2><p>The standalone HTML and source package are local review artifacts. Publishing requires an authorized site and production origin. A deploy-ready source package is not a live website.</p><h2 class="spaced">Bookings and saved plans</h2><p>Plans save in the browser; shares contain snapshots. Inquiries are drafts. There is no native booking, payment, escrow or confirmed operator inventory in this release.</p><a class="btn spaced" href="/production/">Open the continent queues ↗</a></div></section>'
add('/about/','Fishing Atlas Continental Edition 004 release notes','The integrated North American release, continental workflows, research limits and unconnected commerce features.',about,'about')
# Rewrite old article references to canonical URLs, preserving explicit redirect pages.
for old,new in list(REDIRECTS.items()):alias(old,new)
for path,p in pages.items():
 if p.get('redirectTo'):continue
 for old,new in REDIRECTS.items():p['body']=p['body'].replace('href="'+old+'"','href="'+new+'"')
 p['body']=p['body'].replace('309 TRIP PROFILES',str(N)+' TRIP PROFILES').replace('Explore all 309 trip profiles','Explore all '+str(N)+' trip profiles').replace('GLOBAL EDITION / 003','CONTINENTAL EDITION / 004')
# Country index and miscellaneous navigation collections must not claim all briefs have evidence.
for path,p in pages.items():
 if path.startswith('/countries/') and not p.get('redirectTo'):
  p['body']=p['body'].replace('New briefs show whether source text or a search excerpt was inspected.','Preparation frameworks may have no checked local sources. Source-linked briefs disclose full-page versus excerpt inspection.')
# Thin country navigation stays out of search until it contains enough researched children.
for c in COUNTRIES:
 cp='/countries/'+SLUG(c)+'/'
 if cp in pages and not pages[cp].get('redirectTo'):
  pages[cp]['noindex']=not indexable([t for t in TRIPS if t['country']==c])
# The public bundle need only contain compact trip routing/filter metadata, not duplicate all prose.
DATA['world']['trips']=[{k:t.get(k) for k in ['id','title','place','country','region','state','subregion','canonicalPath','contentTier','fish','candidateTargets','tripTypeIds','tripTypeNames']} for t in TRIPS]
DATA['world'].pop('sources',None)
DATA['continentalCoverage']=COV
(ROOT/'src/compiled-data.json').write_text(json.dumps(DATA,ensure_ascii=False,indent=2))
(ROOT/'src/world.json').write_text(json.dumps(WORLD,ensure_ascii=False,indent=2))
(DIST/'_redirects').write_text(''.join(f'{old} {new} 301\n' for old,new in sorted(REDIRECTS.items())))
release={'edition':'004','date':'2026-09-13','tripProfiles':N,'plannedNorthAmerica':len(PLANNED),'continentCoverage':COV,'contentTiers':dict(COUNTS),'states':50,'canadianProvincesTerritories':13,'mexicanStates':15,'sourceRecords':len(SOURCES),'freshlyReviewedSourceRecords':15,'freshlyReviewedGuides':10,'redirects':len(REDIRECTS),'searchEligibleTrips':sum(t['indexEligible'] for t in TRIPS),'deployment':'Not deployed; new Netlify site confirmation pending','integrations':{'amazonTagConfigured':bool(CONFIG.get('amazonTag')),'exactProductSelection':False,'nativeBookings':False,'payments':False,'escrow':False,'centralAnalytics':False}}
(ROOT/'research/release-summary.json').write_text(json.dumps(release,indent=2))
(DIST/'downloads/catalog.json').write_text(json.dumps(WORLD,ensure_ascii=False,indent=2))
(DIST/'downloads/north-america-507.json').write_text(json.dumps({'count':507,'trips':PLANNED},ensure_ascii=False,indent=2))
(DIST/'downloads/release-summary.json').write_text(json.dumps(release,indent=2))
