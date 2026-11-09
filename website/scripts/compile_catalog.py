#!/usr/bin/env python3
"""Compile explicitly authored trip briefs into the retained Atlas content model.
No location/species/month Cartesian products and no invented seasonal windows.
Run from the project root: python3 scripts/compile_catalog.py
"""
import sys,json,re,copy
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from catalog import europe,europe_more,africa,americas,asia,oceania,final_regions
from catalog.core import ROWS,SOURCES,slug
from catalog import quality_edits
W=json.loads((ROOT/'src/world-base.json').read_text())
# Habitat and access here describe the planning scenario, not verified independent access.
K={
 'river':('Freshwater',['Rivers & streams'],['Fly / guide-selected'],['Bank'],'River valley'),
 'spring':('Freshwater',['Spring-fed streams'],['Fly'],['Bank'],'Spring-fed valley'),
 'lake':('Freshwater',['Lakes & reservoirs'],['Guide-selected lake fishing'],['Guided boat'],'Lake basin'),
 'lakebank':('Freshwater',['Lakes & reservoirs'],['Bank fishing'],['Bank'],'Lake shore'),
 'riverboat':('Freshwater',['Rivers & streams'],['Guide-selected river fishing'],['River float'],'River corridor'),
 'urban':('Freshwater',['Lakes & reservoirs'],['Lure / spinning'],['Bank'],'Urban waterways'),
 'coast':('Saltwater',['Reef & bottom'],['Guide-selected coastal fishing'],['Guided boat'],'Coastal'),
 'estuary':('Brackish',['Estuaries & mangroves'],['Lure / guide-selected'],['Guided boat'],'Estuary'),
 'reef':('Saltwater',['Reef & bottom'],['Casting / bottom / guide-selected'],['Guided boat'],'Reef and island'),
 'offshore':('Saltwater',['Offshore'],['Trolling / guide-selected'],['Charter boat'],'Open coast'),
 'alpine':('Freshwater',['Alpine lakes'],['Fly / lure selection'],['Hike-in'],'Mountain'),
 'ice':('Freshwater',['Ice fishing'],['Ice jigging'],['Guided ice'],'Winter lake'),
 'carp':('Freshwater',['Lakes & reservoirs'],['Carp fishing'],['Bank'],'Lake'),
 'tropicalriver':('Freshwater',['Rivers & streams','Tropical floodplains'],['Guide-selected predator fishing'],['Guided boat'],'Tropical river'),
 'floodplain':('Freshwater',['Tropical floodplains'],['Fly / lure selection'],['Guided boat'],'Floodplain'),
 'flats':('Saltwater',['Saltwater flats'],['Saltwater fly'],['Skiff'],'Shallow coastal flats'),
 'surf':('Saltwater',['Surf & beaches'],['Surf casting'],['Bank'],'Exposed beach'),
 'glacial':('Freshwater',['Glacier-influenced rivers'],['Guide-selected river fishing'],['Guided boat'],'Glacier-influenced river'),
 'managed':('Freshwater',['Lakes & reservoirs'],['Managed-fishery angling'],['Bank'],'Managed / stocked fishery')
}
# These are editorial preparation modules, reused transparently rather than counted as unique research.
MODULES={
 'river':('Choose a reach and presentation','A river name is not a complete day plan. Decide the reach, bank access and presentation first. Ask for the useful lure weight or fly-line arrangement, then match the rod, reel and leader to that answer. Wading is a separate decision and is not assumed in this brief.'),
 'lake':('Choose the access before the outfit','Lake fishing can mean a bank session, trolling, jigging or a guided casting day. Confirm which of those is actually offered. Check boat and equipment provision before buying a second setup, and keep the personal day bag distinct from shared tackle.'),
 'boat':('Build around a confirmed boat plan','Ask the crew to identify the primary target and method, the actual time spent fishing and how anglers share the available positions. Confirm the tackle that is supplied before buying rods or terminal gear. Keep spare clothing and electronics protected from spray.'),
 'flats':('Treat each target as its own system','Ask the guide for the rod, reel, line, leader and fly requirements for the chosen target. Confirm whether the day is skiff-based, waded or a combination. Choose footwear from that access decision, and do not substitute a light target outfit for a heavy predator system.'),
 'alpine':('Protect the hiking plan first','Confirm that the particular lake and access route suit the intended fishing visit. Keep the fishing equipment compact enough that it does not displace navigation, layers, water and emergency essentials. Bank fishing does not automatically require waders.'),
 'ice':('Use a guide-confirmed winter setup','The outing needs a current guide assessment, a suitable shelter and transport plan, and winter clothing independent of the fishing tackle. Confirm the auger, rods and warming arrangements before buying specialist equipment. A calendar date does not establish usable ice.'),
 'carp':('Confirm the fishery’s equipment system','Ask the venue to specify the rod and rig approach, bait provision and fish-handling equipment. A travel kit should follow those venue requirements rather than a generic trophy-fish shopping bundle. Separate what is supplied from personal items needed for a long bank session.'),
 'estuary':('Choose the water and tide plan','Have the skipper identify the actual reach or coastal zone and the intended target. Confirm how boat access and timing fit the trip; do not assume every part of an estuary fishes in the same way. Match terminal tackle only after that choice.'),
 'tropical':('Keep transfers and tackle connected','Confirm the camp or boat transfer, the target for each day and the working lure or fly selection. Ask about spare components before carrying duplicate outfits. Keep tropical river access guided unless a specific independent arrangement has been established.'),
 'surf':('Choose a usable stretch of shore','Identify the beach access and a conservative fishing position before choosing the casting setup. Confirm the presentation and sinker or lure range locally. Surf conditions, walking distance and return timing matter more than carrying the largest possible tackle assortment.')
}
def module(kind):
 if kind in ('river','spring','riverboat','glacial'):return 'river'
 if kind in ('lake','lakebank','urban'):return 'lake'
 if kind in ('offshore','reef','coast'):return 'boat'
 if kind in ('carp','managed'):return 'carp'
 if kind in ('tropicalriver','floodplain'):return 'tropical'
 return kind

