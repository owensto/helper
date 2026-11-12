/* Original canvas illustrations. Static scenery is cached; only water and life redraw. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  function ellipse(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function path(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(fill){c.closePath();c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function fish(c,x,y,size,s,angle=0,shadow=false){
    c.save();c.translate(x,y);c.rotate(angle);c.scale(size/100,size/100);
    const slim=['pike','slim','billfish','sail','sturgeon'].includes(s.shape),round=s.shape==='round',depth=round?25:slim?10:17;
    const gradient=c.createLinearGradient(0,-depth,0,depth);gradient.addColorStop(0,s.color);gradient.addColorStop(.5,s.color);gradient.addColorStop(1,'#e4ddbe');
    const body=shadow?'#102f36':gradient,fin=shadow?'#102f36':s.color;
    path(c,[[-37,0],[-58,-22],[-52,0],[-58,22]],fin);
    // Dorsal and ventral fins give each family a recognizable silhouette.
    if(s.shape==='sail')path(c,[[-33,-8],[-25,-48],[-13,-58],[5,-53],[27,-24],[28,-7]],fin);
    else if(s.shape==='grayling')path(c,[[-25,-10],[-20,-40],[0,-46],[17,-29],[24,-10]],fin);
    else path(c,[[-23,-depth*.65],[-10,-depth-14],[8,-depth-10],[20,-depth*.8]],fin);
    path(c,[[-4,depth*.7],[7,depth+13],[17,depth*.8]],fin);
    if(s.shape==='tuna'){path(c,[[10,-12],[26,-39],[18,-10]],'#d0b94d');path(c,[[-4,12],[14,35],[8,12]],'#d0b94d');}
    c.beginPath();c.moveTo(-40,0);c.bezierCurveTo(-22,-depth*1.3,20,-depth*1.3,43,-3);c.quadraticCurveTo(50,2,39,7);c.bezierCurveTo(15,depth*1.15,-18,depth*1.3,-40,0);c.fillStyle=body;c.fill();
    if(['billfish','sail'].includes(s.shape))path(c,[[38,-4],[85,-8],[42,0]],fin);
    if(s.shape==='sturgeon')path(c,[[35,-6],[61,0],[37,6]],fin);
    if(!shadow){
      c.save();c.beginPath();c.ellipse(0,0,32,depth*.75,0,0,TAU);c.clip();
      if(s.id==='rainbow-trout'){c.fillStyle='#b46d6f99';c.fillRect(-35,-3,75,5);}
      if(s.shape==='perch'||s.id==='wahoo'){for(let i=-30;i<30;i+=12)path(c,[[i,-22],[i+5,-22],[i+1,16],[i-3,12]],'#3d595b80');}
      if(['trout','salmon','pike','grayling'].includes(s.shape)){for(let i=0;i<35;i++){const xx=-29+(i*17%61),yy=-depth*.65+(i*7%(depth*1.15));ellipse(c,xx,yy,.9,.9,s.id==='brook-trout'?'#e8daba':'#344e4c99');}}
      if(s.id==='common-snook'){c.strokeStyle='#405548';c.lineWidth=1.6;c.beginPath();c.moveTo(-37,0);c.quadraticCurveTo(0,-3,30,1);c.stroke();}
      if(s.id==='red-drum')ellipse(c,-31,-1,2.8,3,'#293b2e');
      if(['salmon','bass','round','mahi'].includes(s.shape)){c.strokeStyle='#f0ead73b';c.lineWidth=.5;for(let i=-25;i<25;i+=6)for(let j=-8;j<12;j+=5){c.beginPath();c.arc(i+(j%2)*2,j,3,0,Math.PI);c.stroke();}}
      c.restore();
      path(c,[[25,-depth*.7],[20,0],[26,depth*.7]],null,'#30494180',1.3);
      path(c,[[16,3],[0,depth+9],[7,4]],s.color,'#314b4a55',.7);
      ellipse(c,34,-3,3,3,'#d9d3a6');ellipse(c,34,-3,1.7,1.7,'#152f31');ellipse(c,34.6,-3.5,.5,.5,'#fff9db');
      path(c,[[39,4],[46,2]],null,'#314942',.7);
    }
    c.restore();
  }
  function tree(c,x,y,h,color,seed=0){
    c.save();c.translate(x,y);c.fillStyle=color;c.strokeStyle=color;c.lineWidth=Math.max(1,h*.025);c.beginPath();c.moveTo(0,0);c.lineTo(0,-h);c.stroke();
    for(let j=0;j<8;j++){const yy=-h+j*h*.105,span=h*(.055+j*.026);path(c,[[0,yy-8],[-span,yy+h*.2],[-span*.3,yy+h*.15],[span,yy+h*.19]],color);}
    c.restore();
  }
  function palm(c,x,y,h,color){c.save();c.translate(x,y);c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-12,-h*.55,0,-h);c.stroke();for(let i=0;i<7;i++){let a=i*.63-3.2;c.beginPath();c.moveTo(0,-h);c.quadraticCurveTo(Math.cos(a)*34,-h+Math.sin(a)*20,Math.cos(a)*55,-h+Math.sin(a)*18+18);c.lineWidth=4;c.stroke();}c.restore();}
  class Scene{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.back=document.createElement('canvas');this.lastConfig='';this.rings=[];this.particles=[];}
    resize(){this.w=this.canvas.clientWidth;this.h=this.canvas.clientHeight;const d=Math.min(devicePixelRatio||1,1.6);this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);this.d=d;this.back.width=this.canvas.width;this.back.height=this.canvas.height;this.lastConfig='';}
    background(g){
      const c=this.back.getContext('2d');c.setTransform(this.back.width/1000,0,0,this.back.height/600,0,0);
      const water=CastwardGame.waters[g.water],night=g.day==='night',dusk=g.day==='dusk',day=g.day==='day',ice=g.water==='ice';
      const sky=c.createLinearGradient(0,0,0,320);sky.addColorStop(0,night?'#112a40':dusk?'#697b91':water.sky[0]);sky.addColorStop(.65,night?'#294759':dusk?'#d69d83':water.sky[1]);sky.addColorStop(1,night?'#516773':'#f4dfb6');c.fillStyle=sky;c.fillRect(0,0,1000,600);
      if(night){for(let i=0;i<80;i++)ellipse(c,(i*137.3)%1000,(i*53.4)%220,.7+(i%3)*.3,.7+(i%3)*.3,'#e0e6db88');}
      const sunX=day?700:780,sunY=day?90:night?95:165;
      const glow=c.createRadialGradient(sunX,sunY,1,sunX,sunY,160);glow.addColorStop(0,night?'#cadfd52a':'#ffedb34a');glow.addColorStop(1,'#fff0d000');c.fillStyle=glow;c.fillRect(sunX-160,sunY-160,320,320);
      ellipse(c,sunX,sunY,night?22:30,night?22:30,night?'#ecedcf':'#fff1c9');if(night)ellipse(c,sunX+10,sunY-7,20,20,'#213c50');
      const far=night?'#2d4653':ice?'#8faeb8':dusk?'#899491':'#93aaa1',mid=night?'#203d46':ice?'#bacdd0':'#657f76';
      if(!['offshore','flats'].includes(g.water)){
        path(c,[[0,310],[0,210],[80,195],[160,116],[190,148],[270,84],[350,178],[405,125],[500,213],[610,150],[670,184],[740,133],[835,196],[920,170],[1000,220],[1000,320]],far);
        path(c,[[160,116],[136,147],[159,140],[170,155],[190,148]],'#d5d9c5a0');path(c,[[270,84],[239,124],[265,116],[281,143],[293,115]],'#e3dfcbbb');
        path(c,[[0,300],[0,252],[110,219],[210,253],[320,202],[450,246],[590,218],[730,265],[870,230],[1000,257],[1000,320]],mid);
        for(let i=0;i<80;i++){const x=i*14,y=276+Math.sin(i*.22)*13;tree(c,x,y,14+(i*17%25),night?'#19353c':ice?'#6f9097':'#43675e');}
      }else{path(c,[[0,297],[0,278],[65,266],[140,283],[230,284],[270,296],[1000,297]],night?'#23464b':'#4b7b71');}
      const sea=c.createLinearGradient(0,285,0,600);sea.addColorStop(0,night?'#365765':water.water[0]);sea.addColorStop(1,night?'#102e3e':water.water[1]);c.fillStyle=sea;c.fillRect(0,290,1000,310);
      // Far shore reflection.
      const refl=c.createLinearGradient(0,290,0,420);refl.addColorStop(0,'#203e3b55');refl.addColorStop(1,'#203e3b00');c.fillStyle=refl;c.fillRect(0,290,1000,135);
      if(g.water==='river'){
        path(c,[[0,270],[130,290],[236,307],[126,340],[70,400],[153,490],[224,600],[0,600]],night?'#183930':'#344f3a');
        path(c,[[1000,269],[864,300],[766,314],[880,346],[938,391],[895,461],[810,600],[1000,600]],night?'#243d35':'#74806a');
        for(let i=0;i<23;i++){const x=18+i*9;tree(c,x,310+(i%5)*8,80+(i*23%110),night?'#142f2c':i%2?'#244d40':'#365c48');}
        for(let i=0;i<14;i++)tree(c,899+i*9,300+(i%4)*6,60+(i*19%105),night?'#193831':'#365747');
        for(let i=0;i<28;i++){let right=i%2,x=right?942-(i%7)*15:20+(i%8)*17,y=365+(i*29%220);ellipse(c,x,y,14+(i%3)*10,7+(i%4)*3,i%3===0?'#9e9d7c':'#5f7261');path(c,[[x-9,y-3],[x+2,y-8],[x+10,y-2]],null,'#c3c09c66');}
      }
      if(g.water==='lake'){
        path(c,[[0,292],[0,260],[120,269],[170,292]],'#31594d');for(let i=0;i<12;i++)tree(c,i*14,285,60+i*7%45,night?'#1a3c36':'#345e4e');
        // A small boathouse across the lake.
        c.fillStyle='#776d55';c.fillRect(807,266,63,31);path(c,[[797,266],[839,240],[880,266]],'#455448');c.fillStyle='#d5bf7b';c.fillRect(831,277,14,20);path(c,[[796,299],[894,299]],null,'#4a5143',4);
      }
      if(g.water==='flats'){
        ellipse(c,280,414,240,30,'#a7ccad5c');ellipse(c,900,510,240,48,'#d4d9a854');path(c,[[0,305],[0,271],[90,282],[200,301]],'#456d4e');for(let i=0;i<4;i++)palm(c,18+i*37,285,63+i*12,'#385f46');
        path(c,[[740,299],[800,284],[920,283],[1000,298]],'#b2b68b');for(let i=0;i<15;i++)ellipse(c,800+i*12,283-(i%3)*6,17,14,'#547c59');
      }
      if(g.water==='offshore'){
        path(c,[[0,301],[0,276],[49,259],[102,281],[169,301]],'#44646b');
        path(c,[[47,275],[54,195],[68,195],[77,281]],'#ded9ba');path(c,[[54,195],[61,184],[69,195]],'#a76048');c.fillStyle='#344d54';c.fillRect(53,196,17,13);path(c,[[49,211],[73,211]],null,'#303e45',3);c.fillStyle='#a2694d';c.fillRect(51,242,23,9);
      }
      if(ice){
        path(c,[[0,310],[1000,310],[1000,600],[0,600]],night?'#7699aa':'#dce6df');path(c,[[0,370],[213,389],[380,367],[596,390],[1000,360]],null,'#b0ccd0',1);
        for(let i=0;i<10;i++)path(c,[[i*120,420+(i%3)*20],[i*120+55,449+(i%3)*20],[i*120+25,480+(i%3)*23]],null,'#a6c1c955');
        // An open ice lead gives gesture casts and fish a continuous playable channel.
        path(c,[[125,298],[875,298],[906,340],[891,410],[927,475],[900,600],[110,600],[138,500],[115,420],[140,355]],night?'#183c50':'#356777','#b3d0d1',9);
        path(c,[[123,302],[145,357],[120,419],[143,501],[115,600]],null,'#f0f1ddbb',3);
        c.fillStyle='#996b52';c.fillRect(133,285,105,82);path(c,[[120,286],[184,244],[251,286]],'#556971');path(c,[[127,280],[184,244],[245,280]],null,'#eef0e1',7);c.fillStyle='#463e39';c.fillRect(174,316,28,51);c.fillStyle='#efc980';c.fillRect(145,302,19,20);c.fillStyle='#68797d';c.fillRect(216,249,8,27);
      }else{
        // Perspective dock in the foreground. Fine grain adds a tactile edge.
        path(c,[[0,600],[0,533],[192,510],[365,600]],'#4a4a37');
        path(c,[[0,537],[190,513],[350,600],[0,600]],'#947c55');
        for(let i=0;i<8;i++)path(c,[[i*41-120,600],[i*24,526-i*1.5]],null,'#554f3a',2);
        for(let i=0;i<16;i++)path(c,[[i*26-90,580],[i*17+20,541]],null,'#b49a6a55',1);
        path(c,[[52,560],[52,506]],null,'#63563b',12);ellipse(c,52,506,7,3,'#b7a27b');
      }
      // Fine deterministic grain, baked once into the scenery.
      const rng=CastwardGame.random(34);for(let i=0;i<6500;i++){c.fillStyle=i%2?'#fff7d006':'#153c3508';c.fillRect(rng()*1000,rng()*600,1.3,1.3);}
      if(night){c.fillStyle='#09223d25';c.fillRect(0,0,1000,600);}
    }
    action(g){
      const c=this.ctx,w=this.w,h=this.h,q=g.world,t=g.reduced?0:q.clock,phase=q.phase,TAU=Math.PI*2;
      const label=(text,x,y,color='#f9edc8',size=10)=>{c.font=`600 ${size}px sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y);};
      // Structure is also habitat and cover. Keep the open channel readable.
      c.save();
      for(let i=0;i<3;i++){
        const p=CastwardAction.spots[i],xx=p.x*w,yy=p.y*h;
        ellipse(c,xx,yy,w*.075,h*.032,i===0?'#173e3270':'#12373545');
        if(i===0){for(let j=0;j<12;j++){const ax=xx+(j-6)*w*.009;path(c,[[ax,yy+8],[ax-4,yy-8],[ax+Math.sin(t+j)*3,yy-16]],null,'#8aa66b99',2);}}
        if(i===1){for(let j=0;j<4;j++)ellipse(c,xx+(j-1.5)*13,yy+(j%2)*6,13,6,'#8b9d8970','#c6cbb63b');}
        if(i===2){for(let j=0;j<4;j++)path(c,[[xx-18+j*12,yy-12],[xx-23+j*12,yy+18]],null,'#b9986b99',6);path(c,[[xx-25,yy],[xx+23,yy]],null,'#d6ba8855',2);}
        if(['ready','lost','landed'].includes(phase)){
          ellipse(c,xx,yy,w*.07,h*.047,null,q.spot===i?'#f0d993':'#e1e7c055');
          label(String(i+1)+' · '+p.name,xx,yy+h*.065,'#f1e8c8',w<500?9:11);
        }
      }
      // A small bait shoal and diving birds point to productive water.
      const bait=CastwardAction.spots[q.spot];
      for(let i=0;i<6;i++){ellipse(c,(bait.x+.045+Math.sin(t*1.1+i)*.018)*w,(bait.y-.055+Math.cos(i*3+t)*.008)*h,2,1,'#e8e7bb88');}
      for(let i=0;i<2;i++){const dive=Math.max(0,Math.sin(t*.65+i*2))**10,xx=(bait.x+.09+Math.sin(t*.6+i)*.055)*w,yy=(.4+dive*(bait.y-.45))*h;path(c,[[xx-7,yy-2],[xx,yy+1],[xx+7,yy-3]],null,'#f4efd3b0',1.5);if(dive>.9)ellipse(c,xx,yy+8,9,3,null,'#e3e8c777');}
      // Actual AI positions, rather than decorative fish that teleport toward the float.
      for(const f of q.fish){
        if(f===q.hooked&&['fight','net','landed'].includes(phase))continue;
        c.globalAlpha=f.stage==='spooked'?.3:f.interest>.25?.92:.55;
        const size=Math.min(w*.1,72);fish(c,f.x*w,f.y*h,size,f.species,f.angle,false);c.globalAlpha=1;
        if(f.interest>.1&&phase==='retrieve'&&f===q.fish.reduce((a,b)=>a.interest>b.interest?a:b)){
          const colors={curious:'#d7e1c1',follow:'#f4d98b',nip:'#ffc17b',commit:'#ffe9a6'};
          label(f.stage.toUpperCase(),f.x*w,f.y*h-size*.37,colors[f.stage]||'#dae4d0',w<500?8:10);
          c.fillStyle='#0a333799';c.fillRect(f.x*w-18,f.y*h+size*.35,36,3);c.fillStyle=colors[f.stage]||'#cad3b2';c.fillRect(f.x*w-18,f.y*h+size*.35,36*f.interest,3);
        }
      }
      const rodX=(q.boat+g.rod*.09)*w,rodY=h*.79;
      if(['lake','offshore','flats'].includes(g.water)){ellipse(c,q.boat*w,h*.975,w*.125,h*.055,'#102f3788');path(c,[[(q.boat-.12)*w,h],[(q.boat-.09)*w,h*.94],[q.boat*w,h*.9],[(q.boat+.09)*w,h*.94],[(q.boat+.12)*w,h]],'#d5c3a0','#827a60',2);}
      path(c,[[(q.boat-.07)*w,h*1.04],[(q.boat-.035)*w,h*.93]],null,'#bd9563',9);
      c.strokeStyle='#182f2d';c.lineWidth=3;c.beginPath();c.moveTo((q.boat-.035)*w,h*.93);c.quadraticCurveTo(rodX-15,rodY-20+(q.tension||0)*24,rodX,rodY);c.stroke();
      if(g.state==='aim'){
        const tx=g.aim.x*w,ty=g.aim.y*h;
        c.setLineDash([5,7]);c.strokeStyle='#ffe5a8';c.lineWidth=1.5;c.beginPath();c.moveTo(rodX,rodY);c.quadraticCurveTo((rodX+tx)/2+q.wind*w,Math.min(rodY,ty)-h*.34,tx,ty);c.stroke();c.setLineDash([]);
        ellipse(c,tx,ty,17,7,'#ffdf8c22','#ffe5a8');path(c,[[tx-7,ty],[tx+7,ty]],null,'#ffe5a8');path(c,[[tx,ty-7],[tx,ty+7]],null,'#ffe5a8');
        label('LANDS HERE',tx,ty+22,'#fff1cd',9);
        if(g.gesture){const a=g.gesture.start,b=g.gesture.last;path(c,[[a.x*w,a.y*h],[b.x*w,b.y*h]],null,'#fff2c966',3);ellipse(c,b.x*w,b.y*h,10,10,'#fff2c922','#fff2c999');}
      }
      let xx=q.lure.x*w,yy=q.lure.y*h;
      if(phase==='flight')yy-=Math.sin(Math.min(1,q.flight)*Math.PI)*h*.3;
      if(phase==='bite')yy+=Math.sin(t*32)*4;
      if(['flight','retrieve','bite','fight','net'].includes(phase)){
        if(q.trail.length>1&&phase==='retrieve'){c.beginPath();q.trail.forEach((p,i)=>i?c.lineTo(p.x*w,p.y*h):c.moveTo(p.x*w,p.y*h));c.strokeStyle='#f1e1b134';c.lineWidth=2;c.stroke();}
        c.beginPath();c.moveTo(rodX,rodY);c.quadraticCurveTo((rodX+xx)/2+q.wind*w*2,(rodY+yy)/2+18*(1-(q.tension||0)),xx,yy);c.lineWidth=q.tension>.75?1.8:1;c.strokeStyle=q.tension>.75?'#ff927a':'#fff1c9b0';c.stroke();
        if(['flight','retrieve','bite'].includes(phase)){ellipse(c,xx,yy+4,12,4,null,'#eae8c877');ellipse(c,xx,yy,4,phase==='bite'?3:7,'#fff2c9');ellipse(c,xx,yy-3,4,3,'#e98c4b');
          if(phase==='bite'){c.strokeStyle='#ffdb8c';c.lineWidth=3;c.beginPath();c.arc(xx,yy,22,-Math.PI/2,-Math.PI/2+TAU*(1-q.biteTime/1.65));c.stroke();label('↑',xx,yy-30,'#fff2ce',24);}}
        if(['fight','net'].includes(phase)&&q.hooked){const jump=phase==='fight'&&q.jump>0;ellipse(c,xx,yy+6,30,8,'#12343755');fish(c,xx,yy-(jump&&!g.reduced?Math.sin((1.3-q.jump)/1.3*Math.PI)*h*.12:0),Math.min(w*.21,135),q.hooked.species,jump?-.45:q.run>0?0:Math.PI,false);if(jump)label(q.bowed?'NICE BOW':'TAP TO BOW',xx,yy-50,'#ffe6a4',12);}
      }
      if(phase==='fight'){
        const rx=w*.84,ry=h*.82,r=w<500?27:36;
        ellipse(c,rx,ry,r+7,r+7,'#10362ee6','#b4c4a480');ellipse(c,rx,ry,r,r,null,'#e7d79f');ellipse(c,rx,ry,r*.4,r*.4,'#617b60','#c9d0a3');
        const a=t*(g.holding||q.reelImpulse>.1?10:0);path(c,[[rx,ry],[rx+Math.cos(a)*r*.7,ry+Math.sin(a)*r*.7]],null,'#e0ce9c',3);ellipse(c,rx+Math.cos(a)*r*.7,ry+Math.sin(a)*r*.7,5,5,'#f0d59c');
        label('CIRCLE TO REEL',rx,ry+r+20,'#f6e9c5',w<500?8:10);
        c.strokeStyle=q.tension>.75?'#ff9b7e':'#a4d5ad';c.lineWidth=4;c.beginPath();c.arc(rx,ry,r+4,-Math.PI/2,-Math.PI/2+TAU*q.tension);c.stroke();
      }
      if(phase==='net'){ellipse(c,xx,yy,Math.min(45,w*.1),25,'#cfe5c41a','#f2dc9c');for(let i=-2;i<=2;i++)path(c,[[xx-30,yy+i*7],[xx+30,yy+i*7]],null,'#efdeb740',1);label('NET ↓',xx,yy-33,'#fff1c3',13);}
      if(q.popupTime>0&&!['bite','retrieve','net'].includes(phase)&&!q.popup.startsWith('JUMP')){label(q.popup,w*.5,h*.48,'#fff0ba',w<500?12:17);}
      if(['lake','offshore'].includes(g.water)){
        const sw=w<500?83:116,sh=w<500?48:64,sx=w-sw-16,sy=58;
        c.fillStyle='#0b3039d9';c.fillRect(sx,sy,sw,sh);c.strokeStyle='#86b9a366';c.strokeRect(sx,sy,sw,sh);
        for(let i=1;i<4;i++)path(c,[[sx,sy+i*sh/4],[sx+sw,sy+i*sh/4]],null,'#6eaa9b26');
        path(c,[[sx+(t*.16%1)*sw,sy],[sx+(t*.16%1)*sw,sy+sh]],null,'#afdeb65c');
        for(const f of q.fish){c.strokeStyle=f.interest>.3?'#f5d081':'#9bd0aa';c.beginPath();c.arc(sx+f.x*sw,sy+15+(f.y-.45)*sh*1.6,4,Math.PI,TAU);c.stroke();}label('LIVE SONAR',sx+sw/2,sy+sh+12,'#ebead0',8);
      }
      if(g.paused){c.fillStyle='#102c3988';c.fillRect(0,0,w,h);label('ON THE BANK',w*.5,h*.56,'#fff0ca',w<500?27:40);label('Resume when you are ready.',w*.5,h*.56+25,'#fff0ca',12);}
      c.restore();
    }
    splash(x,y,big=false){if(this.particles.length>100)return;for(let i=0;i<(big?20:10);i++)this.particles.push({x,y,vx:(i*17%31-15)*.003,vy:-.07-(i%5)*.02,life:.6+(i%4)*.1});this.rings.push({x,y,age:0});}
    draw(g,dt=0){
      if(!this.w)return;
      const config=g.water+g.day;if(config!==this.lastConfig){this.background(g);this.lastConfig=config;}
      const c=this.ctx,w=this.w,h=this.h,t=g.ambient,still=g.reduced; c.setTransform(this.d,0,0,this.d,0,0);c.clearRect(0,0,w,h);
      c.save();if(g.shake&&!still)c.translate(Math.sin(t*90)*g.shake*4,Math.cos(t*75)*g.shake*2);
      c.drawImage(this.back,0,0,w,h);
      const ice=g.water==='ice';
      // Long, shallow ripples: no per-pixel work, no full-scene filters.
      if(!ice){for(let i=0;i<56;i++){const yy=.495+i*.009,x=((i*139+t*7*(1+i%3))%(w+100))-50;const len=8+(i%8)*5;c.strokeStyle=i%3===0?'#d0e1c339':'#143e4a22';c.lineWidth=i%5===0?1.4:.7;c.beginPath();c.moveTo(x,yy*h);c.quadraticCurveTo(x+len/2,yy*h+Math.sin(t+i)*1.5,x+len,yy*h);c.stroke();}}
      // Shimmer in the sun/moon path.
      for(let i=0;i<(ice?8:32);i++){const yy=(ice?.58:.5)+i*.01,xx=(g.day==='day'?.7:.78)*w;ellipse(c,xx+Math.sin(i*7+t)*w*.02,yy*h,2+(i%5)*3+i*.6,.6,'#f6dda52a');}
      // Clouds drift gently across the sky.
      if(!still){for(let i=0;i<3;i++){const xx=((i*.37+t*.0015)%1.2-.1)*w;ellipse(c,xx,h*(.12+i*.05),w*.12,h*.008,'#f7e9d021');}}
      if(g.water==='offshore'&&g.day==='night'){path(c,[[w*.06,h*.335],[w*.53,h*.24],[w*.53,h*.42]],'#f5e7ac15');}
      if(!still&&g.water==='ice'){for(let i=0;i<4;i++)ellipse(c,w*.219+Math.sin(t+i)*3,h*(.4-i*.025),5+i*3,4+i*2,'#e4e8df30');}
      this.action(g);
      this.rings=this.rings.filter(r=>r.age<1.3);this.rings.forEach(r=>{r.age+=dt;ellipse(c,r.x*w,r.y*h,8+r.age*35,2+r.age*9,null,`rgba(238,238,207,${Math.max(0,.65-r.age*.5)})`);});
      this.particles=this.particles.filter(p=>p.life>0);this.particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.35*dt;if(!still)ellipse(c,p.x*w,p.y*h,1.5,2.5,'#e3e9d9aa');});
      if(!still&&g.weather!=='clear'){
        c.strokeStyle='#d6e6e96b';c.lineWidth=.8;for(let i=0;i<(g.weather==='snow'?38:52);i++){const xx=((i*137+t*(g.weather==='snow'?12:85))%(w+40))-20,yy=((i*67+t*(g.weather==='snow'?26:340))%(h+30))-15;if(g.weather==='snow')ellipse(c,xx+Math.sin(t+i)*8,yy,1.5,1.5,'#f4f3e4b0');else path(c,[[xx,yy],[xx-4,yy+13]],null,'#dbe6de60',.7);}
      }
      c.restore();
    }
  }
  window.CastwardArt={fish,Scene};
})();
