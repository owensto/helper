from pathlib import Path
p=Path(__file__).with_name('build_exterior.py');s=p.read_text()
a="def subtract_pool_rectangle(p):\n hx0,hx1,hy0,hy1=-33.7,-25.1,-2.3,2.3"
b="def subtract_pool_rectangle(p,rect=(-33.7,-25.1,-2.3,2.3)):\n hx0,hx1,hy0,hy1=rect"
assert a in s;s=s.replace(a,b)
a="   pieces=subtract_pool_rectangle(p) if name=='Main_deck' else [p]"
b="""   pieces=[p]
   if name=='Main_deck':
    for hole in [(-33.7,-25.1,-2.3,2.3),(-35.7,-30.9,3.5,5.4),(-35.7,-30.9,-5.4,-3.5)]:
     pieces=[q for pp in pieces for q in subtract_pool_rectangle(pp,hole)]"""
assert a in s;s=s.replace(a,b)
a="upperpoly=footprint(-28.0,26.2,5.01,2.6)"
b="""# Matched openings in planks, substrate and the hull make the stairs continuous.
for side in [-1,1]:
 for target,label in [(hull,'hull'),(base,'structural_deck'),(caulk,'caulking')]:
  boolean_cut(target,'Beach_stairwell_'+label+'_'+str(side),(-33.3,side*4.45,4.1),(4.8,1.9,4.0))
upperpoly=footprint(-28.0,26.2,5.01,2.6)"""
assert a in s;s=s.replace(a,b)
a='# Clean working bow rails, without a helipad symbol.'
b="""# Guard the inside edge of each new stairwell, leaving its landing unobstructed.
for side in [-1,1]:railing('Beach_stairwell_inner_'+str(side),[(-33.8,side*3.47),(-30.9,side*3.47)],5.78)
# Clean working bow rails, without a helipad symbol."""
assert a in s;s=s.replace(a,b)
p.write_text(s);compile(s,str(p),'exec');print('Physical stairwells cut and source syntax validated')