def kit_for(r):
 k=r['kind'];m=module(k)
 primary={'river':'River rod, reel and line system','lake':'Lake-method tackle system','boat':'Boat-provided fishing system','flats':'Target-specific saltwater fly system','alpine':'Compact bank-fishing setup','ice':'Guide-provided ice-fishing equipment','carp':'Venue-matched rod and rig system','estuary':'Estuary casting and leader system','tropical':'Guide-specified predator tackle','surf':'Matched surf-casting system'}[m]
 spec={'river':'Select the casting weight or fly-line system for the confirmed reach.','lake':'Choose bank, trolling, jigging or casting equipment only after the method is fixed.','boat':'Confirm which rods, reels, rigs and replacement tackle the crew supplies.','flats':'Match the entire outfit to the primary target; obtain exact guide specifications.','alpine':'Keep rod sections and tackle protection compatible with the hike.','ice':'Confirm rods, auger, bait, shelter and transport with the guide.','carp':'Get venue-specific requirements for rigs, bait and landing equipment.','estuary':'Obtain a target- and presentation-specific outfit list from the skipper.','tropical':'Match lure or fly size, line, leader and connections to the outfitter’s program.','surf':'Match rod rating, line and terminal system to the agreed presentation.'}[m]
 kits=[dict(name=primary,specification=spec,why='The named trip determines the requirement; owning a fishing rod does not establish suitability.',query='',decision='confirm'),dict(name='Small, confirmed replacement-tackle selection',specification='Ask for the actual items, sizes and quantities used on this program.',why='Buy only what is missing after checking your own kit and the operator’s provision.',query='',decision='confirm')]
 if m=='ice':
  kits.append(dict(name='Winter insulation and dry spares',specification='Confirm footwear and layered clothing for the guided winter outing.',why='A supplied fishing rod does not cover personal cold-weather preparation.',query='insulated winter fishing clothing merino base layer',decision='consider'))
 elif m=='alpine':
  kits.append(dict(name='Compact waterproof hiking layers',specification='Keep rain protection and a dry layer available without overloading the pack.',why='The approach and return require preparation independent of fishing tackle.',query='lightweight waterproof hiking rain jacket',decision='consider'))
 elif m=='flats':
  kits.append(dict(name='Guide-approved flats footwear',specification='Confirm skiff-only versus wading access before buying boots.',why='A flats label alone does not tell you whether to enter the water or which sole is suitable.',query='flats fishing wading boots',decision='confirm'))
 else:
  kits.append(dict(name='Weather-matched personal clothing',specification='Check the actual forecast and supplied shelter before choosing layers.',why='This profile has no live weather feed; use suitable owned clothing before buying more.',query='fishing rain jacket lightweight',decision='consider'))
 kits.append(dict(name='Protected personal day kit',specification='Keep phone, spare clothing and essentials separate from wet tackle.',why='A compact bag is easier to move between the meeting point, accommodation and fishing session.',query='waterproof roll top dry bag small',decision='consider'))
 return kits

