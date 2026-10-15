from pathlib import Path
import soundfile as sf, numpy as np
from scipy import signal
import json,subprocess
import os
root=Path(os.environ.get('SEA_ROOT','/mnt/data/atlas_audio05'));out=root/'site/assets/audio';out.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(root/'audio_source/river_outboard_preview.mp3'),'-ac','1','-ar','24000',str(root/'audio_source/source.wav')],check=True)
x,fs=sf.read(root/'audio_source/source.wav')
y=x[10*fs:18*fs]
sos=signal.butter(4,[36,680],btype='bandpass',fs=fs,output='sos');y=signal.sosfiltfilt(sos,y)
# 350 ms equal-power overlap for a seam-free loop. Preserve a recorded texture,
# not a claim of recording known F300 operating points.
n=int(.35*fs);t=np.linspace(0,1,n);mix=y[-n:]*np.cos(t*np.pi/2)+y[:n]*np.sin(t*np.pi/2)
y=np.concatenate([mix,y[n:-n]])
y=y-np.mean(y);y=y/max(.01,np.sqrt(np.mean(y*y)))*.18;y=np.tanh(y*1.5)/1.5
sf.write(root/'audio_source/outboard_body.wav',y,fs,subtype='PCM_16')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(root/'audio_source/outboard_body.wav'),'-c:a','libvorbis','-q:a','4',str(out/'outboard_body.ogg')],check=True)
meta=json.loads((root/'audio_source/provenance.json').read_text());meta.update({'derivative':'outboard_body.ogg','edits':'10–18 s mono excerpt; band-pass 36–680 Hz, normalized, 350 ms loop crossfade, Ogg encoding','not_an_F300_recording':True,'not_measured_RPM_layers':True})
(out/'provenance.json').write_text(json.dumps(meta,indent=2))
(out/'LICENSE.txt').write_text('Recorded texture: “River boat with outboard engine (at changing speeds)” by nomadas.\nhttps://freesound.org/people/nomadas/sounds/690160/\nCC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/\nEdited 10–18 s preview excerpt; bandpass, mono, level and seamless-loop processing.\nThis is a generic outboard recording, not a known Yamaha F300 or 450.\nRPM harmonics, water, wind and mechanism Foley are original procedural synthesis.\n')
print('Audio file bytes', (out/'outboard_body.ogg').stat().st_size)
