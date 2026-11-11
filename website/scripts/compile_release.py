#!/usr/bin/env python3
"""Import a real editorial backlog without upgrading its evidence by implication."""
from pathlib import Path
from collections import Counter,defaultdict
from copy import deepcopy
import json,re,csv
ROOT=Path(__file__).resolve().parents[1]
plan=json.loads((ROOT/'src/north-america-plan.json').read_text())
world=json.loads((ROOT/'src/world-before-na.json').read_text())
original=deepcopy(world['trips']); oldby={t['id']:t for t in original}
slug=lambda s:re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
MODULES={m['code']:m for m in plan['gear_modules']}
# These are packing scenarios, not conclusions about the fishery or forecast.
SCENARIOS={
'SALMON_RIVER':('Freshwater',['Rivers & streams'],['Fly','Lure / spinning'],['Bank','River float'],'mixed'),
'BOTTOM':('Saltwater',['Reef & bottom'],['Bottom fishing'],['Charter boat'],'mixed'),
'RIVER_TROUT':('Freshwater',['Rivers & streams'],['Fly','Lure / spinning'],['Bank','Guided wading'],'mixed'),
'SPRING_CREEK':('Freshwater',['Spring-fed streams'],['Fly','Lure / spinning'],['Bank','Guided wading'],'mixed'),
'REMOTE':('To confirm',['Rivers & streams','Lakes & reservoirs'],['Guide-selected'],['Guided boat'],'mixed'),
'STEELHEAD':('Freshwater',['Rivers & streams'],['Fly','Lure / spinning'],['Bank','River float'],'mixed'),
'SALMON_OCEAN':('Saltwater',['Reef & bottom'],['Trolling / guide-selected'],['Charter boat'],'mixed'),
'ICE':('Freshwater',['Ice fishing'],['Ice jigging'],['Guided ice'],'cold'),
'OFFSHORE':('Saltwater',['Offshore'],['Trolling / guide-selected'],['Charter boat'],'mixed'),
'FLATS':('Saltwater',['Saltwater flats'],['Fly','Lure / spinning'],['Skiff'],'mixed'),
'SMALL_STREAM':('Freshwater',['Rivers & streams'],['Fly','Lure / spinning'],['Bank'],'mixed'),
'ROCK_SHORE':('Saltwater',['Surf & beaches'],['Lure / spinning','Bait fishing'],['Bank'],'mixed'),
'LAKE_TROUT':('Freshwater',['Lakes & reservoirs'],['Lure / spinning','Trolling / guide-selected'],['Bank','Guided boat'],'mixed'),
'WALLEYE':('Freshwater',['Lakes & reservoirs'],['Lure / spinning','Trolling / guide-selected'],['Bank','Guided boat'],'mixed'),
'SURF':('Saltwater',['Surf & beaches'],['Lure / spinning','Bait fishing'],['Bank'],'mixed'),
'BASS_LAKE':('Freshwater',['Lakes & reservoirs'],['Lure / spinning'],['Bank','Guided boat'],'mixed'),
'ALPINE':('Freshwater',['Alpine lakes'],['Fly','Lure / spinning'],['Hike-in'],'mixed'),
'INSHORE':('Brackish',['Estuaries & mangroves'],['Lure / spinning','Fly','Bait fishing'],['Skiff'],'mixed'),
'STURGEON':('Freshwater',['Rivers & streams'],['Guide-selected'],['Guided boat'],'mixed'),
'CATFISH':('Freshwater',['Rivers & streams','Lakes & reservoirs'],['Bait fishing'],['Bank','Guided boat'],'mixed'),
'PANFISH':('Freshwater',['Lakes & reservoirs'],['Lure / spinning','Bait fishing'],['Bank'],'mixed'),
'BASS_RIVER':('Freshwater',['Rivers & streams'],['Lure / spinning','Fly'],['Bank','River float'],'mixed'),
'MUSKIE':('Freshwater',['Lakes & reservoirs'],['Lure / spinning'],['Guided boat'],'mixed'),
'GREAT_LAKES':('Freshwater',['Lakes & reservoirs'],['Trolling / guide-selected'],['Charter boat'],'mixed'),
'EXOTIC':('Freshwater',['Rivers & streams'],['Lure / spinning','Fly'],['Bank','Guided boat'],'mixed'),
'NEARSHORE':('Saltwater',['Reef & bottom'],['Guide-selected'],['Charter boat'],'mixed'),
}
# Ensure scenario labels use the existing environmental taxonomy exactly.
hnames={h['name'] for h in world['habitats']}
print('Environment labels:',sorted(hnames))
name_alias={'Spring-fed streams':'Spring-fed streams','Surf & beaches':'Surf & beaches','Alpine lakes':'Alpine lakes','Ice fishing':'Ice fishing','Offshore':'Offshore'}
for code,(water,hs,methods,access,climate) in list(SCENARIOS.items()):
 hs=[next((h for h in hnames if h.lower()==x.lower()),x) for x in hs]
 SCENARIOS[code]=(water,hs,methods,access,climate)