warm_countries={'Angola','Bahamas','Barbados','Belize','Bhutan','Bolivia','Botswana','Brazil','Cameroon','Colombia','Cook Islands','Costa Rica','Cuba','Dominican Republic','Ecuador','Fiji','Gabon','Gambia','Grenada','Guatemala','Guinea-Bissau','Guyana','Honduras','India','Indonesia','Jamaica','Kenya','Kiribati','Madagascar','Malaysia','Maldives','Marshall Islands','Mauritius','Mexico','Federated States of Micronesia','Mozambique','Nicaragua','Niue','Oman','Palau','Panama','Papua New Guinea','Philippines','Qatar','Saint Lucia','Samoa','Saudi Arabia','Senegal','Seychelles','Singapore','Solomon Islands','Sri Lanka','Suriname','Tanzania','Thailand','Tonga','Uganda','United Arab Emirates','Vanuatu','Vietnam','Zambia','Zimbabwe'}
for t in W['trips']:
 t['contentTier']='detailed-guide';t['evidenceDepth']='Inspected source text';t['jurisdictionType']='country';t['catalogOrigin']='retained-world-edition'
original_n=len(W['trips']);existing={t['id'] for t in W['trips']}
# Avoid colliding source keys with the retained edition.
remap={k:('global-'+k) for k in SOURCES}
for k,s in SOURCES.items():
 s=copy.deepcopy(s);s['id']=remap[k];W['sources'][s['id']]=s
