from pathlib import Path
p=Path(__file__).with_name('build_exterior.py');s=p.read_text()
s=s.replace('scene.cycles.use_denoising=True','scene.cycles.use_denoising=False')
s=s.replace("scene.cycles.samples=20 if name=='hero' else 14","scene.cycles.samples=48 if name=='hero' else 32")
s=s.replace('ob.matrix_world=T@R@ob.matrix_world','ob.matrix_world=T@R@Matrix.LocRotScale(ob.location,ob.rotation_euler.to_quaternion(),ob.scale)')
# Preserve continuous planking up to the actual wall; center-based exclusion left gaps.
s=s.replace('   if exclude and any(inside(center,e) for e in exclude):continue\n','')
helper='''def subtract_pool_rectangle(p):
 hx0,hx1,hy0,hy1=-33.7,-25.1,-2.3,2.3
 if max(v[0] for v in p)<=hx0 or min(v[0] for v in p)>=hx1 or max(v[1] for v in p)<=hy0 or min(v[1] for v in p)>=hy1:return [p]
 regions=[(-100,-100,hx0,100),(hx1,-100,100,100),(hx0,-100,hx1,hy0),(hx0,hy1,hx1,100)]
 out=[]
 for x0,y0,x1,y1 in regions:
  q=clip(p,[(x0,y0),(x1,y0),(x1,y1),(x0,y1)])
  if len(q)>=3:
   area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(q,q[1:]+q[:1])))
   if area>1e-9:out.append(q)
 return out

'''
s=s.replace('def deck(name,poly,z,exclude=None):',helper+'def deck(name,poly,z,exclude=None):')
old='''   start=len(vs);nn=len(p);vs += [(xx,yy,z+.03) for xx,yy in p]+[(xx,yy,z+.046) for xx,yy in p]
   fs += [tuple(start+nn+i for i in range(nn))];mi.append(row%5)
   for j in range(nn):fs.append((start+j,start+(j+1)%nn,start+nn+(j+1)%nn,start+nn+j));mi.append(row%5)
   count+=1'''
new='''   pieces=subtract_pool_rectangle(p) if name=='Main_deck' else [p]
   for pp in pieces:
    start=len(vs);nn=len(pp);vs += [(xx,yy,z+.03) for xx,yy in pp]+[(xx,yy,z+.046) for xx,yy in pp]
    fs += [tuple(start+nn+i for i in range(nn))];mi.append(row%5)
    for j in range(nn):fs.append((start+j,start+(j+1)%nn,start+nn+(j+1)%nn,start+nn+j));mi.append(row%5)
    count+=1'''
assert old in s;s=s.replace(old,new)
# Stair entries no longer require stepping through the balustrade.
old=" for side in [-1,1]:railing(name+'_'+str(side),[(a+.7,side*w),(a,side*w*.76),(a,0),(a,-side*w*.76),(a+.7,-side*w),(b,-side*w)],z)"
new=""" for side in [-1,1]:
  gap={'Upper':(-26.0,-24.2),'Bridge':(-18.1,-16.2),'Sun':(-10.8,-9.2)}.get(name)
  path=[(a,0),(a,side*w*.76),(a+.7,side*w)]
  if gap:
   railing(name+'_'+str(side)+'_aft',path+[(gap[0],side*w)],z)
   railing(name+'_'+str(side)+'_forward',[(gap[1],side*w),(b,side*w)],z)
  else:railing(name+'_'+str(side),path+[(b,side*w)],z)"""
assert old in s;s=s.replace(old,new)
s=s.replace('(-33.55,side*4.65,5.76),1.20)','(-31.0,side*4.65,5.76),1.20)')
s=s.replace("# Beach club architecture visible through the true hull recess.","for side in [-1,1]:stairs('Bridge_to_sun_'+str(side),(-14.6,side*3.03,13.10),(-10.0,side*3.0,16.35),.86)\n# Beach club architecture visible through the true hull recess.")
s=s.replace("],.045,DARK,'Glazing')", "],.032,PEARL,'Glazing')")
s=s.replace("if ar.type=='VIEW_3D':ar.spaces.active.clip_end=2500","if ar.type=='VIEW_3D':\n   ar.spaces.active.clip_end=2500;ar.spaces.active.lens=38\n   ar.spaces.active.region_3d.view_distance=130;ar.spaces.active.region_3d.view_location=(0,0,8)\n   ar.spaces.active.region_3d.view_rotation=cameras['hero'].rotation_euler.to_quaternion()")
p.write_text(s)
t=Path(__file__).with_name('test_viewer.mjs');v=t.read_text().replace('()=>window.ATLAS?.ready===true,{timeout:90000}','()=>window.ATLAS?.ready===true,null,{timeout:90000}');t.write_text(v)
t=Path(__file__).with_name('viewer.js');v=t.read_text()
v=v.replace('renderer.toneMappingExposure=1.1','renderer.toneMappingExposure=.86')
v=v.replace('0x4b606b,1.1','0x4b606b,.6').replace('0xfff4df,3.3','0xfff4df,2.3').replace('0xc4e7ff,.7','0xc4e7ff,.35')
v=v.replace('room.dispose();pm.dispose();','room.dispose();pm.dispose();scene.environmentIntensity=.7;')
v=v.replace('color:0x347682,roughness:.28,metalness:.18','color:0x24616f,roughness:.44,metalness:.05').replace('new THREE.Vector2(.18,.18)','new THREE.Vector2(.07,.07)')
t.write_text(v)
print('Review corrections prepared: clipped pool boards, continuous decks, stair gates, daylight exposure')
