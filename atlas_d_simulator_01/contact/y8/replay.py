"""Independent standard-library replay; never imports the live JS predicate.
All joins are recomputed from raw events and every post-event render candidate.
Missing values remain missing; a failed predicate is not a zero-latency match.
"""
import argparse, json, math
from pathlib import Path

def check(ok, message):
    if not ok: raise AssertionError(message)
def finite(x): return isinstance(x,(float,int)) and not isinstance(x,bool) and math.isfinite(x)
def close(a,b,tol=1e-8): return finite(a) and finite(b) and abs(a-b)<=tol
def stamp(s):
    check(isinstance(s,dict),'MISSING_TIMESTAMP')
    for k in ('timeOriginMs','monoMs','absoluteMs','wallUnixMs'):check(finite(s.get(k)),'MISSING_TIMESTAMP_'+k)
    check(close(s['absoluteMs'],s['timeOriginMs']+s['monoMs'],.001),'BAD_TIME_ORIGIN')

def sample_shape(s):
    check(isinstance(s,dict) and 'powerHUDText' in s and 'missing' in s,'INCOMPLETE_SAMPLE')
    check(s['powerHUDText'] is None or isinstance(s['powerHUDText'],str),'HUD_TYPE')
    for container,keys in [('owner',('elapsedSeconds','sequence','rudder','throttle','paused')),('sampledState',('elapsedSeconds','sequence','rudder','throttle','paused')),('physical',('available','controlNormalized','wheelAngleRad')),('frame',('id','seconds','instanceId','activationEpoch','simulationEpoch','worldRevision'))]:
        check(isinstance(s.get(container),dict) and all(k in s[container] for k in keys),'MISSING_SAMPLE_FIELDS_'+container)
    stamp(s['observedAt'])

def expected(e):
    if e.get('kind')=='rudder':
        if e.get('target') not in ('ad-left','ad-right'):return None
        if e.get('event')=='pointerdown':return -1 if e['target']=='ad-left' else 1
        if e.get('event') in ('pointerup','pointercancel'):return 0
    if e.get('kind')=='power' and e.get('event')=='input' and e.get('target')=='ad-throttle':
        s=e.get('inputValue')
        if not isinstance(s,str) or not s.strip():return None
        try:v=float(s)/100
        except ValueError:return None
        return v if finite(v) else None
    return None

def predicate(e,r):
    v=expected(e);s=r['sample'];reasons=[]
    if v is None or e.get('trusted') is not True:reasons.append('INVALID_EVENT')
    if r['segmentId']!=e['segmentId'] or r['start']['absoluteMs']<e['observed']['absoluteMs']:reasons.append('NOT_POST_EVENT_SAME_SEGMENT')
    if e['kind']=='rudder':
        if s['physical'].get('available') is not True:reasons.append('PHYSICAL_UNAVAILABLE')
        a=s['sampledState'].get('rudder');b=s['physical'].get('controlNormalized')
        if not finite(a) or a!=v:reasons.append('RUDDER_MISMATCH_OR_MISSING')
        if not finite(b) or b!=v:reasons.append('PHYSICAL_CONTROL_MISMATCH_OR_MISSING')
    elif e['kind']=='power':
        a=s['sampledState'].get('throttle')
        if not finite(a) or v is None or abs(a-v)>=1e-8:reasons.append('POWER_MISMATCH_OR_MISSING')
        text=s.get('powerHUDText');wanted=str(math.floor(v*100+.5))+'%' if v is not None else None
        if not isinstance(text,str) or text!=wanted:reasons.append('HUD_MISMATCH_OR_MISSING')
    return {'matched':not reasons,'reasons':reasons}

