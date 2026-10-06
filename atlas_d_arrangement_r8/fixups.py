from pathlib import Path
import shutil
root=Path(__file__).resolve().parent
for name in ['runtime.js','THIRD_PARTY_LICENSE.txt']:
    shutil.copyfile(Path('/tmp/atlas8-base/site')/name,root/'site'/name)
s=(root/'source/build.py').read_text()
old=" for x in [x0,x1]:addbox(name+'_partition',(x,y+.56,(z0+z1)/2),(.06,1.12,z1-z0),matwalls,parent)"
new=""" for x in [x0,x1]:
  passage=None
  if name in ['Observation_salon','Machinery_reservation'] and x==x1:passage=(-.50,.50)
  if name in ['Stair_and_access_lobby','Interdeck_access'] and x==x0:passage=(-.50,.50)
  if name=='Interdeck_access' and x==x1:passage=(-.50,.50)
  if name=='Owner_suite' and x==x0:passage=(1.98,2.92)
  if passage:
   for za,zb in [(z0,passage[0]),(passage[1],z1)]:
    if zb>za:addbox(name+'_door_partition',(x,y+.56,(za+zb)/2),(.06,1.12,zb-za),matwalls,parent)
  else:addbox(name+'_partition',(x,y+.56,(z0+z1)/2),(.06,1.12,z1-z0),matwalls,parent)"""
assert old in s
s=s.replace(old,new)
s=s.replace("addbox('Dry_garage_floor',(-33.5,.15,side*GZ),(12.9,.1,2.25),matdark,bay)","addbox('Central_guide_reservation',(-33.5,.295,side*GZ),(12.9,.04,.60),matdark,bay)")
old="(OUT/'arrangement.json').write_text(json.dumps(report,indent=2));(OUT/'model_report.json').write_text(json.dumps(report,indent=2))"
new="""# Check the ORIGINAL recovery hardware separately from the craft: no false whole-system fit.
hardware_checks=[]
for label,loc in [('Chase',[-33.7,.170,2.50]),('Utility',[-33.7,.544,-2.50])]:
 vv=[]
 for i,n in enumerate(g0['nodes']):
  if 'mesh' not in n or not under(i,'MOV_Cradle_'+label):continue
  for pr in g0['meshes'][n['mesh']]['primitives']:vv.append(read(pr['attributes']['POSITION']))
 v=np.concatenate(vv)+loc;rad=np.linalg.norm(v[:,1:3]-[GY,loc[2]],axis=1)
 hardware_checks.append({'assembly':'R7 '+label+' recovery cradle','stored_position':loc,'minimum_radial_clearance_m':float(GI-rad.max()),'maximum_radial_overrun_m':float(max(0,rad.max()-GI)),'fits_candidate_bore':bool(rad.max()<=GI),'complete_swept_path_checked':False})
report['recovery_hardware_checks']=hardware_checks
report['open_design_issues'].insert(3,{'severity':'BLOCKER','item':'R7 recovery cradles do not fit cylindrical garage bores','detail':'Stored cradle geometry exceeds the candidate bore radially by %.3f m (chase) and %.3f m (utility). Recovery supports and transfer interfaces must be redesigned; craft-only containment is not whole-system fit.'%(hardware_checks[0]['maximum_radial_overrun_m'],hardware_checks[1]['maximum_radial_overrun_m'])})
report['changes'][-1]='Four explicit design conflicts exposed, including original recovery-hardware bore interference.'
(OUT/'arrangement.json').write_text(json.dumps(report,indent=2));(OUT/'model_report.json').write_text(json.dumps(report,indent=2))"""
assert old in s;s=s.replace(old,new)
(root/'source/build.py').write_text(s)
(root/'source/build_r8.py').write_text(s)
p=root/'site/lab.js';s=p.read_text()
s=s.replace("up0=planView?V(0,0,-1):V(0,1,0)","up0=mobile&&(mode==='upper'||mode==='lower')?V(1,0,0):planView?V(0,0,-1):V(0,1,0)")
s=s.replace("size=[44,6,9]","size=[54,11,13]")
s=s.replace("if(g==='ENG_Pressure'){on=showPressure;","if(g==='ENG_Pressure'){on=showPressure&&(mode!=='garages');")
s=s.replace(" m.visible=on;m.material.opacity=a;"," if(b.color)m.material.color.copy(b.color);if(mode==='garages'&&g.startsWith('MOV_Cradle'))m.material.color.set('#b95536');\n m.visible=on;m.material.opacity=a;")
s=s.replace("base={opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite}","base={opacity:o.material.opacity,transparent:o.material.transparent,depthWrite:o.material.depthWrite,color:o.material.color.clone()}")
s=s.replace("stat('Open design blockers','3')","stat('Open design blockers','4')")
s=s.replace("The smaller tender currently has an oversized common-envelope pod.","The smaller tender currently has an oversized common-envelope pod.")
needle="<p class=\"small\">Clearance is geometry only;"
addition="<div class=\"tag\">BLOCKER 04 · RED HARDWARE</div><p>The existing recovery cradles exceed the circular bore radially by about 0.824 m (chase) and 0.502 m (utility). They are retained and highlighted for redesign—not counted as fitted equipment.</p>"
assert needle in s;s=s.replace(needle,addition+needle)
s=s.replace("label('Circular pressure-closure candidate',[-40.5,2.4,2.5]);","label('Circular pressure-closure candidate',[-40.5,2.4,2.5]);")
p.write_text(s)
p=root/'site/design.html';s=p.read_text();s=s.replace('</main>', '<h2>Additional recovery-hardware finding</h2><p><strong>The original R7 cradles fail the candidate cylindrical-bore test.</strong> At the revised stored poses, the chase cradle exceeds the proposed bore radially by approximately 0.824 m and the utility cradle by 0.502 m. The complete tender craft fit, but the old broad recovery platforms do not. In the tender-bay view the conflicting hardware is highlighted red. These platforms need purpose-designed replacement supports and a checked recovery path; they are not made acceptable by hiding them or changing the water level. The new narrow central guide is a reservation, not a load-rated cradle.</p><p>There are therefore four reported blockers. Only room-box containment, static craft containment and selected envelope separations have passed geometric screening. Complete mechanism collision checks and all structural qualification remain open.</p></main>');p.write_text(s)
p=root/'source/verify.py';s=p.read_text()
s=s.replace("page.on('pageerror',lambda e:errors.append(str(e)))","page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)))")
s=s.replace("  page.wait_for_function('window.ATLAS_R8?.ready',timeout=90000)","  page.wait_for_function('window.ATLAS_R8?.ready || window.ATLAS_R8?.error',timeout=60000)\n  startup=page.evaluate('({ready:ATLAS_R8.ready,error:ATLAS_R8.error})')\n  if not startup['ready']:\n   page.screenshot(path=str(OUT/(label+'_startup_error.png')))\n   print(startup,errors,failed,flush=True)\n   raise RuntimeError(str(startup))")
s=s.replace("  page.locator('#example').click();", "  assert page.evaluate('ATLAS_R8.report.recovery_hardware_checks.every(x=>!x.fits_candidate_bore)')\n  page.locator('#example').click();")
p.write_text(s)
print('R8 source repaired; hardware interference explicitly recorded; mobile deck views rotated for legibility')
