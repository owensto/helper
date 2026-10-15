from pathlib import Path
import os
r=Path(os.environ['SEA_ROOT'])
p=r/'audit06.py';s=p.read_text();s=s.replace("assert any(p in node for node in b.graph.nodes_geometry),p;report['intentional_hatch_parts'][p]=True", "assert p in b.graph.nodes,p\n children=b.graph.transforms.children\n stack=[p];found=False\n while stack:\n  node=stack.pop();found=found or node in b.graph.nodes_geometry;stack.extend(children.get(node,[]))\n assert found,p+' has no descendant geometry'\n report['intentional_hatch_parts'][p]=True")
p.write_text(s)
