from pathlib import Path
p=Path(__file__).with_name('build_exterior.py')
s=p.read_text()
s=s.replace('scene.cycles.use_denoising=True','scene.cycles.use_denoising=False')
s=s.replace('scene.cycles.samples=20 if name==\'hero\' else 14','scene.cycles.samples=64 if name==\'hero\' else 40')
s=s.replace('ob.matrix_world=T@R@ob.matrix_world','ob.matrix_world=T@R@Matrix.LocRotScale(ob.location,ob.rotation_euler.to_quaternion(),ob.scale)')
p.write_text(s)
# Correct the optional timeout parameter; no quality reductions.
t=Path(__file__).with_name('test_viewer.mjs')
v=t.read_text().replace('()=>window.ATLAS?.ready===true,{timeout:90000}','()=>window.ATLAS?.ready===true,null,{timeout:90000}')
t.write_text(v)
print('Blender compatibility and transforms prepared')
