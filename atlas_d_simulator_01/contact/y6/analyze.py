"""Derive distribution tables from raw direct RAF, render and trusted-event records.
No sparse evidence history is interpreted as a frame-rate measurement.
"""
from pathlib import Path
import json,math,statistics,sys
R=Path(__file__).resolve().parent;E=R/'evidence'
def dist(x):
 x=sorted(x)
 if not x:return {'n':0}
 def p(q):
  v=(len(x)-1)*q;i=math.floor(v);return x[i]+(x[min(i+1,len(x)-1)]-x[i])*(v-i)
 return {'n':len(x),'min':x[0],'p50':p(.5),'p90':p(.9),'p95':p(.95),'p99':p(.99),'max':x[-1],'mean':statistics.mean(x)}
def summarize(d):
 rows=[]
 for trial in d['trials']:
  t=trial.get('timing');
  if not t:continue
  f=t['frames'];r=t['raf'];events=t['events'];ms=lambda key:[e[key]-e['eventAbsolute'] for e in events if e.get(key) is not None]
  z={'mode':trial['mode'],'repeat':trial['trial'],'rafIntervalMs':dist([b['stamp']-a['stamp'] for a,b in zip(r,r[1:])]),'ownerRenderIntervalMs':dist([b['start']-a['start'] for a,b in zip(f,f[1:])]),'renderSubmissionMs':dist([x['totalSubmissionMs'] for x in f]),'eventToMatchingRenderMs':dist(ms('renderSubmittedAbsolute')),'eventToFollowingRAFOpportunityMs':dist(ms('nextRAFAbsolute')),'inputHandlerDelayMs':dist([e['handlerObservedAbsolute']-e['eventAbsolute'] for e in events]),'samplerCallbackMs':dist(t['callbackCPU']),'feedbackBookkeepingMs':dist(t['bookkeeping']),'browserEventTimingQuantizedMs':dist([e['duration'] for e in t['eventTiming'] if e['startAbsolute']>=t['started']]),'events':len(events),'allEventsRendered':all(e.get('renderSubmittedAbsolute') and e.get('nextRAFAbsolute') for e in events),'wallSeconds':(t['ended']-t['started'])/1000}
  if trial['mode']=='profile':
   for key in ['previewMs','nativeMs','observerSelfReportedMs','domMs','layoutMs','cameraMs','cameraCloneMs','cameraLookMs','boxMs']:z[key]=dist([x.get(key,0) for x in f])
   z['previewPercentOfSynchronousSubmission']=100*sum(x['previewMs'] for x in f)/sum(x['totalSubmissionMs'] for x in f)
  rows.append(z)
 return {'passed':d['passed'],'layout':d['layout'],'runtimeBaseline':d['runtimeBaseline'],'sourceSHA':d['sourceSHA'],'trials':rows,'variance':{mode:{key:dist([z[key]['p50'] for z in rows if z['mode']==mode and z[key]['n']]) for key in ['rafIntervalMs','ownerRenderIntervalMs','eventToMatchingRenderMs','eventToFollowingRAFOpportunityMs']} for mode in ['minimal','profile']},'cautions':['Renderer timing is synchronous submission CPU/wait, not isolated GPU execution.','Camera/DOM/layout method spans are attributed subsets; observer.selfReported is original Y4 span. They are not a complete exclusive decomposition.','No screenshot/video/pixel read in timed intervals. Original Y4 required samples and five ray checks are retained; no added geometric tests.','Event-to-next-RAF is a presentation-opportunity bound, NOT optical latency. Browser Event Timing durations are quantized and thresholded; missing entries are not zero.','Minimal/profile repetitions estimate incremental instrumentation effects amidst run variability, not a guaranteed causal overhead bound.','No physical device, Safari, total smoothness or production performance certification.']}
if __name__=='__main__':
 d=json.loads((E/'measurements.json').read_text());result=summarize(d);(E/'summary.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));assert d['passed']
