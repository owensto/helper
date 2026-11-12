/* Cast & Catch. Pointer, keyboard, and assistive button input share one state machine. */
(() => {
  'use strict';
  const root=document.querySelector('[data-fishing-game]');if(!root)return;
  const $=id=>document.getElementById(id), G=window.CastwardGame, A=window.CastwardArt, W=window.CastwardAction;
  const action=$('game-action'),status=$('game-status'),canvas=$('fishing-canvas');
  if(!canvas.getContext('2d')){status.textContent='This browser cannot draw the game. Try a browser with canvas support.';return;}
  let scene=new A.Scene(canvas);const E=window.CastwardExpedition;let careerPlace=null,manualReduced=false,gear={},view3D=false,trophy=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)'),key='castward-cast-catch-v2';
  let saved=G.restore(null),storageOK=true;
  try{saved=G.restore(JSON.parse(localStorage.getItem(key)||localStorage.getItem('castward-cast-catch-v1')||'null'));}catch{storageOK=false;}
  const date=new Date().toISOString().slice(0,10),daily=G.daily(date);const shared=new URLSearchParams(location.search).get('challenge');if(shared&&/^\d{1,10}$/.test(shared)){daily.seed=Number(shared)>>>0;daily.water=Object.keys(G.waters)[daily.seed%Object.keys(G.waters).length];}
  let water='river',mode='free',state='ready',time=0,ambient=0,power=0,quality=0,tension=0,progress=0,x=.58,y=.64;
  let holding=false,input=null,paused=false,visible=true,frame=0,last=0,lastUI=0,fish=null;
  let score=0,streak=0,remaining=60,roundActive=false,roundCatches=0,hook=0,shake=0,selectedLure='spoon';
  let day='dawn',weather='clear',rng=Math.random,sound=false,audio=null,master=null,ambientNode=null,ambientGain=null,lastClick=0,haptics=true,expanded=false,lastCatch=null;
  let soundWanted=false;try{soundWanted=localStorage.getItem('castward-sound')==='on';}catch{}
  let world=new W.Water(water,()=>rng()), gesture=null, aim={x:.55,y:.64}, rod=0, worldSeason=0, tilt=false, tiltX=0, tiltY=0, tiltBase=null;
  const keys=new Set();
  const active=()=>['aim','wait','bite','reel','net'].includes(state);
  const idle=()=>['ready','caught','lost'].includes(state);
  function save(){try{localStorage.setItem(key,JSON.stringify(saved));storageOK=true;}catch{storageOK=false;}$('game-storage-note').textContent=storageOK?'Your catches stay in this browser.':'Storage is unavailable. Catches last for this visit.';}
  function vibrate(pattern){if(haptics&&navigator.vibrate)navigator.vibrate(pattern);}
  function tone(frequency,duration=.1,type='sine',volume=.04){if(!sound||!audio||paused)return;try{const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(frequency,audio.currentTime);o.frequency.exponentialRampToValueAtTime(frequency*.6,audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(gain);gain.connect(master||audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{/* Optional audio. */}}
  function musicChord(index){if(!sound||!audio||paused)return;const chords=[[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66],[164.81,196,246.94]];for(const f of chords[index%4]){const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.005,t+.7);g.gain.exponentialRampToValueAtTime(.0001,t+4.5);o.connect(g);g.connect(master||audio.destination);o.start();o.stop(t+4.6);}}
  function splashSound(){tone(130,.3,'triangle',.07);tone(480,.12,'sine',.025);}
  function ambientAudio(){if(!audio)return;if(master)master.gain.setTargetAtTime(sound&&!paused?1:0,audio.currentTime,.06);if(!ambientNode){const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;data[i]=brown;}ambientNode=audio.createBufferSource();ambientNode.buffer=buffer;ambientNode.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=480;ambientGain=audio.createGain();ambientNode.connect(filter);filter.connect(ambientGain);ambientGain.connect(master||audio.destination);ambientNode.start();}ambientGain.gain.setTargetAtTime(sound&&!paused?.16:0,audio.currentTime,.15);}
  function setState(next,text,label){state=next;root.dataset.state=next;time=0;status.textContent=text;action.textContent=label;const labels={ready:'Your next fish is out there.',aim:'Pull back. Flick forward.',wait:'Make the lure come alive.',bite:'Bite! Swipe up.',net:'Bring it home. Tap the fish.',reel:'Fish on. Stay with it.',caught:'A story worth keeping.',lost:'There’s always another cast.'};$('game-stage').textContent=labels[next];$('game-instruction').textContent=({ready:'01 / MAKE YOUR CAST',aim:'01 / AIM INTO THE WATER',wait:'02 / WORK THE LURE',bite:'02 / SET THE HOOK',reel:'03 / EASY ON THE LINE',net:'04 / THE LAST REACH',caught:'05 / KEEP THE STORY',lost:'ONE MORE CAST'})[next];lockControls();updateUI();}
  function lockControls(){['expedition-open','shop-open','trophy-open','save-open','field-journal','field-tackle','field-daily','field-map'].forEach(id=>$(id).disabled=!idle()||roundActive);root.querySelectorAll('[data-water]').forEach(b=>b.disabled=!idle()||mode==='daily'||roundActive);root.querySelectorAll('[data-mode]').forEach(b=>b.disabled=active()||roundActive);root.querySelectorAll('[data-lure]').forEach(b=>b.disabled=!idle()||roundActive||saved.total<G.lures.find(l=>l.id===b.dataset.lure).need&&!CastwardExpedition.state().owned.includes(b.dataset.lure));$('daily-start').disabled=active()||roundActive;root.querySelectorAll('[data-spot]').forEach(b=>{b.disabled=!idle();b.setAttribute('aria-pressed',String(Number(b.dataset.spot)===world.spot));});}
  function reset(){release();gesture=null;power=tension=progress=hook=shake=0;fish=null;world.phase='ready';world.events=[];world.hooked=null;world.tension=world.progress=world.jump=0;world.populate();world.trail=[];world.popupTime=0;aim={x:.55,y:.64};$('game-catch').hidden=true;$('catch-celebration').hidden=true;scene.showCatch?.(null);$('game-cast-grade').textContent='';setState('ready',mode==='tournament'?'The clock starts with your first cast. Flick into the water.':'Pull back and release to cast. Or flick forward for more distance.','Keyboard cast ↗');draw();}
  function lose(text){release();gesture=null;world.phase='lost';streak=0;setState('lost',text+' Try another cast.','Try again ↗');tone(110,.22);vibrate(35);}
  function beginCast(){if(soundWanted&&!sound)$('game-sound').click();if(trophy){scene.showTrophy?.(null);trophy=false;$('mount-exit').hidden=true;}reset();if(mode==='tournament'&&!roundActive){roundActive=true;remaining=60;score=streak=roundCatches=0;}setState('aim','Flick forward to cast. With keys: arrows aim, then Space casts.','Cast now ↗');tone(330);}
  function launch(target){quality=G.clamp(1-Math.hypot(target.x-.55,target.y-.64)*1.3);target={...target,y:G.clamp(.88-(.88-target.y)*(gear.cast||1),.5,.82)};world.cast(target,{firstCast:mode==='free'&&saved.total===0&&!!E?.firstCast()});x=target.x;y=target.y;setState('wait','Drag slowly to steer the lure. Tap to twitch. Fish like different speeds.','Twitch lure');$('game-cast-grade').textContent='FOLLOW THE FISH';tone(410,.18);}
  function setHook(){if(!world.hook())return;fish=world.hooked.species;tension=world.tension;progress=0;lastClick=0;hook=fish.rarity==='common'?.45:1;shake=.6;scene.splash(world.lure.x,world.lure.y,true);vibrate([45,40,65]);setState('reel','Circle the reel or hold Space. Steer against the run. Tap on a jump to bow.','Hold to reel');tone(760,.22);}
  function press(){
    if(paused||$('game-menu-dialog').open||$('tournament-result').open)return;
    if(idle()){beginCast();return;}if(state==='aim'){launch(aim);return;}if(state==='wait'){world.twitch();return;}if(state==='bite'){setHook();return;}if(state==='reel'){if(world.jump>0&&!world.bowed)world.bow();else holding=true;}if(state==='net')world.net(world.lure.x,world.lure.y);
  }
  function release(){holding=false;input=null;keys.clear();world.reelImpulse=0;}
  function caught(){
    release();streak++;const {length,weight}=world.specimen||G.specimen(fish,rng,quality);const pts=G.points(fish.rarity,quality,streak);
    const entry={id:fish.id,species:fish.name,length,weight,water:careerPlace?.name||G.waters[water].name,waterId:water,rarity:fish.rarity,points:pts};lastCatch=entry;
    const fresh=!saved.collected[fish.id],record=!saved.best||weight>saved.best.weight;score+=pts;saved.total++;roundCatches++;saved.log.unshift(entry);saved.log=saved.log.slice(0,12);if(!saved.collected[fish.id]||length>saved.collected[fish.id].length)saved.collected[fish.id]=entry;if(record)saved.best=entry;
    if(mode==='daily')saved.daily[date]=Math.min(daily.target,(saved.daily[date]||0)+1);
    if(saved.slam.date!==date)saved.slam={date,ids:[]};if(!saved.slam.ids.includes(fish.id))saved.slam.ids.push(fish.id);
    const reward=E?.caught(entry,(world.twitchCount||0)>=3||world.combo>=2,mode==='daily');save();journal();setState('caught',`${fish.name} landed! +${pts} points. ${streak>1?streak+' in a row. ':''}All fish swim away.`,'Cast again ↗');
    $('catch-release').disabled=false;$('catch-release').textContent='Release this fish ↗';$('catch-discovery').textContent=fresh?'New species · '+Object.keys(saved.collected).length+' in your journal':record?'A new personal best.':'';
    $('catch-rarity').textContent=fish.rarity.toUpperCase()+' / '+(fresh?'NEW TO YOUR FISH LOG':'CATCH & RELEASE');$('catch-title').textContent=fish.name;$('catch-size').textContent=`${length} cm / ${weight.toFixed(2)} kg / +${pts} pts${record?' / Personal best!':''}`;$('catch-note').textContent=fish.fact;$('catch-trip').href=careerPlace?.canonicalPath||'/environments/'+G.waters[water].route+'/';$('catch-rules').href=careerPlace?.permit?.path||'/fishing-licenses/';$('catch-trip').textContent=careerPlace?'Plan this trip for real ↗':'Fish this water ↗';$('share-status').textContent='A game catch. All fish swim away.';
    const c=$('catch-art').getContext('2d');c.clearRect(0,0,660,300);A.fish(c,330,150,450,fish,-.08);scene.showCatch?.(fish);$('game-catch').hidden=false;
    $('celebration-fish').textContent=fish.name;$('catch-celebration').firstElementChild.textContent=fresh?'NEW SPECIES':record?'PERSONAL BEST':'LANDED WITH CARE';$('catch-celebration').hidden=false;
    const earned=`<span>+${reward?.coins||0} <small>COINS</small></span><span>+${reward?.xp||0} <small>XP</small></span>`;
    $('catch-rewards').innerHTML=earned;$('catch-earned').innerHTML=earned;
    const goal=E.nextGoal();$('catch-next').textContent='Next: '+goal.text+' ↗';$('catch-next').onclick=()=>{if(goal.action==='map')$('expedition-open').click();else{beginCast();canvas.scrollIntoView({block:'center',behavior:reduced.matches||manualReduced?'instant':'smooth'});canvas.focus({preventScroll:true});}};
    $('game-catch').classList.remove('catch-enter');requestAnimationFrame(()=>$('game-catch').classList.add('catch-enter'));
    tone(660,.18);setTimeout(()=>tone(990,.25),140);vibrate([25,40,25]);
    if(mode==='daily'&&saved.daily[date]>=3)status.textContent+=' Daily challenge complete!';
  }
  $('view-catch').onclick=()=>{$('game-catch').scrollIntoView({block:'center',behavior:reduced.matches||manualReduced?'instant':'smooth'});$('catch-title').focus({preventScroll:true});};
  function selectWater(id,career=false){if(!career){careerPlace=null;E?.free();}water=id;world=new W.Water(water,()=>rng());world.gear=gear;worldSeason=0;root.querySelectorAll('[data-water]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.water===water)));$('game-water-label').textContent=G.waters[water].subtitle;canvas.setAttribute('aria-label',`${G.waters[water].name} fishing water. Drag back and flick to cast. Arrows steer. Space casts, twitches, hooks, and reels. B bows. N nets.`);if(water==='ice'&&weather==='clear')weather='snow';else if(water!=='ice'&&weather==='snow')weather='clear';$('game-weather').value=weather;weatherLabel();reset();journal();}
  function selectMode(next){if(active()||roundActive)return;mode=next;score=streak=0;remaining=60;root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));rng=mode==='daily'?G.random(daily.seed):()=>Math.random();if(mode==='daily')selectWater(daily.water);else if(mode==='tournament'){const p=E.weekly();selectWater(p.water);world.speciesPool=CastwardCareer.targets(p);world.populate();$('game-water-label').textContent='WEEKLY WATER / '+p.name.toUpperCase();}else reset();updateUI();}
  function endTournament(){
    roundActive=false;release();setState('ready','That’s the bell. Your score is in the book.','Start cast ↗');saved.scores.push({score,date,catches:roundCatches});saved.scores.sort((a,b)=>b.score-a.score);saved.scores=saved.scores.slice(0,5);save();journal();pause(true);$('tournament-summary').textContent=`${score.toLocaleString()} points. ${roundCatches} ${roundCatches===1?'fish':'fish'} landed. Every one released.`;$('tournament-result').showModal();
  }
  function draw(){scene.draw({water,biome:careerPlace?.biome,day,weather,lure:selectedLure,state,time,ambient,power,tension,progress,x,y,holding,fish,paused,hook,shake,reduced:(reduced.matches||manualReduced),world,aim,gesture,rod,frameSeconds:draw.frameSeconds||0},paused?0:draw.dt||0);}
  function updateUI(){
    $('game-power').value=state==='wait'?G.clamp(world.speed/.15):power;
    $('game-meter-label').firstChild.textContent=state==='wait'?'Lure speed ':state==='reel'?'Reel pace ':'Cast strength ';
    $('game-meter-label').querySelector('small').textContent=state==='reel'?'SPIN OR HOLD':'CONTROL THE LURE';
    $('fight-behaviour').textContent=world.jump>0?'Jump · bow now':world.headshake>.1?'Head shake · ease off':world.run>0?'Fish runs →':'← Fish runs';
    if(state==='reel')$('game-power').value=holding?1:world.reelImpulse||0;
    $('game-tension').value=tension;$('game-tension').dataset.danger=String(tension>.72);
    $('game-tension-text').textContent=`${Math.round(tension*100)}% · ${tension>.72?'Ease off':tension<.2?'Reel in':'Good tension'}`;
    $('game-progress').value=progress;$('game-progress-text').textContent=Math.round(progress*100)+'%';
    $('game-score').textContent=String(score).padStart(4,'0');$('game-clock-label').textContent=mode==='tournament'?'TIME LEFT':'STREAK';$('game-streak').textContent=mode==='tournament'?Math.ceil(remaining)+'s':'×'+streak;
    action.classList.toggle('is-reeling',holding);if(state==='reel')action.textContent=world.jump>0&&!world.bowed?'Bow now ↓':'Hold to reel';root.dataset.sweet=String(state==='reel'&&tension>=.2&&tension<=.76);
    $('game-bow').disabled=paused||state!=='reel'||world.jump<=0||world.bowed;$('game-net').disabled=paused||state!=='net';
    $('game-drag-value').textContent=$('game-drag').value+'%';$('game-wind').textContent=`WIND ${world.wind<0?'←':'→'} ${Math.round(Math.abs(world.wind)*240)} kn`;
    const hint=$('game-live-hint'),text=paused?'PAUSED':({ready:'PULL BACK. RELEASE TO CAST.',aim:gesture?'FLICK TOWARD YOUR FISH':'ARROWS AIM · SPACE CASTS',wait:world.phase==='flight'?'ON ITS WAY…':'STEER SLOWLY · TAP TO TWITCH',bite:'BITE! SWIPE UP ↑',reel:world.jump>0?'JUMP! TAP TO BOW':world.run>0?'RUN RIGHT → · ROD LEFT ←':'← RUN LEFT · ROD RIGHT →',net:'TAP THE FISH TO NET',caught:'',lost:'ONE MORE CAST.'})[state];
    const interested=world.fish.reduce((a,b)=>a.interest>b.interest?a:b),detail=state==='wait'&&world.phase!=='flight'?`${interested.species.name} · ${interested.stage} · likes ${W.preference(interested.species).name} · ${world.depth.toFixed(1)} m`:state==='reel'?`${Math.round(progress*100)}% home · ${Math.round(tension*100)}% tension · hold and slide the reel`:state==='bite'?'A quick upward swipe, or press Space':state==='ready'?'Your cast starts anywhere on the water.':state==='net'?'Tap the fish or press N.':'Your hands. The water. The chase.';
    if(hint.firstChild?.textContent!==text||hint.lastChild?.textContent!==detail){hint.replaceChildren(document.createTextNode(text));const small=document.createElement('small');small.textContent=detail;hint.append(small);}hint.dataset.urgent=String(state==='bite'||(state==='reel'&&world.jump>0));
  }
  function tick(dt,elapsed=dt){E?.tick(dt,state);if(trophy)return;
    if(!(reduced.matches||manualReduced))ambient+=dt;
    if(roundActive){remaining=Math.max(0,remaining-elapsed);if(remaining<=0){endTournament();return;}}
    shake=Math.max(0,shake-dt*2);hook=Math.max(0,hook-dt);const step=(hook>0||world.jump>0)&&!(reduced.matches||manualReduced)?dt*.5:dt;time+=step;
    const dx=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),dy=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
    if(state==='aim'&&!gesture){power=G.clamp(power+dt*.5);aim.x=G.clamp(aim.x+dx*dt*.25,.16,.87);aim.y=G.clamp(aim.y+dy*dt*.2,.5,.82);}
    if(state==='aim'&&gesture){const decay=G.clamp(1-(performance.now()-gesture.last.t)/300);aim=W.castGesture(gesture.start,gesture.back,gesture.last,{x:gesture.velocity.x*decay,y:gesture.velocity.y*decay},world.wind);power=aim.power;}
    if(state==='reel'&&dx)rod=dx;
    world.step(step,{dx:dx||(tilt?tiltX:0),dy:dy||(tilt?tiltY:0),held:holding,rod,drag:Number($('game-drag').value)/100},{day,weather,lure:selectedLure});
    if(sound&&Math.floor(time/5)>Math.floor((time-dt)/5)){musicChord(Math.floor(time/5));if(day!=='night')tone(1800, .16,'sine',.008);}if(sound&&state==='wait'&&world.phase==='flight')tone(180,.03,'sawtooth',.002);const season=Math.floor(world.clock/90);if(season>worldSeason){worldSeason=season;day=['dawn','day','dusk','night'][season%4];weather=season%3===1?'rain':water==='ice'?'snow':'clear';$('game-time').value=day;$('game-weather').value=weather;weatherLabel();}
    x=world.lure.x;y=world.lure.y;
    for(const event of world.events.splice(0)){
      if(['splash','twitch','jump','bow'].includes(event.type)){scene.splash(event.x,event.y,event.type==='jump');if(event.type==='splash')splashSound();else tone(event.type==='twitch'?420:220,.09);}
      if(event.type==='bite'){setState('bite','Bite! Swipe up now, or press Space to set the hook.','Set the hook!');vibrate([25,30,50]);tone(950,.18);}
      if(event.type==='jump'){vibrate([20,25,20]);status.textContent='Jump! Tap the water or press B to bow.';}
      if(event.type==='net')setState('net','The fish is close. Tap the fish to scoop it, or press N.','Net fish');
      if(event.type==='lost')lose(world.reason);
      if(event.type==='landed'){caught();scene.splash(x,y,true);world.say('LANDED!  ×'+streak);}
    }
    if(state==='reel'){tension=world.tension;progress=world.progress;if((holding||world.reelImpulse>.1)&&time-lastClick>(.2-(holding?1:world.reelImpulse||0)*.13)){tone(1500+world.tension*700,.025,'triangle',.016);lastClick=time;}const stageText=world.snag>.3?'Near a snag! Steer into open water.':world.tension>.75?'Ease the reel. Lower the drag.':world.run>0?'Fish runs right. Pull the rod left.':'Fish runs left. Pull the rod right.';if($('game-stage').textContent!==stageText)$('game-stage').textContent=stageText;}
    if(state==='wait'&&world.retrieveTime>40)lose('The fish lost interest. Try another spot or retrieve.');
  }
  function loop(now){frame=0;if(paused||!visible||document.hidden)return;const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.05);last=now;tick(dt,elapsed);draw.dt=dt;draw.frameSeconds=elapsed;draw();if(now-lastUI>80||now<lastUI){updateUI();lastUI=now;}if(!paused)frame=requestAnimationFrame(loop);}
  function schedule(){if(!frame&&!paused&&visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(loop);}}
  function pause(next){paused=next;release();gesture=null;updateUI();root.dataset.paused=String(paused);$('game-pause').textContent=paused?'▶ Resume':'Ⅱ Pause';$('game-pause').setAttribute('aria-pressed',String(paused));action.disabled=paused;if(paused){cancelAnimationFrame(frame);frame=0;draw();}else schedule();ambientAudio();}
  function weatherLabel(){const hints={river:'Trout hold beside fast current. Try a slow fly or spoon.',lake:'Bass use cover. Work the weed edge at first light.',flats:'Bonefish and permit feed over shallow flats. Keep the approach quiet.',ice:'Cold fish save energy. Work a small lure slowly near the bottom.',offshore:'Tuna hold deeper. A metal jig reaches fish below the surface.',reef:'Reef fish stay close to cover. Keep the rod toward open water.'};$('water-conditions').textContent=hints[water];$('game-weather-label').textContent=({dawn:'FIRST LIGHT',day:'HIGH SUN',dusk:'LAST LIGHT',night:'AFTER DARK'})[day]+' · '+({clear:'LIGHT BREEZE',rain:'RAIN',snow:'SNOW'})[weather];}
  function journal(){
    $('game-best').textContent=saved.best?`${saved.best.weight.toFixed(2)} kg · ${saved.best.species}`:'Your story starts here.';
    $('game-log-count').textContent=saved.log.length;const list=$('game-log');list.replaceChildren();
    if(!saved.log.length){const li=document.createElement('li');li.textContent='No catches yet. The water is patient.';list.append(li);}
    saved.log.forEach(c=>{const li=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('span'),a=document.createElement('a');const s=G.species.find(s=>s.name===c.species);title.textContent=c.species;detail.textContent=`${c.length} cm · ${c.weight.toFixed(2)} kg · ${c.water}`;a.href='/environments/'+G.waters[s?.water||'river'].route+'/';a.append(title,detail);li.append(a);list.append(li);});
    const slam=G.slams[0],slamIds=saved.slam.date===date?saved.slam.ids:[];const slamCount=slam.ids.filter(id=>slamIds.includes(id)).length;$('slam-card').dataset.earned=String(slamCount===3);$('slam-progress').textContent=(slamCount===3?'✦ Slam complete · ':'')+slam.ids.map(id=>(slamIds.includes(id)?'✓ ':'○ ')+G.species.find(s=>s.id===id).name).join(' · ');
    const n=Object.keys(saved.collected).length;$('collection-count').textContent=n;$('collection-mini').textContent=`${n} / ${G.species.length}`;
    $('daily-description').textContent=`Land three fish on the ${G.waters[daily.water].name.toLowerCase()}. One water for everyone today. Three fish to bring home.`;$('daily-progress').textContent=`${saved.daily[date]||0} / 3 landed today${saved.daily[date]>=3?' · Complete!':''}`;$('daily-dots').querySelectorAll('i').forEach((dot,i)=>dot.classList.toggle('done',i<(saved.daily[date]||0)));$('daily-date').textContent=date+' / UTC';
    const box=$('game-lures');box.replaceChildren();G.lures.forEach(l=>{const b=document.createElement('button');b.type='button';b.dataset.lure=l.id;b.setAttribute('aria-pressed',String(l.id===selectedLure));b.title=l.detail;const icon=document.createElement('span');icon.className='lure-art '+l.id;icon.style.setProperty('--lure',l.color);icon.setAttribute('aria-hidden','true');const words=document.createElement('span'),name=document.createElement('b'),desc=document.createElement('small');name.textContent=l.id==='fly'?(water==='river'?'Woolly Bugger':water==='flats'?'Shrimp fly':'Baitfish streamer'):l.name;desc.textContent=(saved.total>=l.need||CastwardExpedition.state().owned.includes(l.id))?l.need?'Ready · '+l.detail:l.detail:`${saved.total} / ${l.need} catches to unlock`;words.append(name,desc);b.append(icon,words);b.onclick=()=>{E.selectLure(l.id);tone(480);};box.append(b);});
    const collection=$('fish-collection');collection.dataset.expanded=String(expanded);collection.replaceChildren();G.species.forEach((s,i)=>{const owned=saved.collected[s.id],card=document.createElement('a');card.className='fish-species-card '+s.rarity+(owned?' collected':'');card.href='/environments/'+G.waters[s.water].route+'/';card.hidden=!expanded&&i>=5;const top=document.createElement('div');top.className='fish-card-top';const num=document.createElement('span'),tier=document.createElement('span');num.textContent=String(i+1).padStart(2,'0')+' / '+G.waters[s.water].name;tier.textContent=s.rarity;top.append(num,tier);const art=document.createElement('canvas');art.width=400;art.height=170;art.setAttribute('aria-hidden','true');const c=art.getContext('2d');c.globalAlpha=1;if(expanded||i<5)A.fish(c,200,90,235,s,-.06);const title=document.createElement('h3'),desc=document.createElement('p');if(!owned){c.globalAlpha=1;c.globalCompositeOperation='source-in';c.fillStyle='#233f38';c.fillRect(0,0,400,170);c.globalCompositeOperation='source-over';}title.textContent=s.name;desc.textContent=owned?`${owned.length} cm · ${owned.weight.toFixed(2)} kg · Logged ✓`:'Still out there · Explore water ↗';card.append(top,art,title,desc);collection.append(card);});
    const board=$('game-leaderboard');board.replaceChildren();if(!saved.scores.length){const li=document.createElement('li');li.textContent='The first score is yours to set.';board.append(li);}saved.scores.forEach((s,i)=>{const li=document.createElement('li'),rank=document.createElement('span'),value=document.createElement('b'),d=document.createElement('span');rank.textContent=String(i+1).padStart(2,'0');value.textContent=s.score.toLocaleString()+' pts';d.textContent=s.date;li.append(rank,value,d);board.append(li);});lockControls();
    if(!storageOK)$('game-storage-note').textContent='Storage is unavailable. Catches last for this visit.';
  }
  // Pointer capture keeps cast, rod sweep, and reel turn continuous outside the canvas.
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,t:performance.now()};};
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||paused||gesture)return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);const p=point(e);
    if(idle()){const spot=view3D?-1:W.spots.findIndex(s=>Math.hypot(s.x-p.x,s.y-p.y)<.045);if(spot>=0){world.phase='ready';world.moveSpot(spot);lockControls();return;}beginCast();}
    gesture={id:e.pointerId,start:p,back:p,last:p,velocity:{x:0,y:-1},travel:0,kind:state,angle:Math.atan2(p.y-.82,p.x-.84),reel:state==='reel'&&p.x>.7&&p.y>.65};
  });
  canvas.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId||paused)return;e.preventDefault();const p=point(e),g=gesture,dt=Math.max(.008,(p.t-g.last.t)/1000);g.travel+=Math.hypot(p.x-g.last.x,p.y-g.last.y);
    if(g.kind==='aim'){if(p.y>g.back.y)g.back=p;g.velocity={x:(p.x-g.last.x)/dt,y:(p.y-g.last.y)/dt};aim=W.castGesture(g.start,g.back,p,g.velocity,world.wind);power=aim.power;}
    else if(state==='wait'){const q=scene.input?scene.input(p):p;world.steer(q.x,q.y);}
    else if(state==='reel'){if(g.reel){const angle=Math.atan2(p.y-.82,p.x-.84);let delta=angle-g.angle;delta=Math.atan2(Math.sin(delta),Math.cos(delta));world.reel(Math.abs(delta)*.6);g.angle=angle;}else rod=G.clamp((p.x-.5)*4,-1,1);}g.last=p;
  });
  function finishGesture(e){
    if(!gesture||gesture.id!==e.pointerId)return;const g=gesture,p=point(e);gesture=null;if(paused)return;
    if(g.kind==='aim'){if(g.back.y-g.start.y>.025&&p.y<g.back.y-.04)launch(W.castGesture(g.start,g.back,p,{x:g.velocity.x*G.clamp(1-(p.t-g.last.t)/300),y:g.velocity.y*G.clamp(1-(p.t-g.last.t)/300)},world.wind));else if(g.back.y-g.start.y>.035)launch(W.castGesture(g.start,g.back,{x:g.start.x,y:g.start.y-.1},{x:0,y:-.6-(g.back.y-g.start.y)*3},world.wind));else setState('ready','Pull down to load the rod. Release to cast.','Cast ↗');}
    else if(state==='bite'&&g.start.y-p.y>.055&&p.t-g.start.t<650)setHook();
    else if(state==='wait'&&g.travel<.035)world.twitch();
    else if(state==='reel'&&g.travel<.035)world.bow();
    else if(state==='net'&&g.kind==='net'){const q=scene.input?scene.input(p):p;if(view3D&&Math.hypot(p.x-scene.lureScreen.x,p.y-scene.lureScreen.y)<.13)world.net(world.lure.x,world.lure.y);else world.net(q.x,q.y);}
  }
  canvas.addEventListener('pointerup',finishGesture);
  canvas.addEventListener('pointercancel',()=>{gesture=null;release();if(state==='aim')reset();});canvas.addEventListener('lostpointercapture',()=>{gesture=null;});
  canvas.addEventListener('wheel',e=>{if(['reel','net'].includes(state)&&!paused){e.preventDefault();world.reel(Math.min(.6,Math.abs(e.deltaY)*.006));}},{passive:false});
  action.addEventListener('pointerdown',e=>{if(e.button!==0||input)return;action.focus({preventScroll:true});input='pointer';action.setPointerCapture(e.pointerId);press();});
  action.addEventListener('pointermove',e=>{if(input==='pointer'&&state==='reel'){const b=action.getBoundingClientRect();rod=G.clamp((e.clientX-b.left-b.width/2)/(b.width*.35),-1,1);}});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>action.addEventListener(type,()=>{release();rod=0;}));
  for(const [id,direction]of [['rod-left',-1],['rod-right',1]]){$(id).onpointerdown=e=>{e.preventDefault();$(id).setPointerCapture(e.pointerId);rod=direction;};$(id).onpointerup=$(id).onpointercancel=()=>{rod=0;};$(id).onclick=()=>{rod=direction;};}

  root.addEventListener('keydown',e=>{
    if(e.target.closest('input,select,dialog,a')||(e.target.closest('button')&&e.target!==action))return;
    const k=e.key.toLowerCase();if(k==='p'){e.preventDefault();if(!e.repeat)pause(!paused);return;}if(paused)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();keys.add(e.key);return;}
    if(['b','n','[',']','1','2','3'].includes(k)){e.preventDefault();if(k==='b')world.bow();if(k==='n')world.net(world.lure.x,world.lure.y);if(k==='['||k===']'){$('game-drag').value=G.clamp(Number($('game-drag').value)+(k==='['?-5:5),15,85);updateUI();}if(['1','2','3'].includes(k)&&idle()){world.phase='ready';world.moveSpot(Number(k)-1);lockControls();}return;}
    if(![' ','Enter'].includes(e.key))return;e.preventDefault();if(e.repeat||input)return;input=e.key;press();
  });
  window.addEventListener('keyup',e=>{keys.delete(e.key);if(e.key===input){e.preventDefault();holding=false;input=null;}});
  action.addEventListener('click',e=>{if(e.detail===0&&!input){press();release();}});
  $('game-bow').onclick=()=>world.bow();$('game-net').onclick=()=>world.net(world.lure.x,world.lure.y);$('game-drag').oninput=updateUI;
  root.querySelectorAll('[data-spot]').forEach(b=>b.onclick=()=>{if(idle()){world.phase='ready';world.moveSpot(Number(b.dataset.spot));lockControls();draw();}});
  $('game-pause').onclick=()=>pause(!paused);
  window.addEventListener('blur',()=>{if(active()||roundActive)pause(true);else release();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  root.querySelectorAll('[data-water]').forEach(b=>b.onclick=()=>selectWater(b.dataset.water));root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));$('daily-start').onclick=()=>{selectMode('daily');action.focus({preventScroll:true});};
  $('game-sound').onclick=async()=>{sound=!sound;if(sound){try{const Audio=window.AudioContext||window.webkitAudioContext;audio||=new Audio();if(!master){master=audio.createGain();master.connect(audio.destination);}await audio.resume();}catch{sound=false;status.textContent='Sound is unavailable here. You can still play.';}}$('game-sound').textContent=sound?'♪ Sound on':'♪ Sound off';$('game-sound').setAttribute('aria-pressed',String(sound));soundWanted=sound;try{localStorage.setItem('castward-sound',sound?'on':'off');}catch{}ambientAudio();tone(440);};
  const onTilt=e=>{if(!tilt||e.gamma==null||e.beta==null)return;tiltBase??=e.beta;tiltX=G.clamp(e.gamma/30,-1,1);tiltY=G.clamp((e.beta-tiltBase)/30,-1,1);};
  $('game-tilt').onclick=async()=>{
    const button=$('game-tilt');if(tilt){tilt=false;window.removeEventListener('deviceorientation',onTilt);}else{
      try{if(!window.DeviceOrientationEvent)throw new Error('unavailable');if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted')throw new Error('denied');tilt=true;tiltBase=null;window.addEventListener('deviceorientation',onTilt);}catch{button.textContent='Tilt unavailable · use drag or arrows';return;}
    }button.setAttribute('aria-pressed',String(tilt));button.textContent=tilt?'Tilt steering on · hold level':'Tilt steering off';
  };
  $('game-haptics').onclick=()=>{haptics=!haptics;$('game-haptics').textContent='Haptics '+(haptics?'on':'off');$('game-haptics').setAttribute('aria-pressed',String(haptics));};
  const menu=$('game-menu-dialog');$('game-menu').onclick=()=>{pause(true);menu.showModal();};root.querySelectorAll('[data-close-menu]').forEach(b=>b.onclick=()=>menu.close());menu.addEventListener('close',()=>pause(false));menu.addEventListener('cancel',e=>{e.preventDefault();menu.close();pause(false);});
  $('game-time').onchange=e=>{day=e.target.value;weatherLabel();draw();};$('game-weather').onchange=e=>{weather=e.target.value;weatherLabel();draw();};
  $('game-end-round').onclick=()=>{roundActive=false;score=streak=0;menu.close();reset();selectMode('free');};
  const result=$('tournament-result');$('tournament-again').onclick=()=>{result.close();pause(false);reset();action.focus({preventScroll:true});};$('tournament-close').onclick=()=>{result.close();pause(false);selectMode('free');};result.addEventListener('cancel',e=>{e.preventDefault();$('tournament-close').click();});
  $('collection-more').onclick=()=>{expanded=!expanded;$('collection-more').setAttribute('aria-expanded',String(expanded));$('collection-more').textContent=expanded?'Close the full Fish Log ↑':'Open the full Fish Log · '+G.species.length+' species ↓';journal();};
  $('catch-share').onclick=async()=>{
    if(!lastCatch)return;const catchEntry={...lastCatch},s=G.species.find(s=>s.id===catchEntry.id),out=document.createElement('canvas');out.width=1080;out.height=1350;const c=out.getContext('2d');let preview=null;try{if(view3D)preview=scene.catchImage(s);}catch{}const shade=preview?.getContext('2d').getImageData(0,0,1,1).data;
    c.fillStyle='#ede9d9';c.fillRect(0,0,1080,1350);c.fillStyle=shade?`rgb(${shade[0]},${shade[1]},${shade[2]})`:'#183e33';c.fillRect(40,40,1000,1270);c.strokeStyle='#a9b78c';c.strokeRect(65,65,950,1220);c.textAlign='center';c.fillStyle='#e6dcb8';c.font='22px sans-serif';c.fillText('CASTWARD / THE FIELD CLUB',540,150);c.font='700 96px "Barlow Condensed", sans-serif';c.fillText('ONE FOR THE BOOK.',540,280);if(!preview){c.fillStyle='#21483d';c.beginPath();c.arc(540,590,280,0,Math.PI*2);c.fill();}if(preview)c.drawImage(preview,100,390);else if(view3D)c.drawImage($('catch-art'),100,390,880,400);else A.fish(c,540,590,s.shape==='billfish'||s.shape==='sail'?530:660,s,-.1);c.fillStyle='#e9d8a5';c.font='20px sans-serif';c.fillText(catchEntry.rarity.toUpperCase()+' / CATCH & RELEASE',540,905);c.fillStyle='#f6efda';c.font='700 70px "Barlow Condensed", sans-serif';c.fillText(catchEntry.species.toUpperCase(),540,1000,910);c.font='30px sans-serif';c.fillText(`${catchEntry.length} cm   /   ${catchEntry.weight.toFixed(2)} kg`,540,1070);c.font='22px sans-serif';c.fillText(catchEntry.water+' · Cast & Catch',540,1180,900);c.font='20px sans-serif';c.fillText('castward.app/play/?challenge='+daily.seed,540,1230);
    const dataURL=out.toDataURL('image/png'),bytes=Uint8Array.from(atob(dataURL.split(',')[1]),ch=>ch.charCodeAt(0)),blob=new Blob([bytes],{type:'image/png'}),filename='castward-'+s.id+'.png';
    try{const file=new File([blob],filename,{type:'image/png'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'My Cast & Catch fish',text:'Can you beat this? https://castward.app/play/?challenge='+daily.seed,url:'https://castward.app/play/?challenge='+daily.seed});$('share-status').textContent='Catch shared.';return;}}catch(e){if(e.name==='AbortError'){$('share-status').textContent='Share cancelled. Your catch is still in the book.';return;}}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('share-status').textContent='Your catch card downloaded as a PNG.';
  };
  new ResizeObserver(()=>{scene.resize();draw();}).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;if(active()||roundActive)pause(true);}else schedule();}).observe(root.querySelector('.game-main'));
  reduced.addEventListener('change',()=>{draw();});
  const sheet=$('field-sheet');let sheetNodes=[];
  function openField(title,nodes){if(!idle())return;pause(true);sheetNodes=nodes.map(node=>{const marker=document.createComment('field-home');node.before(marker);$('field-sheet-body').append(node);return {node,marker};});$('field-sheet-title').textContent=title;sheet.showModal();}
  sheet.addEventListener('close',()=>{for(const {node,marker}of sheetNodes){marker.replaceWith(node);}sheetNodes=[];pause(false);});
  $('field-close').onclick=()=>sheet.close();
  $('field-map').onclick=()=>$('expedition-open').click();
  $('field-journal').onclick=()=>{expanded=true;journal();openField('Fish journal',[$('fish-log'),$('slam-card')]);};
  $('field-tackle').onclick=()=>openField('Choose your retrieve',[document.querySelector('.tackle-box'),$('water-conditions')]);
  $('field-daily').onclick=()=>openField('Today on the water',[document.querySelector('.daily-card')]);
  const dailyStart=$('daily-start').onclick;$('daily-start').onclick=()=>{if(sheet.open)sheet.close();dailyStart();};
  $('catch-release').onclick=()=>{if(state!=='caught')return;$('catch-celebration').hidden=true;scene.releaseFish?.();$('catch-release').disabled=true;$('catch-release').textContent='Released · swim strong';status.textContent='Back in the water. Your record stays in the journal.';draw();};
  $('game-immersive').onclick=async()=>{const on=!root.classList.contains('immersive');root.classList.toggle('immersive',on);document.documentElement.classList.toggle('game-immersive',on);$('game-immersive').setAttribute('aria-pressed',String(on));$('game-immersive').textContent=on?'Exit full view':'Full view ⛶';try{if(on&&root.requestFullscreen)await root.requestFullscreen();else if(!on&&document.fullscreenElement)await document.exitFullscreen();}catch{}scene.resize();draw();};
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){root.classList.remove('immersive');document.documentElement.classList.remove('game-immersive');$('game-immersive').setAttribute('aria-pressed','false');$('game-immersive').textContent='Full view ⛶';}});
  window.CastwardPlay={snapshot:()=>({phase:world.phase,lure:{...world.lure},screenLure:scene.screen?scene.screen(world.lure):{...world.lure},target:{...world.target},boat:world.boat,wind:world.wind,run:world.run,jump:world.jump,bowed:world.bowed,tension:world.tension,progress:world.progress,clock:world.clock,redTime:world.redTime,headshake:world.headshake,specimen:world.specimen,drawCalls:scene.renderer?.info.render.calls,triangles:scene.renderer?.info.render.triangles,fish:world.fish.map(f=>({x:f.x,y:f.y,stage:f.stage,interest:f.interest,depth:f.depth})),combo:world.combo,renderer:view3D?'3d':'2d',camera:scene.cameraMode||'bank',fps:scene.fps,drawMs:scene.drawMs,resolution:scene.scale,depth:world.depth})};
  const bridge={idle,pause,log:()=>saved,restoreLog:value=>{saved=value;save();journal();},free:()=>{selectMode('free');selectWater('river');},equip:(effects,lure)=>{gear=effects;world.gear=gear;selectedLure=lure||'spoon';journal();},settings:value=>{manualReduced=value.motion;scene.setQuality?.(value.quality);draw();},mount:species=>{trophy=!!species;if(trophy)$('catch-celebration').hidden=true;scene.showTrophy?.(species);if(!view3D&&species){status.textContent=species.name+' · 3D mounts need WebGL.';}draw();},travel:(place,species,effects)=>{if(!idle())return;gear=effects;selectMode('free');selectWater(place.water,true);careerPlace=place;world.speciesPool=species;world.populate();day=place.light;$('game-time').value=day;weatherLabel();$('game-water-label').textContent=place.name.toUpperCase()+' / '+place.country.toUpperCase();draw();}};
  E.attach(bridge);
  const moduleURL=root.dataset.renderer;
  async function load3D(){
    let next;try{const {Scene3D}=await import(moduleURL);next=new Scene3D(canvas,()=>fallback());next.environment(water,careerPlace?.biome);next.syncFish(world);next.renderer.clippingPlanes=[next.reflectionPlane];await next.renderer.compileAsync(next.scene,next.camera);next.renderer.clippingPlanes=[];await next.renderer.compileAsync(next.scene,next.camera);next.renderer.render(next.scene,next.camera);next.renderer.getContext().finish();scene=next;view3D=true;scene.setQuality(E.settings().quality);if(state==='caught'&&fish)scene.showCatch(fish);root.dataset.rendererReady='3d';$('game-renderer').textContent='';scene.resize();draw();}
    catch{next?.dispose();fallback();}finally{$('game-loader').hidden=true;}
  }
  function fallback(){if(view3D){scene.dispose?.();scene=new A.Scene(canvas);view3D=false;scene.resize();draw();}root.dataset.rendererReady='2d';$('game-renderer').textContent='';$('game-loader').hidden=true;}
  requestAnimationFrame(load3D);
  setTimeout(()=>{$('game-loader').hidden=true;},6500);
  if(shared)selectMode('daily');
  weatherLabel();if(soundWanted)$('game-sound').textContent='♪ Sound on · tap to resume';action.disabled=false;$('game-pause').disabled=false;journal();reset();scene.resize();draw();schedule();
})();
