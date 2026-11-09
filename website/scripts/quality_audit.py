#!/usr/bin/env python3
"""Repeatable structural/editorial integrity checks, not an automated fact oracle."""
from pathlib import Path
import runpy,sys
if "global-003" in (Path(__file__).resolve().parents[1]/"src/world.json").read_text()[:120]:
    runpy.run_path(str(Path(__file__).with_name("global_quality_audit.py")),run_name="__main__")
    sys.exit(0)
from urllib.parse import urlsplit
from collections import Counter
from itertools import combinations
import re,json
ROOT=Path(__file__).resolve().parents[1]
w=json.loads((ROOT/'src/world.json').read_text()); failures=[]; observations=[]
def check(ok,msg):
    if not ok:failures.append(msg)
def words(text):return re.findall(r"\b[\w'-]+\b",text.lower())
def fulltext(t):
    chunks=[t.get('summary',''),t.get('season','')]+[e['claim'] for e in t['evidence']]+[s['title']+' '+s['text'] for s in t['sections']]
    if t.get('techniqueNote'):chunks.append(t['techniqueNote']['text'])
    chunks += [k['name']+' '+k['specification']+' '+k['why'] for k in t.get('kit',[])]+t.get('mistakes',[])+t.get('questions',[])+t.get('checklist',[])
    return '\n'.join(chunks)
trips=w['trips'];habitats=w['habitats'];allarticles=trips+habitats
ids=[t['id'] for t in allarticles];check(len(ids)==len(set(ids)),'Duplicate article ID')
check(len({t['title'].casefold() for t in allarticles})==len(allarticles),'Duplicate article title')
hnames={h['name'] for h in habitats};tripids={t['id'] for t in trips};stats=[];paragraphs={}
for a in allarticles:
    aid=a['id'];typ='trip' if aid in tripids else 'environment'
    check(len(a['sections'])>=3,f'{aid}: missing authored body')
    check(bool(a['evidence']),f'{aid}: missing attributed evidence')
    check(a['review']['independentExpertReviewed'] is False,f'{aid}: unsubstantiated expert-review claim')
    check(a['review']['fieldTested'] is False,f'{aid}: unsubstantiated field-test claim')
    sourceids={e['source'] for e in a['evidence']}
    if a.get('techniqueNote'):sourceids.add(a['techniqueNote']['source'])
    if typ=='trip':
        check(sourceids.issubset(set(a['sourceIds'])),f'{aid}: sourceIds omit an attributed claim')
        sourceids=set(a['sourceIds'])
        check(set(a['habitats']).issubset(hnames),f'{aid}: unknown environment')
        check(set(a['related']).issubset(tripids),f'{aid}: unresolved related article')
        check(len(a['kit'])==4,f'{aid}: incomplete equipment decision set')
        check(len(a['questions'])>=3 and len(a['mistakes'])>=2,f'{aid}: missing practical editorial sections')
        for k in a['kit']:
            check(all(k.get(v) for v in ['name','specification','why','decision']),f'{aid}: unexplained gear recommendation')
            check(k['decision'] in ['confirm','consider','optional'],f'{aid}: unsupported gear decision state')
        for win in a.get('seasonWindows',[]):
            check(bool(win['label']) and bool(win['months']),f'{aid}: unqualified seasonal range')
            check(all(isinstance(m,int) and 1<=m<=12 for m in win['months']),f'{aid}: invalid month')
            check(win['source'] in sourceids,f'{aid}: seasonal source missing')
    for sid in sourceids:check(sid in w['sources'],f'{aid}: missing source {sid}')
    for sec in a['sections']:
        txt=' '.join(words(sec['text']))
        check(len(words(sec['text']))>=25,f'{aid}: empty/fragmentary section')
        if txt in paragraphs:failures.append(f'Verbatim reused editorial paragraph: {paragraphs[txt]} and {aid}')
        paragraphs[txt]=aid
    stats.append({'id':aid,'type':typ,'body_words':len(words(fulltext(a))),'sources':len(sourceids),'independent_expert_review':False})
for sid,source in w['sources'].items():
    u=urlsplit(source['url']);check(u.scheme=='https' and bool(u.netloc),f'{sid}: malformed source URL')
    check(source['accessed']==w['reviewed'] and source['status']=='text-inspected',f'{sid}: missing inspection record')
