import sys,json,math,subprocess,hashlib,importlib.util,urllib.request
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from scipy.io import wavfile
R=Path(__file__).resolve().parent;sys.path.insert(0,str(R.parent));from engine.eleven_music import generate
sp=importlib.util.spec_from_file_location('av',R.parent/'castward-v2/audio_variants.py');av=importlib.util.module_from_spec(sp);sp.loader.exec_module(av)
FONT='/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'
items=[
('bait-thief','The bait has a frequent flyer.', 'coral seaside stage','white gull with a yellow beak','coral,cyan,cream','A gull steals three bait servings then opens a seafood counter.', ['The bait has wings.','One bite gone.','Two bites gone.','He opened a restaurant.'], 'Jaunty acoustic clarinet polka, tuba and brushed snare, 118 BPM, playful rising runs for three bird swoops at 3, 6 and 9 seconds, pause at 12.5 seconds then triumphant tiny restaurant opening flourish at 13 seconds.'),
('lure-critic','The fish has notes.', 'lavender restaurant review','purple fish critic with spectacles','lavender,lemon,plum','A fish critic rejects fancy lures then orders the worm with no hook.', ['The fish has notes.','Too much sparkle.','A metallic aftertaste.','The worm. Hold the hook.'], 'Dry elegant acoustic jazz waltz, muted trumpet, upright bass and soft piano, 92 BPM, pompous restaurant critic mood, restrained phrases at 3 and 7 seconds, dead stop at 12.5 seconds and warm comic cadence at 13 seconds.'),
('captain-guitar','Four rods. One guitar.', 'sunny boat boarding portrait','orange bearded captain and blue guest','yellow,navy,tangerine','A captain watches four rods arrive, then a guitar; the fish appear as a concert audience.', ['Four rods. One guitar.','The rods make sense.','The guitar is new.','The fish requested an encore.'], 'Sunny acoustic gypsy swing, nylon guitar lead and hand brushed snare, 132 BPM, curious short phrases, a guitar flourish at 8 seconds, dramatic pause at 12.5 seconds then cheerful concert finale at 13 seconds.'),
('fish-tale','This fish grows on land.', 'mint measurement infographic','pink elastic fish on a measuring board','mint,pink,ink','A tiny fish expands with each retelling until the measuring ruler resigns.', ['This fish grows on land.','At the dock.','Back at home.','The ruler quit.'], 'Whimsical acoustic chamber march, bassoon, pizzicato cello and flute, 106 BPM, each phrase grows larger at 4 and 8 seconds, pause at 12.5 seconds then a surprised bassoon descending cadence at 13 seconds.')]
voices={1:('Larry','fIGaHjfrR8KmMy0vGEVJ',[(.4,'The fish has notes.'),(4,'Too much sparkle.'),(8,'A metallic aftertaste.'),(13,'The worm. Hold the hook.')]),2:('Charlie','IKne3meq5aSn9XLyUdCD',[(.4,'Four rods. One guitar.'),(4,'The rods make sense.'),(8,'The guitar is new.'),(13,'The fish requested an encore.')])}
def pcm(p):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar','48000','-ac','1','-f','f32le','-']),dtype='<f4').copy()
def txt(d,text,y,size=35,color='#172b43'):
 f=ImageFont.truetype(FONT,size)
 while d.textbbox((0,0),text,font=f)[2]>470:size-=1;f=ImageFont.truetype(FONT,size)
 d.text((270,y),text,font=f,fill=color,anchor='mm')
def fish(d,x,y,s=1,c='#ec658f',eye=True):
 d.polygon([(x-65*s,y),(x-110*s,y-45*s),(x-110*s,y+45*s)],fill=c,outline='#172b43')
 d.ellipse((x-75*s,y-44*s,x+75*s,y+44*s),fill=c,outline='#172b43',width=3)
 d.polygon([(x-30*s,y-32*s),(x,y-70*s),(x+30*s,y-32*s)],fill=c)
 d.ellipse((x+35*s,y-21*s,x+48*s,y-8*s),fill='white');d.ellipse((x+41*s,y-19*s,x+47*s,y-10*s),fill='#172b43')
 d.arc((x+40*s,y-4*s,x+67*s,y+20*s),0,100,fill='#172b43',width=3)
