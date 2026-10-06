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
(root/'source/build.py').write_text(s)
(root/'source/build_r8.py').write_text(s)
p=root/'source/verify.py';s=p.read_text()
s=s.replace("page.on('pageerror',lambda e:errors.append(str(e)))","page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)))")
s=s.replace("  page.wait_for_function('window.ATLAS_R8?.ready',timeout=90000)","  page.wait_for_function('window.ATLAS_R8?.ready || window.ATLAS_R8?.error',timeout=60000)\n  startup=page.evaluate('({ready:ATLAS_R8.ready,error:ATLAS_R8.error})')\n  if not startup['ready']:\n   page.screenshot(path=str(OUT/(label+'_startup_error.png')))\n   print(startup,errors,failed,flush=True)\n   raise RuntimeError(str(startup))")
p.write_text(s)
print('Restored renderer and revised explicit corridor/lobby door reservations')
