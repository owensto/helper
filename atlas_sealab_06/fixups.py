from pathlib import Path
import os
r=Path(os.environ['SEA_ROOT'])
p=r/'audit06.py';s=p.read_text();s=s.replace("assert any(p in node for node in b.graph.nodes_geometry),p;report['intentional_hatch_parts'][p]=True", "assert p in b.graph.nodes,p\n children=b.graph.transforms.children\n stack=[p];found=False\n while stack:\n  node=stack.pop();found=found or node in b.graph.nodes_geometry;stack.extend(children.get(node,[]))\n assert found,p+' has no descendant geometry'\n report['intentional_hatch_parts'][p]=True")
p.write_text(s)
# Negative station coordinates must be parenthesized in generated GLSL.
for p in [r/'refinement06.js',r/'site/refinement06.js']:
 s=p.read_text();s=s.replace('(p.x-${a[0].toFixed(5)})','(p.x-(${a[0].toFixed(5)}))');p.write_text(s)
# Detect GPU shader failures too, not just uncaught JavaScript exceptions.
p=r/'verify06.py';s=p.read_text();s=s.replace("page=ctx.new_page();errs=[];fails=[]", "page=ctx.new_page();errs=[];fails=[];shader_errors=[]")
s=s.replace("page.on('pageerror',lambda e:errs.append(str(e)));", "page.on('console',lambda m:shader_errors.append(m.text) if m.type=='error' and any(k in m.text.lower() for k in ['shader','validate_status','program info log','webgl']) else None)\n  page.on('pageerror',lambda e:errs.append(str(e)));")
s=s.replace("'asset_failures':fails};", "'asset_failures':fails,'shader_errors':shader_errors};")
s=s.replace('assert not errs,errs;assert not fails,fails;', 'assert not shader_errors,shader_errors;assert not errs,errs;assert not fails,fails;')
p.write_text(s)