def frame(i,t):
 bg=['#ffbaaa','#d5c1fc','#ffe780','#b9f6d4'][i];im=Image.new('RGB',(540,960),bg);d=ImageDraw.Draw(im)
 # Animated decorations continue during every hold.
 for j in range(14):
  x=(j*83+t*(12+i*4))%580-20;y=220+(j*137)%620+8*math.sin(t*2+j)
  d.ellipse((x,y,x+7,y+7),fill=['#ffe7c9','#ede3ff','#fff5bc','#e7ffed'][i])
 phase=0 if t<4 else 1 if t<8 else 2 if t<13 else 3
 txt(d,['BAIT BANDIT','TABLE FOR ONE','ALL ABOARD','FISH STORY'][i],90,22)
 txt(d,items[i][6][phase],175,36)
 bob=8*math.sin(t*3)
 if i==0:
  d.rectangle((0,650,540,960),fill='#40ccdc')
  for j in range(7):
   yy=690+j*35;xx=(t*30+j*90)%600-80;d.arc((xx,yy,xx+150,yy+25),0,180,fill='white',width=3)
  d.rounded_rectangle((75,560,465,690),20,fill='#fff0cf',outline='#17364b',width=4)
  txt(d,'BAIT',640,28)
  for j in range(3):
   if t<3+j*3:d.arc((155+j*85,580,200+j*85,605),0,280,fill='#f76c73',width=9)
  x=270+170*math.sin(t*1.2) if t<12 else 270;y=400+bob
  d.ellipse((x-60,y-35,x+65,y+35),fill='white',outline='#17364b',width=3)
  d.polygon([(x+55,y-9),(x+105,y+10),(x+55,y+20)],fill='#ffbb28');d.ellipse((x+35,y-16,x+43,y-8),fill='#17364b')
  d.line([(x-25,y),(x-70,y-65*math.sin(t*9)),(x-95,y-15)],fill='#17364b',width=7)
  if 3<t<12:
   d.arc((x+75,y+10,x+105,y+55),65,280,fill='#f76c73',width=8)
  if t>=13:
   d.rounded_rectangle((70,470,470,548),12,fill='#17364b');txt(d,'GULL & GRILL',509,32,'white')
   d.rectangle((x-35,y-65,x+25,y-31),fill='white');d.ellipse((x-46,y-85,x+36,y-45),fill='white')
 elif i==1:
  d.ellipse((55,520,485,745),fill='#fff2ad',outline='#592a75',width=5)
  d.ellipse((170,552,370,660),fill='white',outline='#592a75',width=3)
  fish(d,270,405+bob,1.5,'#9a6bd5')
  d.ellipse((306,367+bob,355,413+bob),outline='#172b43',width=5)
  if t<13:
   x=270+30*math.sin(t*2);d.ellipse((x-50,578,x+45,613),fill='#ffae36' if t<8 else '#79d7ed');d.line((x+45,593,x+65,620),fill='#172b43',width=3);d.arc((x+45,607,x+70,638),0,180,fill='#172b43',width=3)
   for j in range(4):d.line((x-40+j*25,568+5*math.sin(t*5+j),x-30+j*25,554),fill='white',width=3)
  else:
   d.arc((210,565,325,630),0,290,fill='#f485a7',width=15);txt(d,'CHEF APPROVED',785,23)
 elif i==2:
  d.rectangle((0,650,540,960),fill='#49c8ed');d.polygon([(35,605+bob),(505,605+bob),(440,735+bob),(110,735+bob)],fill='white',outline='#172b43')
  for x,c in [(155,'#f79b38'),(385,'#5da5e8')]:
   d.rounded_rectangle((x-52,450+bob,x+52,610+bob),20,fill=c);d.ellipse((x-43,360+bob,x+43,450+bob),fill='#ffd3a7',outline='#172b43',width=3)
   d.ellipse((x-20,393+bob,x-13,402+bob),fill='#172b43');d.ellipse((x+13,393+bob,x+20,402+bob),fill='#172b43')
  d.rectangle((105,352+bob,205,375+bob),fill='white');d.polygon([(115,421+bob),(195,421+bob),(155,462+bob)],fill='#9f5e27')
  for j in range(4):d.line((350+j*12,555+bob,300+j*28+5*math.sin(t*2),270),fill='#172b43',width=4)
  if t>=8:
   d.ellipse((330,490+bob,430,590+bob),fill='#a45a2f',outline='#172b43',width=4);d.ellipse((348,470+bob,412,535+bob),fill='#a45a2f');d.rectangle((373,400+bob,387,520+bob),fill='#784326');d.ellipse((367,515+bob,395,543+bob),fill='#172b43')
  if t>=13:
   for j in range(3):fish(d,100+j*170,815+15*math.sin(t*6+j),.55,['#fc74a8','#ffd269','#bd8cfa'][j])
   txt(d,'ONE MORE SONG!',855,26)
 else:
  scale=.65 if t<4 else 1.15 if t<8 else 1.85 if t<13 else 2.2
  fish(d,290,460+bob,scale,'#ed6c9d')
  yy=625+(max(0,t-13)*125 if t>=13 else 0);xx=45+10*math.sin(t*3)
  d.rounded_rectangle((xx,yy,xx+450,yy+80),10,fill='#ffdc62',outline='#172b43',width=3)
  for j in range(22):d.line((xx+10+j*20,yy,xx+10+j*20,yy+(35 if j%5==0 else 18)),fill='#172b43',width=2)
  if t>=13:txt(d,'RESIGNATION ACCEPTED',715,24)
 if t>=13:
  d.rounded_rectangle((170,880,370,927),20,fill='#172b43');txt(d,'castward.app',903,22,'white')
 return im