def trial_replay(t,expected_loop):
    check(t.get('schema')=='atlas-y8-replay/1','SCHEMA')
    check(not t['errors'],'RECORDED_ERROR')
    check(t['sourceMatches'] and all(x['source']==expected_loop and x['matched'] for x in t['sourceMatches']),'OWNER_SOURCE_NOT_EXACT')
    segments={s['id']:s for s in t['segments']};origins={o['id']:o for o in t['origins']};frames={r['id']:r for r in t['frames']}
    check(len(origins)==len(t['origins']) and len(frames)==len(t['frames']),'DUPLICATE_IDS')
    for seg in segments.values():stamp(seg['start']);stamp(seg['end'])
    for o in origins.values():
        stamp(o['entry']);stamp(o['exit']);check(o['exit']['absoluteMs']>=o['entry']['absoluteMs'],'ORIGIN_TIME_ORDER')
        check(o['kind'] in ('native_owner_raf','native_other_raf'),'ORIGIN_KIND')
        check(o['sourceMatched']==(o['kind']=='native_owner_raf'),'ORIGIN_SOURCE_FLAG')
        check(finite(o['rafTimestampMs']),'MISSING_RAF_TIMESTAMP')
    zero=0;manual=0;missing=0;timed_frames=0
    for r in frames.values():
        stamp(r['start']);stamp(r['end']);stamp(r['sample']['observedAt'])
        check(r['end']['absoluteMs']>=r['start']['absoluteMs'],'RENDER_TIME_ORDER')
        check(r['sample']['observedAt']['absoluteMs']>=r['end']['absoluteMs'],'SAMPLE_BEFORE_RENDER_END')
        s=r['sample'];sample_shape(s);missing+=len(s['missing']);o=r['origin'];d=r['consumedSimulationDelta'];cb=origins.get(o['callbackId'])
        if o['kind']=='outside_raf_manual_or_diagnostic_unattributed':
            manual+=1;check(cb is None and o['callbackId'] is None and not o['sourceMatched'],'FAKE_MANUAL_ORIGIN')
        else:
            check(cb is not None and cb['kind']==o['kind'] and cb['sourceMatched']==o['sourceMatched'],'ORIGIN_JOIN')
            check(cb['segmentId']==r['segmentId'],'ORIGIN_SEGMENT')
            check(cb['entry']['absoluteMs']<=r['start']['absoluteMs'] and r['end']['absoluteMs']<=cb['exit']['absoluteMs'],'ORIGIN_NOT_ENCLOSING')
            check(o['rafTimestampMs']==cb['rafTimestampMs'],'RAF_TIMESTAMP_CHANGED')
        if o['kind']=='native_owner_raf':
            a=cb['ownerBefore'];b=s['owner'];v=b['elapsedSeconds']-a['elapsedSeconds'];q=b['sequence']-a['sequence']
            if v>=0 and q>=0:
                check(close(d.get('seconds'),v) and d['sequenceDelta']==q,'CONSUMED_DELTA_MISMATCH')
                check(close(v,q/60,1e-7),'DELTA_NOT_OBSERVED_OWNER_STEPS')
                check(d['status']==('ZERO_OBSERVED' if v==0 else 'ADVANCED'),'DELTA_STATUS')
                zero+=int(v==0)
            else:check(d['seconds'] is None and d['status']=='RESET_OR_DISCONTINUITY','DISCONTINUITY_NOT_NULL')
        else:check(d['seconds'] is None and d['sequenceDelta'] is None and d['status']=='NO_NATIVE_OWNER_BOUNDARY','INVENTED_NON_OWNER_DELTA')
        for k in ('elapsedSeconds','sequence','rudder','throttle','paused'):
            if s['sampledState'][k] is not None:check(s['sampledState'][k]==s['owner'][k],'STALE_SAMPLED_STATE_'+k)
        if s['physical']['available'] is True:
            check(s['sourceUnchanged'] is True,'SOURCE_CHANGED')
            check(s['frame']['seconds']==s['sampledState']['elapsedSeconds'],'FRAME_SECONDS_STALE')
            check(s['fixtureDt']==0,'FIXTURE_DT_CHANGED')
        if segments[r['segmentId']]['timed']:
            timed_frames+=1;check(s['sourceUnchanged'] is True and s['physical']['available'] is True and s['owner']['paused'] is False,'TIMED_CORRECTNESS_FAILURE')
            check(o['kind']=='native_owner_raf','TIMED_NON_OWNER_RENDER')
    joins=[];unmatched=[]
    for e in t['events']:
        stamp(e['observed']);sample_shape(e['sampleAtEvent'])
        check(e['trusted'] is True,'UNTRUSTED_EVENT')
        check(close(e['eventAbsoluteMs'],e['eventTimeOriginMs']+e['eventTimeStampMs'],.001),'EVENT_TIMESTAMP')
        check(expected(e)==e['expected'],'EXPECTED_NOT_REPLAYABLE')
        candidates=[r for r in t['frames'] if r['segmentId']==e['segmentId'] and r['start']['absoluteMs']>=e['observed']['absoluteMs']]
        attempts=[];match=None
        for r in candidates:
            decision=predicate(e,r);attempts.append({'renderId':r['id'],**decision})
            if decision['matched']:match=r;break
        # The live shim may retain earlier render attempts that began before the
        # event observation; their reasons are independently checked as well.
        recorded=e['attempts']
        check(all(a=={'renderId':a['renderId'],**predicate(e,frames[a['renderId']])} for a in recorded),'ATTEMPT_PREDICATE_CHANGED')
        check([a for a in recorded if frames[a['renderId']]['start']['absoluteMs']>=e['observed']['absoluteMs']]==attempts,'ATTEMPT_SEQUENCE')
        check(e['matchedRenderId']==(match['id'] if match else None),'FIRST_MATCH_CHANGED')
        if match:
            check(e['matchEndAbsoluteMs']==match['end']['absoluteMs'],'MATCH_TIME_CHANGED')
            following=next((o for o in t['origins'] if o['segmentId']==e['segmentId'] and o['kind']=='native_owner_raf' and o['entry']['absoluteMs']>match['end']['absoluteMs']),None)
            check(e['followingOwnerRAFId']==(following['id'] if following else None),'FOLLOWING_OWNER_JOIN')
            joins.append({'eventId':e['id'],'kind':e['kind'],'expected':expected(e),'renderId':match['id'],'origin':match['origin'],'recordedValues':match['sample'],'consumedSimulationDelta':match['consumedSimulationDelta'],'eventToSubmissionMs':match['end']['absoluteMs']-e['eventAbsoluteMs'],'followingOwnerRAFId':e['followingOwnerRAFId']})
        else:
            check(e['matchEndAbsoluteMs'] is None and e['followingOwnerRAFId'] is None,'UNMATCHED_NOT_NULL')
            unmatched.append({'eventId':e['id'],'reason':'NO_RECORDED_MATCH','attempts':attempts})
    return {'passed':True,'events':len(t['events']),'matched':len(joins),'unmatched':unmatched,'joins':joins,'frames':len(frames),'timedFrames':timed_frames,'zeroDeltaOwnerFrames':zero,'outsideOwnerRAFFrames':manual,'missingFieldRecords':missing}

def replay(report):
    check(report['runtimeBaseline']=='e30edc8e33b863f3fafb303be0050cc86b7900f0','RUNTIME_PIN')
    results=[trial_replay(row['records'],report['expectedOwnerLoop']) for row in report['trials']]
    return {'passed':True,'sourceSHA':report.get('sourceSHA'),'layout':report['layout'],'trials':results,'matched':sum(r['matched'] for r in results),'unmatched':sum(len(r['unmatched']) for r in results),'zeroDeltaOwnerFrames':sum(r['zeroDeltaOwnerFrames'] for r in results),'outsideOwnerRAFFrames':sum(r['outsideOwnerRAFFrames'] for r in results),'runtimeCandidate':None,'pixelLatencyMeasured':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('report',nargs='?',default=str(Path(__file__).parent/'evidence/measurements.json'));p.add_argument('--out');a=p.parse_args()
    result=replay(json.loads(Path(a.report).read_text()));dest=Path(a.out) if a.out else Path(a.report).with_name('replay.json');dest.write_text(json.dumps(result,indent=2))
    print(json.dumps({k:v for k,v in result.items() if k!='trials'},indent=2))
