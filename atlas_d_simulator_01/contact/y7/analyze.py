"""Independent event/source classification; no inferred performance attribution."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parent;E=R/'evidence'
d=json.loads((E/'startup.json').read_text());assert d['passed'] and not d['errors']
assert not d['runtimeChanged'] and d['runtimeCandidate'] is None
assert len(d['scenarios'])==12 and all(x['passed'] for x in d['scenarios'])
STALL='Rendering stalled. Paused instead of pretending simulated time kept up.'
summary={'passed':True,'runtimeBaseline':d['runtimeBaseline'],'sourceSHA':d['sourceSHA'],'runtimeCandidate':None,'runtimeChanged':False,'environment':d['environment'],'layouts':{},'traces':[],'safety':[],'limitations':['Event timestamps are lifecycle evidence, not CPU/GPU profiling.','Loop-boundary observation wraps existing owner callbacks; it does not start another loop. Event-only comparison has no RAF wrapper. Neither is zero-overhead.','Same runner and action ordering reduce environment confounds; small counts are not device or frequency estimates.','Tab-background acceptance requires actual hidden visibility; absent browser support remains unavailable.']}
for layout in ['portrait','landscape']:
 rows=[x for x in d['scenarios'] if x['layout']==layout];assert len(rows)==6
 summary['layouts'][layout]={}
 for mode in ['events-only','loop-boundary']:
  q=[x for x in rows if x['mode']==mode];assert len(q)==3
  summary['layouts'][layout][mode]={'trials':len(q),'startupPauses':sum(x['startupDisposition']!='NO_PAUSE_OBSERVED' for x in q),'dispositions':[x['startupDisposition'] for x in q]}
for row in d['scenarios']:
 trace=row['hostTrace'];assert not trace['errors'];start=row['beforeBoard']['absolute'];end=row['startupEnd']['absolute']
 events=[x for x in trace['events'] if start<=x['absolute']<=end]
 manual=[x for x in events if x.get('event')=='click' and x.get('target')=='ad-pause'];assert not manual
 hidden=[x for x in events if x.get('event')=='visibilitychange' and x['hidden']]
 board=[x for x in events if x.get('event')=='click' and x.get('target')=='ad-board' and x.get('trusted')];assert board
 transitions=[x for x in trace['ownerLoopTransitions'] if start<=x['after']['absolute']<=end and x['before']['state'] and x['before']['state']['paused'] is False and x['after']['state']['paused'] is True]
 if row['startupDisposition']=='INHERITED_STALL_GUARD':
  assert row['startupEnd']['state']['message']==STALL and not hidden
  if row['mode']=='loop-boundary':assert transitions
 for x in transitions:
  assert x['after']['state']['message']==STALL and not x['before']['hidden'] and not x['after']['hidden']
  assert x['after']['state']['elapsed']==x['before']['state']['elapsed']
  assert 'if(dt>4&&!state.paused)' in trace['ownerLoopSource']
  if x['consecutiveNoLastReset']:assert x['timestamp']-x['previousTimestamp']>4000
 out={'layout':row['layout'],'mode':row['mode'],'repeat':row['repeat'],'disposition':row['startupDisposition'],'startupEvents':events,'ownerLoopTransitions':transitions,'resumeBefore':row['resumeBefore'],'resumeAfter':row['resumeAfter'],'recoveredElapsedAdvance':row['recoveredEnd']['elapsed']-row['recoveredStart']['elapsed']}
 assert out['recoveredElapsedAdvance']>0
 if row['resumeAfter']:
  assert row['resumeBefore']['state']['paused'] and not row['resumeAfter']['state']['paused']
  clicks=[x for x in trace['events'] if row['resumeBefore']['absolute']<=x['absolute']<=row['resumeAfter']['absolute'] and x.get('event')=='click' and x.get('target')=='ad-pause' and x.get('trusted')];assert clicks
 for p in [row['physicalCheck'],row.get('physicalAfterSafety')]:
  if p is None:continue
  assert p['sourceUnchanged'] and p['physical']['available'] and not p['rig'] and p['mapped']['attachment'] is None
  assert len(p['rays'])==5 and all(x['hit'] and x['errorM']<1e-5 and x['normalError']<1e-6 for x in p['rays'])
 if 'safety' in row:
  s=row['safety'];after=s['blurAfter']['state'];assert after['throttle']==0 and after['rudder']==0 and not after['paused']
  assert any(x.get('event')=='blur' and x.get('windowTarget') and x.get('trusted') and s['blurBefore']['absolute']<=x['absolute']<=s['blurAfter']['absolute'] for x in trace['events'])
  assert s['manualPaused']['state']['elapsed']==s['pausedRotation']['state']['elapsed'] and s['pausedRotation']['state']['paused']
  a,b=s['rotationBefore']['frame'],s['rotationAfter']['frame']
  for key in ['instanceId','activationEpoch','simulationEpoch','hostSessionId','worldRevision']:assert a[key]==b[key]
  assert b['frameId']>a['frameId']
  if s['backgroundCoverage']=='ACTUAL_HIDDEN_TRANSITION':assert s['backgroundFrozen'] and s['foreground']['state']['paused']
  summary['safety'].append({'layout':row['layout'],**s})
 assert all(x['outsideDiagnosis'] for x in row['screenshots'])
 summary['traces'].append(out)
summary['startupPauseCount']=sum(x['disposition']!='NO_PAUSE_OBSERVED' for x in summary['traces'])
summary['exactLoopStallTransitions']=sum(len(x['ownerLoopTransitions']) for x in summary['traces'])
summary['disposition']='INHERITED_STALL_GUARD_REPRODUCED' if summary['startupPauseCount'] else 'STARTUP_PAUSE_NOT_REPRODUCED_IN_THIS_RUN'
(E/'analysis.json').write_text(json.dumps(summary,indent=2))
print(json.dumps({k:v for k,v in summary.items() if k not in ['traces','safety']},indent=2))
