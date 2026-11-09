#!/usr/bin/env python3
"""Audit the global catalog without claiming automated factual verification.
Checks reusable modules separately from each brief's original decision text.
"""
from pathlib import Path
from collections import Counter,defaultdict
from urllib.parse import urlsplit
from itertools import combinations
import re,json
ROOT=Path(__file__).resolve().parents[1]
w=json.loads((ROOT/'src/world.json').read_text());trips=w['trips'];sources=w['sources'];fail=[]
def check(x,msg):
 if not x:fail.append(msg)
def words(s):return re.findall(r"\b[\w'-]+\b",s.lower())
ids={t['id'] for t in trips};hnames={h['name'] for h in w['habitats']}
check(len(ids)==len(trips),'Duplicate trip ID')
check(len({t['title'] for t in trips})==len(trips),'Duplicate trip title')
check(len(trips)>=300,'Fewer than 300 trip profiles')
check(w['coverage']['countryJurisdictionCollections']==len({t['country'] for t in trips}),'Country count mismatch')
briefs=[t for t in trips if t['contentTier']=='trip-brief'];detailed=[t for t in trips if t['contentTier']=='detailed-guide']
check(len(detailed)==29,'An existing detailed guide was lost')
decisions={};sourcefactwords=Counter();unknown=[]
for t in trips:
 check(bool(t['place'].strip()) and bool(t['country'].strip()),t['id']+': missing geography')
 check(set(t['habitats'])<=hnames,t['id']+': unknown habitat')
 check(set(t['sourceIds'])<=sources.keys(),t['id']+': missing source')
 check(len(t['kit'])==4,t['id']+': missing equipment decisions')
 check(set(t['related'])<=ids,t['id']+': broken related trip')
 check(not t['review']['fieldTested'] and not t['review']['independentExpertReviewed'],t['id']+': unsupported expert claim')
 for k in t['kit']:check(all(k.get(x) for x in ('name','specification','why','decision')),t['id']+': incomplete gear decision')
 for win in t.get('seasonWindows',[]):
  check(bool(win['label']) and bool(win['months']) and win['source'] in t['sourceIds'],t['id']+': unqualified season')
  check(all(type(m)==int and 1<=m<=12 for m in win['months']),t['id']+': invalid month')
 if t['fish']==['Local targets to confirm']:unknown.append(t['id'])
 if t['contentTier']=='trip-brief':
  d=' '.join(words(t['originalEditorialDecision']))
  check(d not in decisions,t['id']+': duplicate local decision')
  check(len(words(d))>=25,t['id']+': insufficient local decision')
  decisions[d]=t['id']
  sourcefactwords[sources[t['sourceIds'][0]]['url']]+=len(words(t['attributedFact']))
for sid,s in sources.items():
 u=urlsplit(s['url']);check(u.scheme in ('http','https') and bool(u.netloc),sid+': invalid source URL')
 check(s.get('status') in ('text-inspected','page-text-inspected','search-excerpt-inspected'),sid+': missing inspection depth')
 check(bool(s.get('accessed')),sid+': no review date')
# Only unique locally authored decisions are measured here; shared modules are explicitly reused.
shingles={t['id']:{tuple(words(t['originalEditorialDecision'])[i:i+5]) for i in range(max(0,len(words(t['originalEditorialDecision']))-4))} for t in briefs}
pairs=[]
for a,b in combinations(shingles,2):
 score=len(shingles[a]&shingles[b])/max(1,len(shingles[a]|shingles[b]))
 if score>.15:pairs.append({'a':a,'b':b,'score':round(score,4)})
 check(score<.60,f'Near-identical local decisions: {a}, {b}')
newstatus=Counter(t['evidenceDepth'] for t in briefs)
places={(t['country'],t['place']) for t in trips}
used={sid for t in trips for sid in t['sourceIds']}|{e['source'] for h in w['habitats'] for e in h['evidence']}
report={'passed':not fail,'reviewed':'2026-09-13','scope':'Structural and provenance integrity. Not automated truth checking, field testing or local expert review.',
'counts':{**w['coverage'],'environmentGuides':len(w['habitats']),'retainedPreparationArticles':6,'newBriefEvidenceDepth':dict(newstatus),'profilesWithTargetStillUnconfirmed':len(unknown),'profilesWithDocumentedMonths':sum(bool(t.get('seasonWindows')) for t in trips),'distinctPlaceLabels':len(places),'sourcesUsed':len(used),'sourceRecords':len(sources),'singleSourceProfiles':sum(len(set(t['sourceIds']))==1 for t in trips),'multiSourceProfiles':sum(len(set(t['sourceIds']))>1 for t in trips),'originalLocalDecisionWordsNewBriefs':sum(len(words(t['originalEditorialDecision'])) for t in briefs)},
'checks':['At least 300 real explicitly authored trip scenarios; no Cartesian page generator','All original 29 detailed guides retained','Unique stable IDs, titles and local decision paragraphs','Source and related-trip references resolve','Four explained equipment requirements for every trip','Documented seasons include valid months and an attributed scope','No field-tested or independent-expert claims','Full-page and search-excerpt evidence are explicitly distinguished','Shared preparation modules excluded from original-research word count'],
'limitations':['280 new entries are trip briefs, not 280 deeply researched articles.','Most expansion sources were inspected through search-result excerpts; full-page review is incomplete.','Environment and access tags on briefs are editorial planning scenarios to confirm, not proof of unrestricted access.','A named profile can cover a regional program; profiles and country hubs are not all unique waterbodies.','Exact seasonal calendars and target fish remain unconfirmed on many briefs.','Shopping links are category searches, without exact-model vetting or a configured affiliate tag.','No live inventory, weather, pricing, booking, payments or escrow is connected.'],
'countries':dict(sorted(Counter(t['country'] for t in trips).items())),
'habitats':dict(Counter(h for t in trips for h in t['habitats'])),
'localDecisionSimilarityOver15Percent':sorted(pairs,key=lambda p:-p['score'])[:10],
'attributedFactWordsByNewSourceUrl':dict(sourcefactwords),
'failures':fail}
(ROOT/'research/global-quality-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':report['passed'],'counts':report['counts'],'failures':fail},indent=2))
if fail:raise SystemExit(1)
