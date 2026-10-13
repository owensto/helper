"""Small explicit runtime corrections after the checksum-verified source restore."""
from pathlib import Path
import os
r=Path(os.environ['BAY_ROOT'])
p=r/'site/app.js';s=p.read_text()
s=s.replace("Math.abs(state.u*1.94384).toFixed(1)","(Math.hypot(state.u,state.v)*1.94384).toFixed(1)")
p.write_text(s)
