"""Geometry audit. Does not establish structural adequacy or safe operation."""
from pathlib import Path
import os,sys,json,numpy as np
R=Path(os.environ['FLEET_ROOT']);sys.path.insert(0,str(R/'source'))
from assemble import Doc
p=R/'staging/ATLAS_D.glb';d=Doc(p);root=d.g['scenes'][0]['nodes'][0]
core=d.node('ENG_Pressure');v=d.vertices(core,0);top=float(v[:,1].max())
checks=[]
for name in ['MOV_Shell_Upper','MOV_Shell_Bridge','MOV_Shell_Sky']:
 i=d.node(name);gap=[]
 for t in np.linspace(0,72*.8,25):gap.append(float(d.vertices(i,float(t))[:,1].min()-top))
 checks.append({'assembly':name,'minimum_vertical_bbox_separation_from_core_m':min(gap),'samples':25,'scope':'Vertical bounds only. Excludes mast, access trunks, support mechanisms and all other body pairs.'})
fixed=[]
for name in ['ENG_Pressure','ENG_Upper','ENG_Lower']:
 i=d.node(name);v0=d.vertices(i,0);changes=[]
 for t in [72*.4,72*.8,72]:
  vv=d.vertices(i,t);offset=d.world(t)[root][:3,3]-d.world(0)[root][:3,3];changes.append(float(np.abs(vv-v0-offset).max()))
 fixed.append({'assembly':name,'maximum_internal_change_after_removing_vessel_translation_m':max(changes)})
rep=json.loads((R/'site/release_report.json').read_text());rep.update(release='ATLAS Fleet 02 — Atelier and section inspection',date='2026-10-11',complete_production_plan_finished=False,cutaway_implementation='Local clipping of exterior meshes with separately loaded interior; cross-section side and deck controls',design_audit={'permanent_envelopes':fixed,'outer_shell_vertical_screens':checks,'mass_budget_closed':False,'surface_stability_solved':False,'pressure_rating':None,'garage_entrance_freeboard_resolved':False,'speculative_shell_nesting':True},changes=['Rebuilt Bay 25 contoured T-top, console, twin bolster seating, outboard cowling and livewell aperture','New coaming pads, EVA inserts, audio grilles, hull trim, wiring and fishing fittings','New submarine sail surfacing and restrained exterior/access fittings','New ship doors, rail correction, flight-deck edge nets, service details and interior lights','Section clipping, retryable lazy interiors, side flip and deck-only mode replace fade-only cutaway','Paint clearcoat and embedded fabric/nonslip textures; model-scaled shadows and reflection environment','Native animation time-base correction'])
(R/'site/release_report.json').write_text(json.dumps(rep,indent=2));(R/'site/design_audit.json').write_text(json.dumps(rep['design_audit'],indent=2))
print(json.dumps(rep['design_audit'],indent=2))