# Migrate exact opportunities. Broad parents remain separate and visible.
byplan=defaultdict(list)
for m in plan['existing_migration']:
 if m['planned_id_or_parent'] in {p['id'] for p in plan['trips']} and not m['existing_id']=='keys-offshore':
  byplan[m['planned_id_or_parent']].append(m['existing_id'])
consumed=set();out=[];migration=[]
def prep_record(p):
 water,hs,methods,access,climate=SCENARIOS[p['gear_code']]
 t={
 'id':'na-'+p['id'].lower(),'title':p['location']+' fishing: '+p['gear_module'].lower()+' trip preparation',
 'place':p['location'],'country':p['country'],'region':'North America','jurisdictionType':'country',
 'water':water,'habitats':hs,'landscape':[p['environment_research']], 'methods':methods,'access':access,'climate':climate,
 'fish':[], 'candidateTargets':p['candidate_targets'],
 'summary':p['local_decision_to_research'],
 'contentTier':'preparation-brief','evidenceDepth':'Production brief; local fishery claims not yet verified',
 'catalogOrigin':'north-america-production-import','sourceIds':[],'evidence':[],'related':[],
 'review':{'checked':None,'imported':'2026-09-13','status':'research-pending','fieldTested':False,'independentExpertReviewed':False},
 'season':'Dates have not been verified for this opportunity. Before choosing travel dates, resolve: '+p['season_research']+'.',
 'seasonWindows':[],
 'sections':[
 {'title':'Start with the decision that changes this trip','text':p['local_decision_to_research']+' Treat this as the question to settle with a local source, not as an already confirmed itinerary. Record the agreed water or departure point in your saved plan before choosing equipment.'},
 {'title':'Choose the access and fishing method','text':'For '+p['location']+', the preparation scenario is '+p['gear_module'].lower()+'. The working access question is: '+p['access_research']+'. Select only the option the local provider or access source confirms. A nearby fishery or a state-wide guide does not establish access to this specific outing.'},
 {'title':'Build a compatible setup, not a shopping bundle','text':p['tackle_research']+'. Check your existing rod, reel and line against that decision. Keep technical purchases on hold until the presentation and specifications are settled; a similar product name is not a compatibility check.'},
 {'title':'Pack for the actual itinerary','text':p['personal_kit']+'. Enter visit length, laundry access and existing equipment in the checklist. The framework includes both cool- and warm-weather options for mixed conditions; choose clothing weights from an actual forecast rather than the country name.'},
 {'title':'Confirm inclusions before buying','text':'Ask specifically about: '+p['operator_provision_question']+'. Mark an item “Guide provides” only after receiving confirmation for your booking. Avoid buying '+p['avoid_buying'][0].lower()+p['avoid_buying'][1:]+'.'},
 ],
 'kit':[
 {'name':p['gear_module']+' tackle system','specification':p['tackle_research'],'why':'The actual method must be confirmed before matching rod, reel, line and terminal tackle.','decision':'confirm','query':''},
 {'name':'Access-specific personal equipment','specification':p['personal_kit'],'why':'Match what you bring to the access and duration, then reuse suitable equipment you already own.','decision':'confirm','query':''},
 {'name':'Operator-supplied equipment check','specification':p['operator_provision_question'],'why':'Do not spend on equipment included in the actual trip. A directory listing is not confirmation.','decision':'confirm','query':''},
 {'name':'Compact weather-protected day storage','specification':'Choose capacity after the local route, transport and carried load are known.','why':'Keep personal essentials and spare layers separated from wet tackle; skip this purchase when a suitable bag is already owned.','decision':'optional','query':'waterproof roll top dry bag fishing small'},
 ],
 'mistakes':['Treating a candidate species or seasonal assumption as verified local guidance.',p['avoid_buying']+'.'],
 'questions':[p['local_review_prompt'],'What access, seasonal and tackle details apply to our actual dates?','What is included, and what should we not buy before you confirm the trip?'],
 'availabilityNote':'No availability, guide partnership or bookable price has been confirmed.',
 'classificationStatus':'Editorial preparation scenario from the production brief; local methods and access remain to be checked.',
 }
 return t
