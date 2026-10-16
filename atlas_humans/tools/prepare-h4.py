"""Read immutable C2/Bay bytes into the isolated HUMANS calibration directory."""
from pathlib import Path
import subprocess, hashlib
root=Path(__file__).resolve().parents[1]
specs=[('9a9c12645a1fe55f077f880c3e3b2403c18c4410','atlas_sealab_12/integration/c2-bay-helm/contacts.json','profiles/bay12/contacts.json','cc2a82dc89e3abfee8fd6a7d5def9dd153da179abb4c834dc91b09924d237f58'),('a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff','atlas_sealab_12/live/assets/ATLAS_Bay_Play.glb','assets/BayCalibration.glb','b1ef9c448309a9a5d85ec4f2efcf45d9406d999ab24d27bdd1534359a7278b82')]
for commit,source,target,digest in specs:
    data=subprocess.check_output(['git','show',commit+':'+source],cwd=root)
    assert hashlib.sha256(data).hexdigest()==digest
    dest=root/target;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    print(target,digest)
