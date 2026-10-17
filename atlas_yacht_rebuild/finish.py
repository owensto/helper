"""Own-app visual refinement and diagnostic enrichment, no owner/shared code edits."""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
p=ROOT/'site/app.js';s=p.read_text()
if 'ATLAS_REBUILD_FINISH_03' not in s:
 old='const ocean=new T.Water(new T.PlaneGeometry(16000,16000,160,160),'
 new="""const oceanGeometry=new T.PlaneGeometry(16000,16000,160,160);{
 const p=oceanGeometry.attributes.position;const warp=x=>{const t=x/8000;return 300*t+7700*t*t*t*t*t;};
 for(let i=0;i<p.count;i++){p.setX(i,warp(p.getX(i)));p.setY(i,warp(p.getY(i)));}p.needsUpdate=true;oceanGeometry.computeBoundingSphere();
}
const ocean=new T.Water(oceanGeometry,"""
 assert old in s;s=s.replace(old,new)
 old="ocean.material.fragmentShader=ocean.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.025;');"
 new="""ocean.material.fragmentShader=ocean.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.025;').replace('noise.xzy * vec3( 1.5, 1.0, 1.5 )','noise.xzy * vec3( 0.40, 1.0, 0.40 )').replace('vec3 outgoingLight = albedo;','vec3 outgoingLight = mix(waterColor * 1.4, albedo, 0.40 + 0.45 * pow(1.0-theta,4.0));');ocean.material.uniforms.size.value=2.5;"""
 assert old in s;s=s.replace(old,new)
 old='ocean.position.x=Math.round(vessel.x/512)*512;ocean.position.z=Math.round(vessel.z/512)*512;'
 assert old in s;s=s.replace(old,'ocean.position.x=vessel.x;ocean.position.z=vessel.z;')
 s+='\n// ATLAS_REBUILD_FINISH_03\n';p.write_text(s)
# Keep strict zero-console-error gate. Record origins before diagnosing any exception.
p=ROOT/'verify.py';s=p.read_text()
if 'networkFailures' not in s:
 old="p.on('console',lambda m:row['consoleErrors'].append(m.text) if m.type=='error' else None)"
 new="""def console(m):
   if m.type=='error':
    row['consoleErrors'].append(m.text)
    row.setdefault('consoleErrorDetails',[]).append({'text':m.text,'location':m.location,'pageURL':p.url})
  p.on('console',console)
  p.on('requestfailed',lambda q:row.setdefault('networkFailures',[]).append({'url':q.url,'failure':q.failure,'resourceType':q.resource_type,'pageURL':p.url}))"""
 assert old in s;s=s.replace(old,new)
if 'def drive_wait(' not in s:
 helper="""  def drive_wait(expr):
   for attempt in range(4):
    p.wait_for_function('ATLAS83_APP.inspect().state.paused || ('+expr+')',timeout=60000)
    if not state()['state']['paused']:return
    why=p.locator('#notice').inner_text()
    row.setdefault('motionRenderStallRecovery',[]).append({'reason':why,'state':state()['state'],'attempt':attempt})
    assert 'Rendering paused after a long interruption' in why and p.evaluate('!document.hidden'),'Unexpected pause; do not automatically change it'
    assert attempt<3,'Repeated interruption prevented ordinary operation'
    resume()
   raise AssertionError('Motion target not reached')
"""
 needle='  def shot(label):';assert needle in s;s=s.replace(needle,helper+needle)
 old="p.wait_for_function('ATLAS83_APP.inspect().state.time>'+str(before['time']+2)+' && ATLAS83_APP.inspect().state.speedKnots>.02',timeout=60000)"
 new="drive_wait('ATLAS83_APP.inspect().state.time>'+str(before['time']+2)+' && ATLAS83_APP.inspect().state.speedKnots>.02')"
 assert old in s;s=s.replace(old,new)
 old="row['error']=str(e);row['traceback']=traceback.format_exc()\n   try:p.screenshot"
 new="row['error']=str(e);row['traceback']=traceback.format_exc()\n   try:row['failureState']=state()\n   except Exception:pass\n   try:p.screenshot"
 assert old in s;s=s.replace(old,new)
p.write_text(s)
p=ROOT/'site/README.md';s=p.read_text()
if 'nonuniform near-vessel water grid' not in s:
 s+='\nThe nonuniform near-vessel water grid resolves local waves more densely than the far horizon; the analytical wave values remain the same. Surface scatter/reflection treatment is an authored visual approximation.\n';p.write_text(s)
print('Bounded water mesh and diagnostic-origin recording applied. Pause threshold and all existing state/byte/error assertions retained; native visible stall recovery is explicitly counted.')
