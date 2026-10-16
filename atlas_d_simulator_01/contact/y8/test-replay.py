"""Corruption challenges operate ONLY on copies of recorded evidence, offline.
No controller mutation, browser injection, or fixture alteration of owner code.
"""
from pathlib import Path
import copy,json,importlib.util
R=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('replay',R/'replay.py');rp=importlib.util.module_from_spec(spec);spec.loader.exec_module(rp)
report=json.loads((R/'evidence/measurements.json').read_text());baseline=rp.replay(report);tests=[]
def challenge(name,change):
    fake=copy.deepcopy(report);change(fake)
    try:rp.replay(fake)
    except (AssertionError,KeyError,TypeError,ValueError) as e:tests.append({'name':name,'rejected':True,'reason':str(e)});return
    raise AssertionError('CORRUPTION_ACCEPTED: '+name)
def pair(q,kind='rudder'):
    t=q['trials'][0]['records'];e=next(e for e in t['events'] if e['kind']==kind and e['matchedRenderId'] is not None)
    r=next(r for r in t['frames'] if r['id']==e['matchedRenderId']);return e,r
challenge('recorded power differs from expected input',lambda q:pair(q,'power')[1]['sample']['sampledState'].__setitem__('throttle',.01))
challenge('HUD text changed while throttle is unchanged',lambda q:pair(q,'power')[1]['sample'].__setitem__('powerHUDText','1%'))
challenge('missing HUD is not a valid zero',lambda q:pair(q,'power')[1]['sample'].__setitem__('powerHUDText',None))
challenge('missing contemporaneous throttle',lambda q:pair(q,'power')[1]['sample']['sampledState'].__setitem__('throttle',None))
challenge('physical steering value mismatches owner rudder',lambda q:pair(q)[1]['sample']['physical'].__setitem__('controlNormalized',.25))
challenge('missing physical steering value',lambda q:pair(q)[1]['sample']['physical'].__setitem__('controlNormalized',None))
challenge('sampled rudder differs from input',lambda q:pair(q)[1]['sample']['sampledState'].__setitem__('rudder',.25))
challenge('forged expected value is not input evidence',lambda q:pair(q)[0].__setitem__('expected',.25))
challenge('trusted bit removed',lambda q:pair(q)[0].__setitem__('trusted',False))
challenge('matched render timestamp changed',lambda q:pair(q)[0].__setitem__('matchEndAbsoluteMs',0))
challenge('missing event values at capture',lambda q:pair(q)[0].pop('sampleAtEvent'))
challenge('owner origin falsely relabeled manual',lambda q:pair(q)[1]['origin'].__setitem__('kind','outside_raf_manual_or_diagnostic_unattributed'))
challenge('missing wall timestamp',lambda q:pair(q)[1]['start'].__setitem__('wallUnixMs',None))
challenge('consumed delta replaced by fixture dt zero',lambda q:pair(q)[1]['consumedSimulationDelta'].__setitem__('seconds',0))
challenge('claimed match dropped despite saved passing values',lambda q:pair(q)[0].__setitem__('matchedRenderId',None))
challenge('owner callback source differs from immutable text',lambda q:q['trials'][0]['records']['sourceMatches'][0].__setitem__('source','function fake(){}'))
# Direct negative predicates retain the exact missing values. No full record is
# rewritten to disguise a mismatch as an observed live unmatched event.
e,r=pair(report,'power');bad=copy.deepcopy(r);bad['sample']['powerHUDText']=None
assert rp.predicate(e,bad)=={'matched':False,'reasons':['HUD_MISMATCH_OR_MISSING']}
e,r=pair(report);bad=copy.deepcopy(r);bad['sample']['physical']['controlNormalized']=None
assert rp.predicate(e,bad)=={'matched':False,'reasons':['PHYSICAL_CONTROL_MISMATCH_OR_MISSING']}
result={'passed':True,'corruptionsRejected':len(tests),'negativePredicateCases':2,'tests':tests,'scope':'offline copies of saved evidence, not live gameplay scenarios','baselineMatched':baseline['matched']}
(R/'evidence/corruption-tests.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