# Five-word-shingle comparison of only the original explanatory body, excluding shared UI.
shingles={}
for a in allarticles:
    tokens=words(' '.join(s['text'] for s in a['sections']))
    shingles[a['id']]={tuple(tokens[i:i+5]) for i in range(max(0,len(tokens)-4))}
pairs=[]
for a,b in combinations(shingles,2):
    sa,sb=shingles[a],shingles[b];score=len(sa&sb)/max(1,len(sa|sb))
    pairs.append((score,a,b));check(score<.25,f'Potential near-duplicate body: {a}, {b}: {score:.3f}')
# Report limitations rather than converting completeness into a false expertise score.
single=sum(s['sources']==1 for s in stats if s['type']=='trip')
used={sid for t in trips for sid in t['sourceIds']}|{e['source'] for h in habitats for e in h['evidence']}
report={'passed':not failures,'reviewed':w['reviewed'],'scope':'Structure, references and text uniqueness only. This script does not establish truth, live conditions, or independent expert approval.',
 'counts':{'trip_guides':len(trips),'environment_guides':len(habitats),'authored_article_words_excluding_shared_UI':sum(s['body_words'] for s in stats),'countries':len({t['country'] for t in trips}),'regions':len({t['region'] for t in trips}),'inspected_source_records':len(w['sources']),'sources_linked_to_new_guides':len(used),'single_source_trip_guides':single,'multi_source_trip_guides':len(trips)-single,'qualified_seasonal_trip_guides':sum(bool(t.get('seasonWindows')) for t in trips),'recorded_research_exclusions_or_qualifications':len(w['issues'])},
 'checks':['Unique article IDs and titles','Attributed evidence and valid source records','No unsupported independent-review or field-test labels','Habitat and related-trip references resolve','Every kit decision explains its requirement and reason','Seasonal windows retain scope labels and source IDs','No exact duplicated authored paragraphs','Five-word-shingle near-duplicate body check'],
 'limits':[f'{single} of {len(trips)} local trip guides rely on one cited source; they are not independently triangulated.','All articles still need independent subject-matter review before being called expert-vetted.','Category shopping links have not been converted to exact-model product reviews.','A linked source is not proof of every editorial recommendation; only explicit attributed claims are represented as sourced.','No current-condition, weather, retailer-availability or booking-inventory feed is connected.'],
 'highest_body_similarity':[{'a':a,'b':b,'jaccard_5_word_shingles':round(s,5)} for s,a,b in sorted(pairs,reverse=True)[:5]],'articles':stats,'failures':failures}
(ROOT/'research/quality-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
md=['# Fishing Atlas World Edition — Research and QA audit',f'\nReviewed: {w["reviewed"]}', '\n## Completed content', '\n'+ '\n'.join(f'- {k.replace("_"," ")}: **{v}**' for k,v in report['counts'].items()), '\n## Automated integrity checks', '\n'+ '\n'.join('- '+x for x in report['checks']), '\n**Result:** '+('PASS' if report['passed'] else 'FAIL'), '\nThese are structural and text-integrity checks, not a substitute for subject-matter expertise.', '\n## Remaining editorial limitations', '\n'+'\n'.join('- '+x for x in report['limits']), '\n## Research decisions actually made', '\n'+'\n'.join(f'- **{x["severity"].title()} — {w["sources"][x["source"]]["title"]}:** {x["issue"]} {x["decision"]}' for x in w['issues']), '\n## Guide register', '\n| Guide | Type | Original article words | Cited sources |\n|---|---|---:|---:|', '\n'.join(f'| {x["id"]} | {x["type"]} | {x["body_words"]} | {x["sources"]} |' for x in stats), '\n## Browser and runtime checks', '\nThe companion test reports describe document-level desktop/mobile behavior, static links and pure planner rules. The browser harness uses an in-memory document and a localStorage shim. Public hosting, real retailer conversions, live forms, native downloads and payment integrations have not been tested.', '\n## How to reproduce', '\n```sh\npython3 scripts/build.py\npython3 scripts/quality_audit.py\npython3 tests/static_test.py\nnode --test tests/engine.test.cjs tests/world-engine.test.cjs\npython3 tests/world_browser_test.py\n```']
(ROOT/'research/QUALITY-REPORT.md').write_text('\n'.join(md))
(ROOT.parent/'Fishing-Atlas-Research-Audit.md').write_text('\n'.join(md))
print(json.dumps({'passed':report['passed'],'counts':report['counts'],'failures':failures},indent=2))
if failures:raise SystemExit(1)
