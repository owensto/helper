from pathlib import Path
import os
r=Path(os.environ['FLEET_ROOT'])
p=r/'audit05.py';s=p.read_text();s=s.replace("sum('NEW_TTOP_HOLDER_' in n.get('name','') for n in d.g['nodes'])", "sum(n.get('name','').endswith(('NEW_TTOP_HOLDER_PORT','NEW_TTOP_HOLDER_STARBOARD')) for n in d.g['nodes'])");p.write_text(s)
p=r/'verify05.py';s=p.read_text();s=s.replace("x.name.includes('NEW_TTOP_HOLDER_')", "(x.name.endsWith('NEW_TTOP_HOLDER_PORT')||x.name.endsWith('NEW_TTOP_HOLDER_STARBOARD'))");p.write_text(s)
