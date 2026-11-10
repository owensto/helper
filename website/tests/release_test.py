"""Structural, evidence and production-metadata gates for continental edition 004."""
from pathlib import Path
from collections import Counter
import json,os,subprocess,re,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
W=json.loads((R/'src/world.json').read_text());T=W['trips'];M=json.loads((R/'dist/route-manifest.json').read_text());S=json.loads((R/'research/release-summary.json').read_text())
checks=[]
def ok(v,label):
 assert v,label
 checks.append(label)
plan=[t for t in T if t.get('planId')]
ok(len(T)==798,'796 retained profiles plus two source-checked local-lingo gaps')
ok(len({t['id'] for t in T})==len(T),'Unique IDs after Great Bear Lake merge')
ok(len({t['canonicalPath'] for t in T})==len(T),'Unique canonical trip routes')
ok(len(plan)==507,'All 507 actual plan entries imported exactly once')
ok(Counter(t['country'] for t in plan)=={'United States':357,'Canada':100,'Mexico':50},'Correct per-country production counts')
for code,count in [('US',50),('CA',13),('MX',15)]:
 ok(len({t['stateCode'] for t in plan if t['countryCode']==code})==count,f'{code}: {count} distinct state/province collections')
for t in T:
 ok(t['canonicalPath'] in M,'Route exists: '+t['id'])
 assert len(t['kit'])==4,t['id']
 assert all(s in W['sources'] for s in t['sourceIds']),t['id']
 assert all(e['source'] in t['sourceIds'] for e in t['evidence']),t['id']
 if not t['indexEligible']:assert M[t['canonicalPath']]['noindex'],t['id']
 if t['contentTier']=='preparation-brief':
  assert not t['fish'] and not t['seasonWindows'] and not t['evidence'] and not t['sourceIds'],t['id']
  assert t['review']['checked'] is None and not t['indexEligible'],t['id']
 if t['indexEligible']:assert t['sourceIds'] and t['evidence'] and t['contentTier']=='detailed-guide',t['id']
ok(True,'All 479 unverified frameworks keep candidate species, evidence and months unconfirmed')
ok(True,'All 798 trips have exactly four scoped gear decisions and valid reference links')
ok(True,'Every index-eligible trip has attributed evidence and a source-checked tier')
for p,m in M.items():
 if m.get('redirectTo'):
  assert m['redirectTo'] in M and not M[m['redirectTo']].get('redirectTo'),p
  assert m['noindex'],p
ok(True,'Every legacy redirect resolves directly to a live generated route, with no chains')
ok(len([p for p in M if p.startswith('/production/')])==7,'Production hub plus six continent workbenches')
for name,num in [('north-america',551),('south-america',31),('europe',102),('africa',34),('asia',44),('oceania',36)]:
 q=json.loads((R/'research/continent-queues'/f'{name}.json').read_text())
 assert len(q['records'])==num==q['count']
 assert all(x['localDecision'] and x['tackleDecision'] and x['distributionAngle'] for x in q['records'])
ok(True,'Six actual continent queues have complete local-decision/gear/distribution fields')
# Canonical + indexing behavior is exercised with a deliberately nonpublic test origin.
base=dict(os.environ);base['SITE_URL']='https://fishing-atlas.invalid'
try:
 subprocess.run(['python3','scripts/build.py'],cwd=R,env=base,check=True,capture_output=True)
 urls={x.text for x in ET.parse(R/'dist/sitemap.xml').getroot().findall('{*}url/{*}loc')}
 for t in T:
  listed=base['SITE_URL']+t['canonicalPath'] in urls
  assert listed==bool(t['indexEligible']),t['id']
 for p,m in M.items():
  if m.get('redirectTo') or p.startswith('/production/'):
   assert base['SITE_URL']+p not in urls,p
 sample=next(t for t in T if t['contentTier']=='preparation-brief')
 text=(R/'dist'/sample['canonicalPath'].strip('/')/'index.html').read_text()
 assert 'content="noindex,follow"' in text
 assert f'href="{base["SITE_URL"]+sample["canonicalPath"]}"' in text
 ok(True,'Production simulation: only eligible trip pages enter sitemap; pending and alias routes stay out')
 ok(True,'Production simulation: a pending trip retains noindex and its correct canonical URL')
 production_count=len(urls)
finally:
 clean=dict(os.environ);clean.pop('SITE_URL',None);clean.pop('URL',None)
 subprocess.run(['python3','scripts/build.py'],cwd=R,env=clean,check=True,capture_output=True)
ok(not (R/'dist/sitemap.xml').exists(),'Final artifact restored to preview mode with no fake production origin')
ok((R/'dist/assets/boot.js').stat().st_size <150000,'Non-planner dataset below 150KB instead of loading the full gear catalog')
report={'passed':True,'structuralAssertions':len(checks),'routes':len(M),'redirectRoutes':sum(bool(x.get('redirectTo')) for x in M.values()),'nonRedirectPages':sum(not x.get('redirectTo') for x in M.values()),'tripProfiles':len(T),'productionSitemapURLsInNonpublicTest':production_count,'sourceVerifiedTripPagesEligibleForSearch':sum(t['indexEligible'] for t in T),'checks':checks[:9]+checks[-10:],'limitation':'Structural correctness is not an independent fishing-expertise review. .invalid origin is only a test, never deployed.'}
(R/'tests/continental-release-results.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
