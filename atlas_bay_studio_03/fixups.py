"""Compatibility patch for Ubuntu's Blender build; preserve model geometry."""
from pathlib import Path
import os
root=Path(os.environ['FLEET_ROOT'])
p=root/'native.py';s=p.read_text()
assert 'sc.cycles.samples=40;sc.cycles.use_denoising=True' in s
s=s.replace('sc.cycles.samples=40;sc.cycles.use_denoising=True','sc.cycles.samples=64;sc.cycles.use_denoising=False')
p.write_text(s)
print('CPU-compatible 64-sample Cycles review; no unavailable denoiser requested.')