for r in ROWS:
 s=SOURCES[r['source']];sid=remap[r['source']];water,hab,methods,access,land=K[r['kind']]
 ident='g-'+slug(s['country']+' '+r['place'])
 assert ident not in existing,ident;existing.add(ident)
 fishes=[f.strip() for f in r['fish'] if f.strip() and f.strip()!='Local targets to confirm'] or ['Local targets to confirm']
 modtitle,modtext=MODULES[module(r['kind'])]
 climate='warm' if s['country'] in warm_countries else 'cool'
 if r['kind'] in ('alpine','ice'):climate='cold'
 season=r['season'] or 'A reliable month-by-month fishing window has not been established from the inspected material for this particular trip. Ask the local operator or fisheries service to confirm the target, access and conditions for your dates before making non-refundable arrangements.'
 checked=s['status'] in ('page-text-inspected','text-inspected')
 title=r['place']+': '+r['angle'].lower()
 t=dict(id=ident,title=title,place=r['place'],country=s['country'],region=s['region'],water=water,habitats=hab,landscape=[land],methods=methods,access=access,climate=climate,fish=fishes,
 summary=r['angle']+' in '+r['place']+'. '+r['decision'].split('. ')[0]+'.',evidence=[dict(source=sid,claim=r['fact'])],season=season,
 sections=[dict(title='The decision that shapes this trip',text=r['decision']),dict(title=modtitle,text=modtext),dict(title='What is established—and what is not',text=('The named place or operator program is supported by the source statement above. '+('The relevant page text was inspected.' if checked else 'This expansion record was researched from an inspected search-result excerpt, not a complete independent review of the linked page.')+' The environment, access and gear categories are editorial planning scenarios to confirm locally, not guaranteed availability or unrestricted fishing access.'))],
 kit=kit_for(r),mistakes=['Do not confuse an operator’s broad species or activity list with a confirmed plan for your date.','Do not buy the entire list before checking what you own and what the guide actually supplies.'],questions=['Which exact water, target and method apply to my dates?','What equipment, transfers and personal items are included?','What conditions would change or cancel this fishing plan?'],related=[],
 review=dict(status='source-linked-brief',checked='2026-09-13',fieldTested=False,independentExpertReviewed=False,automatedAudit='see research/global-quality-report.json'),sourceIds=[sid],seasonWindows=[dict(months=r['months'],label=r['season'],source=sid)] if r['months'] else [],
 contentTier='trip-brief',evidenceDepth='Inspected source text' if checked else 'Inspected search excerpt',catalogOrigin='global-expansion',classificationStatus='Editorial planning scenario; confirm with the local provider',jurisdictionType='self-governing state in free association' if s['country'] in ('Cook Islands','Niue') else 'country',territory=r.get('territory'),locationPrecision='Named place or operator program',availabilityNote=r.get('availabilityNote','No live availability or Atlas booking inventory is connected.'),originalEditorialDecision=r['decision'],attributedFact=r['fact'])
 if r['kind']=='managed':t['summary']='Managed-fishery trip. '+t['summary'];t['sections'].insert(1,dict(title='A stocked venue, not a native-species distribution claim',text='Confirm the venue’s current stock and equipment requirements directly. Fish listed for managed lakes must not be interpreted as naturally occurring in nearby rivers or the country’s wild waters.'))
 t['sectionWordCount']=sum(len(x['text'].split()) for x in t['sections'])
 text=' '.join([t['summary'],r['fact'],season]+[x['text'] for x in t['sections']]+[x['specification']+' '+x['why'] for x in t['kit']]+t['mistakes']+t['questions'])
 t['articleWordCount']=len(text.split());t['uniqueDecisionWords']=len(r['decision'].split())
 W['trips'].append(t)
# Link to different real profiles; same-country alternatives take precedence over broad similarity.
for t in W['trips'][original_n:]:
 choices=[x for x in W['trips'] if x['id']!=t['id']]
 choices.sort(key=lambda x:(x['country']!=t['country'],not bool(set(x['habitats'])&set(t['habitats'])),x['region']!=t['region'],x['contentTier']!='detailed-guide',x['id']))
 t['related']=[x['id'] for x in choices[:3]]
W['edition']='global-003';W['reviewed']='2026-09-13'
W['backlog']=[dict(region='Global',country='Unrepresented countries',topic='Extend coverage without inventing trips',needed='A missing country is a research gap, not evidence that fishing is absent. Add a named water or a clearly described first-party fishing program with traceable evidence.'),dict(region='Global',country='All new brief collections',topic='Promote briefs into deeply researched guides',needed='Read complete sources, add independent corroboration, verify seasonal distinctions and have a local expert review the practical advice before labeling a page expert-vetted.'),dict(region='Global',country='All collections',topic='Exact products and real operator inventory',needed='Replace category searches with compatible product variants and establish actual operator relationships. No prices, booking slots or partnerships have been fabricated.')]
W['coverage']={'tripProfiles':len(W['trips']),'detailedGuides':original_n,'newTripBriefs':len(ROWS),'countryJurisdictionCollections':len({t['country'] for t in W['trips']}),'countriesExcludingFreeAssociatedStates':len({t['country'] for t in W['trips'] if t['jurisdictionType']=='country'}),'freeAssociatedStates':['Cook Islands','Niue'],'sources':len(W['sources']),'sourceInspection':dict(Counter(s['status'] for s in SOURCES.values())),'byRegion':dict(Counter(t['region'] for t in W['trips']))}
(ROOT/'src/world.json').write_text(json.dumps(W,ensure_ascii=False,indent=2))
(ROOT/'research/global-source-register.json').write_text(json.dumps(list(W['sources'].values()),ensure_ascii=False,indent=2))
print(json.dumps(W['coverage'],indent=2))