for p in plan['trips']:
 ids=byplan.get(p['id'],[])
 if ids:
  t=deepcopy(oldby[ids[0]])
  for oid in ids:
   consumed.add(oid)
   if oid!=ids[0]:
    # Keep the subarea evidence with its original attribution, not as a new lake.
    s=oldby[oid]
    t['sourceIds']=list(dict.fromkeys(t['sourceIds']+s['sourceIds']))
    t['evidence']+=s['evidence']
  t['legacyIds']=ids
  migration.extend({'oldId':i,'planId':p['id'],'canonicalPath':p['proposed_url'],'action':'merged into same opportunity' if i!=ids[0] else 'retained and connected to production route'} for i in ids)
 else:t=prep_record(p)
 t.update({'planId':p['id'],'state':p['state'],'stateCode':p['state_code'],'countryCode':p['country_code'],
 'subregion':p['region'],'canonicalPath':p['proposed_url'],'priority':p['priority'],'gearCode':p['gear_code'],
 'researchQuestion':p['local_decision_to_research'],'candidateTargets':p['candidate_targets'],
 'researchLeads':{'authorityDomain':p['authority_domain_lead'],'authorityQuery':p['authority_search'],
 'corroborationQuery':p['local_corroboration_search'],'status':'Search leads, not inspected source evidence'},
 'distribution':{'angle':p['distribution_angle'],'searchIntentHypothesis':p['search_intent_hypothesis']},
 'indexEligible':False})
 if t['contentTier']=='detailed-guide' and not t['id'] in ['tanana-glacial-system','rocky-mountain-alpine']:
  t['indexEligible']=True
 out.append(t)
retained=[deepcopy(t) for t in original if t['id'] not in consumed]
for t in retained:
 t['canonicalPath']='/trips/'+t['id']+'/'
 t['indexEligible']=t.get('contentTier')=='detailed-guide'
 t['planId']=None
out+=retained
# Apply only individually reviewed evidence and authored enrichment; no mass tier promotion.
extra_path=ROOT/'src/release-enrichment.json'
if extra_path.exists():
 extras=json.loads(extra_path.read_text())
 world['sources'].update(extras['sources'])
 for t in out:
  if t.get('planId') in extras['trips']:
   e=deepcopy(extras['trips'][t['planId']]);t.update(e)
   t['review']={'checked':'2026-09-13','status':'source-checked','fieldTested':False,'independentExpertReviewed':False}
   t['evidenceDepth']='Full source-page text inspected in this release; not independently expert-reviewed'
   t['indexEligible']=True;t['contentTier']='detailed-guide'
# Local trip-type membership is independent from the destination's evidence status.
from trip_types import compile_into as compile_trip_types
compile_trip_types(world, out, ROOT)
from trip_styles import compile_into as compile_trip_styles
compile_trip_styles(world, out, ROOT)
from guides import compile_into as compile_guides
compile_guides(world, out, ROOT)
from species_glossary import compile_into as compile_species
compile_species(world, out, ROOT)
# Classify editorial regions before page rendering, so a single clean build has working filters.
groups=json.loads((ROOT/'src/continent-regions.json').read_text())
for t in out:
 if t['region'] in groups:
  t['subregion']=next((name for name,countries in groups[t['region']].items() if t['country'] in countries),'Additional country research')
 elif not t.get('subregion'):
  t['subregion']='Retained broad U.S. guides' if t['country']=='United States' else 'Central America' if t['country'] in ['Belize','Costa Rica','Guatemala','Honduras','Nicaragua','Panama'] else 'Caribbean'
for t in out:
 if not t.get('related'):
  candidates=[x for x in out if x['id']!=t['id'] and x.get('state') and x.get('state')==t.get('state') and x['country']==t['country']]
  t['related']=[x['id'] for x in candidates[:3]]
 # Remove obsolete merged IDs from relationship lists.
 for old in consumed:
  if old not in {x['id'] for x in out}:
   target=next(x['id'] for x in out if old in x.get('legacyIds',[]))
   t['related']=[target if i==old else i for i in t['related']]
 t['related']=list(dict.fromkeys(i for i in t['related'] if i!=t['id']))
for t in out:
 t['articleWordCount']=sum(len(x['text'].split()) for x in t['sections'])
world['trips']=out;world['edition']='Continental edition / 004';world['reviewed']='2026-09-13'
world['coverage']={**world.get('coverage',{}),'tripProfiles':len(out),'detailedGuides':sum(t['contentTier']=='detailed-guide' for t in out),
 'newTripBriefs':sum(t['contentTier']=='trip-brief' for t in out),'preparationBriefs':sum(t['contentTier']=='preparation-brief' for t in out),
 'sources':len(world['sources']),'sourceInspection':dict(Counter(x.get('status','text-inspected') for x in world['sources'].values())),'byRegion':dict(Counter(t['region'] for t in out)),
 'northAmericaProductionRecords':sum(bool(t.get('planId')) for t in out)}
world['migration']=migration
(ROOT/'src/world.json').write_text(json.dumps(world,ensure_ascii=False,indent=2))
(ROOT/'research/release-migration.json').write_text(json.dumps(migration,indent=2))
print(json.dumps(world['coverage'],indent=2))
print('Imported plan rows:',sum(bool(t.get('planId')) for t in out),'unique states:',len({t.get('state') for t in out if t.get('countryCode')=='US'}))
assert len({t['id'] for t in out})==len(out)
assert len({t['canonicalPath'] for t in out})==len(out)
assert sum(bool(t.get('planId')) for t in out)==507
