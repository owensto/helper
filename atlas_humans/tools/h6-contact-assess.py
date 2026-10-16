"""Assess the recorded real-browser authored-motion slice; never grants activation."""
import json,math,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
r=json.loads((root/'evidence/h6/motion.json').read_text());f=r['frames'];violations=[]
def require(ok,label):
 if not ok:violations.append(label)
def percentile(a,p):return sorted(a)[min(len(a)-1,int(len(a)*p))]
require(not r['errors'],'browser errors');require(f[-1]['time']>=15,'duration')
require(min(x['wheel'] for x in f)<-3.29 and max(x['wheel'] for x in f)>3.29,'full wheel range')
require(max(x['jointErrorM'] for x in f)<.005,'IK error')
require(all(x['dt']<=.1 for x in f),'host delta')
require(r['lifecycle']=={'pauseStable':True,'changedPausedSurface':'PAUSED_SURFACE_MOVED','reset':True,'ejection':'HAND_CONTEXT_UNAVAILABLE','cleared':True,'reentry':True},'lifecycle')
for x in f:
 for h in x['contacts']:
  require(h['materialLocked'] is False,'false material lock')
  if h['valid']:require(h['skinDistanceM']<=.0031,'palm source tolerance')
  else:require(h['state'] in ['reaching','released'],'free state')
 for name,s in x['support'].items():
  require(s['missing']==0,'missing support ray')
  require(s['minMargin']>.005,'support patch edge')
  require(s['minGap']>=-.003 and s['maxGap']<=.007,'support gap')
kinematics=[]
for h in range(2):
 velocities=[];acc=[];angles=[];finger=[]
 for k in range(1,len(f)):
  a,b=f[k-1],f[k];dt=b['dt'];v=[(x-y)/dt for x,y in zip(b['targets'][h],a['targets'][h])];velocities.append(v)
  if k>1:acc.append(math.dist(v,velocities[-2])/dt)
  q1,q2=a['contacts'][h]['quaternion'],b['contacts'][h]['quaternion'];angles.append(2*math.acos(min(1,abs(sum(x*y for x,y in zip(q1,q2)))))/dt)
  finger.append(abs(b['contacts'][h]['grip']-a['contacts'][h]['grip'])/dt)
 require(max(acc)<=12.01,'wrist acceleration');require(max(map(lambda v:math.hypot(*v),velocities))<=.901,'wrist speed');require(max(angles)<=5.01,'wrist rotation');require(max(finger)<=4.01,'finger continuity')
 kinematics.append({'maxSpeedMps':max(math.hypot(*v) for v in velocities),'maxAccelerationMps2':max(acc),'maxAngularSpeedRadSec':max(angles),'maxFingerBlendPerSec':max(finger),'contactFraction':sum(x['contacts'][h]['valid'] for x in f)/len(f)})
region=json.loads((root/'profiles/bay12-h5/rim-region.json').read_text());require(region['triangles']==r['triangles'],'exact region witness')
result={'scope':'Isolated actual-geometry authored RAF motion. No CORE integration or production acceptance.','productionEnabled':False,'contactSlicePass':not violations,'violations':sorted(set(violations)),'renderedFrames':len(f),'durationSec':f[-1]['time'],'frameDeltaP95Sec':percentile([x['dt'] for x in f],.95),'maxJointErrorM':max(x['jointErrorM'] for x in f),'maxValidPalmDistanceM':max(h['skinDistanceM'] for x in f for h in x['contacts'] if h['valid']),'bothHandsFreeFrames':sum(x['attached']==0 for x in f),'bothHandsFreeTimeSec':sum(x['dt'] for x in f if x['attached']==0),'kinematics':kinematics,'lifecycle':r['lifecycle'],'support':{},'budget':{'wholeCharacterMedianMs':percentile([x['fullCpu'] for x in f],.5),'wholeCharacterP95Ms':percentile([x['fullCpu'] for x in f],.95),'wholeCharacterMaxMs':max(x['fullCpu'] for x in f),'rigUpdateP95Ms':percentile([x['cpu'] for x in f],.95),'targetP95Ms':4,'pass':percentile([x['fullCpu'] for x in f],.95)<=4}}
for name in ['seat','leftFoot','rightFoot']:result['support'][name]={'probeCount':f[0]['support'][name]['count'],'missing':sum(x['support'][name]['missing'] for x in f),'minGapM':min(x['support'][name]['minGap'] for x in f),'maxGapM':max(x['support'][name]['maxGap'] for x in f),'minMarginM':min(x['support'][name]['minMargin'] for x in f)}
(root/'evidence/h6/contact-assessment.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if violations:raise SystemExit(1)
