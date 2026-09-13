"""Refine R4 surface pavilions with articulated glazing, not disappearing rooms.
The injected code is plain modeling source; the base builder remains reviewable.
"""
from pathlib import Path
import os
root=Path(__file__).resolve().parent
s=(root/'build_transform.py').read_text()
s=s.replace("z=side*(W-.58);box('Scissor_base_track'", "z=side*1.05;box('Scissor_base_track'")
s=s.replace("1,3.7,.27,.52)","1,3.7,.35,.57)").replace("2,3.5,.28,.54)","2,3.5,.35,.58)")
needle="   for stage in range(stages):"
drive="""   # Four nested, constant-length sleeves; no cylinders scale to fake motion.
   # Symmetric guide shoes spread as the roof lowers. Drive sizing is unverified.
   for sleeve,radius in enumerate([.13,.103,.076,.049]):
    geo=trimesh.creation.cylinder(radius=radius,height=1.15,sections=16)
    geo.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[0,1,0]))
    jack=mesh('Telescopic_canopy_drive',geo,steel if sleeve else dark,rig)
    anim(jack,'translation',lambda p,sleeve=sleeve,x=x,z=z:[x-span(p)+.575+sleeve*(2*span(p)-1.15)/3,basey+.12,z])
"""
assert needle in s;s=s.replace(needle,drive+needle)
screens="""
# WIND SCREENS, NOT PRESSURE WINDOWS. Pavilions stay open at their ends.
# The forward bank first bifolds outward, then lies flat on the terrace.
# Moving panels are outside the central scissor-support paths.
glass=mat('R4 Nonpressure windscreen',[.020,.048,.063],.32,.19)
def screen_leaf(label,width,height,parent,side):
 box(label+'_glass',[width-.095,height-.11,.030],[0,height/2,0],glass,parent)
 for x in [-width/2,width/2]:box(label+'_mullion',[.055,height,.078],[x,height/2,0],pearl,parent)
 for y in [0,height]:box(label+'_frame',[width,.055,.078],[0,y,0],pearl,parent)
 for x in [-width*.32,width*.32]:box(label+'_hinge',[.16,.12,.12],[x,0,0],steel,parent)
for side in [-1,1]:
 for bank,start,span,h,bifold in [('Aft',-26.7,15.5,2.47,False),('Forward',-5.,18.1,2.51,True)]:
  count=5;width=span/count-.085
  for i in range(count):
   xx=start+(i+.5)*span/count
   lower=group(bank+'_windscreen_lower_pivot',rig,[xx,9.40,side*4.68])
   screen_leaf(bank+'_lower_windscreen',width,h,lower,side)
   anim(lower,'rotation',lambda p,side=side:quat([1,0,0],-side*math.pi/2*smooth(.23,.34,p)))
   if bifold:
    upper=group('Forward_windscreen_upper_pivot',lower,[0,h,side*.105])
    screen_leaf('Forward_upper_windscreen',width,h,upper,side)
    anim(upper,'rotation',lambda p,side=side:quat([1,0,0],side*math.pi*smooth(.11,.22,p)))
"""
needle='# Batch static boards in their own local moving frames.'
assert needle in s;s=s.replace(needle,screens+'\n'+needle)
s=s.replace("'mechanisms':['two-stage", "'folding_screen_panels':30,'telescopic_drive_stages':32,'mechanisms':['bifolding surface windscreen banks','telescopic hydraulic-drive representations','two-stage")
exec(compile(s,str(root/'build_transform.py'),'exec'),{'__name__':'__main__','__file__':str(root/'build_transform.py')})
