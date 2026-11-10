import subprocess
from make import frame,R,items
for i in range(4):
 p=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','540x960','-r','30','-i','-','-vf','scale=1080:1920:flags=lanczos','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(R/(items[i][0]+'-silent.mp4'))],stdin=subprocess.PIPE)
 for f in range(480):p.stdin.write(frame(i,f/30).tobytes())
 p.stdin.close();assert p.wait()==0
 print(items[i][0],flush=True)
