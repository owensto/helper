from pathlib import Path
import shutil,sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/mnt/data/fleet_upgrade/work')
src=root/'source/build_fleet.py';s=src.read_text()
s=s.replace("TAU=2*math.pi","TAU=2*math.pi\nfrom detail import roof, console, helm_seats, cowling, bay_detail, naval_detail, loft")
s=s.replace("('blue','#405A6D',.18,.28)","('blue','#405A6D',.03,.25)").replace("('silver','#A8AEB1',.24,.34)","('silver','#A8AEB1',.13,.34)").replace("('white','#D9DDD9',.02,.37)","('white','#E6E7E1',.0,.32)").replace("('deck','#A8AFAD',.0,.84)","('deck','#AAB6B5',.0,.75)").replace("('fabric','#C6CCC7',0,.91)","('fabric','#C9CEC9',0,.83)").replace("('naval','#737E84',.18,.45)","('naval','#78858D',.035,.47)")
# Smooth and crown the top; retain rigid support hierarchy.
a=" b.box('T top molded roof'";start=s.index(a);end=s.index(" b.box('Overhead electronics box'",start);s=s[:start]+" roof(b,top)\n"+s[end:]
start=s.index(' # console forward face and sloped helm');end=s.index(" b.ring('Helm wheel'",start);s=s[:start]+" # Curved console and separate display fascia, rebuilt rather than recolored.\n console(b,inside,seats)\n"+s[end:]
start=s.index(" b.box('Bolster helm seat'");end=s.index(" b.box('Tackle console'",start);s=s[:start]+" helm_seats(b,seats,inside)\n"+s[end:]
start=s.index(" b.box('Outboard top cowling'");end=s.index(" b.box('Outboard mid leg'",start);s=s[:start]+" cowling(b,steer)\n"+s[end:]
s=s.replace(" b.text('25',[-.46,.39,.256],.14,'black',steer,plane='side')","")
s=s.replace("(-3.05,.71,.66,.61,.71),","")
s=s.replace("b.slab('Aft casting deck',stern,.37,.69,'white',deck)","b.add('Aft casting deck with actual livewell opening',slab(stern,.37,.69,[[[-3.38,.41],[-2.73,.41],[-2.73,1.00],[-3.38,1.00]]]),'white',deck);b.box('Livewell bowl floor',[-3.055,.45,.705],[.59,.04,.52],'sea',deck,.02)")
s=s.replace(" b.save('ATLAS_Bay_25.glb',60);return b", " bay_detail(b)\n b.save('ATLAS_Bay_25.glb',60);return b")
# Sail smooth loft, no rectangle on a cylinder.
old=" b.add('Sail tapered skin',wall(plan,3.85,9.57,shift=-1.3,narrow=.70),'sub',sail,True);q=plan.copy();q[:,0]-=1.3;q[:,1]*=.70;b.slab('Sail cap',q,9.54,9.65,'darkdeck',sail)"
new=" b.add('Continuous faired sail',loft([(3.84,2.45,13.0,2.48,4),(4.05,2.4,12.8,2.45,4),(4.6,2.28,12.2,2.25,4),(8.9,1.90,11.45,1.82,4),(9.52,1.84,11.0,1.65,4),(9.66,1.80,10.6,1.50,4)]),'sub',sail,True)"
assert old in s;s=s.replace(old,new)
s=s.replace(" b.save('ATLAS_N.glb',60);return b", " naval_detail(b,'n')\n b.save('ATLAS_N.glb',60);return b")
s=s.replace(" b.save('ATLAS_W.glb',60);return b", " naval_detail(b,'w')\n b.save('ATLAS_W.glb',60);return b")
# Excess duplicate stanchions at every sample previously dominated the rails; reserve poles separately.
s=s.replace("rail_run(b,rr,hw,ma='naval',height=.99,spacing=100,r=.027)","b.tube('Deck edge handrail',np.array(rr)+[0,.99,0],.027,'naval',hw);b.tube('Deck edge middle rail',np.array(rr)+[0,.50,0],.018,'naval',hw)")
s=s.replace('ATLAS Fleet 01','ATLAS Fleet 02')
src.write_text(s)
# Blender sampling uses actual imported time base, not mismatched default 24 fps -> 30 fps.
p=root/'source/native.py';s=p.read_text();s=s.replace("bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf", "bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf")
s=s.replace("export_force_sampling=False", "export_force_sampling=False")
s=s.replace('ATLAS Fleet 01','ATLAS Fleet 02')
p.write_text(s)
print('Patched Bay top, console, seating, livewell and cowling; naval geometry and native frame rate')