def main():
 source=json.loads((R.parent/'castward-v2/bass-strike.json').read_text())['page_url']
 (R/'sources/linked-page.html').write_bytes(urllib.request.urlopen(source).read())
 for i,(slug,title,style,char,pal,premise,texts,prompt) in enumerate(items):
  s=dict(slug=slug,brand='castward',title=title,duration=16,fps=30,width=1080,height=1920,page_url=source+'?utm_source=castward&utm_medium=video&utm_campaign=castward_funny&utm_content='+slug,caption=title+' An original fishing cartoon. Explore Castward.',voice='none',audio_source='elevenlabs',audio_mode='music_sfx',fact_scope='No factual fishing claims. Original fictional comedy. Linked Castward page saved in sources.',uniqueness=dict(format=style,template=style,scene=premise,character=char,background=style,palette=pal.split(','),premise=premise,payoff=dict(at=13,description=texts[-1])),text_timeline=[dict(start=a,end=b,text=x) for a,b,x in zip([0,4,8,13],[4,8,13,16],texts)])
  music=generate(s,16,prompt+' Exactly 16 seconds. Instrumental only. Natural acoustic instruments. No speech, vocals, synths, clanks, bells or electronic effects.');x=pcm(music)[:768000]*.48;x=np.pad(x,(0,max(0,768000-len(x))))
  if i in voices:
   name,vid,lines=voices[i];receipts=[]
   for j,(start,line) in enumerate(lines):
    out=R/'audio'/f'{slug}-voice-{j}.mp3';rc=av.api('text-to-speech/'+vid+'?output_format=mp3_44100_128',{'text':'[deadpan] '+line,'model_id':'eleven_v4','voice_settings':{'stability':.5,'similarity_boost':.75,'speed':1.05}},out);v=pcm(out);nz=np.flatnonzero(abs(v)>.01);v=v[max(0,nz[0]-1200):nz[-1]+2400]
    limit=2.7 if j==3 else 3.25
    if len(v)/48000>limit:
     tmp=out.with_suffix('.wav');wavfile.write(tmp,48000,v);v=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(tmp),'-af',f'atempo={len(v)/48000/limit}','-f','f32le','-']),dtype='<f4')
    a=int(start*48000);x[max(0,a-4800):min(len(x),a+len(v)+4800)]*=.3;x[a:a+len(v)]+=v*.95;receipts.append(dict(file=str(out),sha256=av.sha(out),start=start,duration=len(v)/48000,receipt=rc))
   s['voice']=dict(provider='elevenlabs',name=name,voice_id=vid,model='eleven_v4',sha256=hashlib.sha256(json.dumps(receipts).encode()).hexdigest(),script=' '.join(l for _,l in lines),segments=receipts);s['audio_mode']='voice_music_sfx'
  effect=av.A/('gulls-sfx.mp3' if i==0 else 'splash-sfx.mp3');v=pcm(effect);a=int((13.1 if i!=0 else 3)*48000);n=min(len(v),len(x)-a);x[a:a+n]+=v[:n]*.28;s['sound_effects']=[dict(file=str(effect),sha256=av.sha(effect))]
  wavfile.write(R/'audio'/(slug+'-mix.wav'),48000,x);(R/(slug+'.json')).write_text(json.dumps(s,indent=2))
  out=R/(slug+'-silent.mp4')
  p=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','540x960','-r','30','-i','-','-vf','scale=1080:1920:flags=lanczos','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(out)],stdin=subprocess.PIPE)
  for f in range(480):p.stdin.write(frame(i,f/30).tobytes())
  p.stdin.close();assert p.wait()==0;print('RENDER',slug,flush=True)
 (R/'manifest.json').write_text(json.dumps([r[0] for r in items]))
if __name__=='__main__':main()
