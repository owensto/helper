/* Real-time water simulation. Coordinates are fractions of the playable canvas. */
(function(scope){
  'use strict';
  const G=typeof module!=='undefined'&&module.exports?require('./game-engine.js'):scope.CastwardGame;
  const {clamp}=G, distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const spots=[{name:'Weed edge',x:.32,y:.66},{name:'Rock pool',x:.57,y:.58},{name:'Old dock',x:.76,y:.72}];
  function castGesture(start,back,end,velocity,wind=0){
    const load=clamp((back.y-start.y)*3.5,.15,1),speed=clamp(Math.hypot(velocity.x,velocity.y)/1.8,.15,1);
    return {x:clamp(.5+(end.x-back.x)*1.25+velocity.x*.1+wind*.7,.16,.87),y:clamp(.84-load*.12-speed*.22,.5,.82),power:(load+speed)/2};
  }
  function preference(s){
    const i=G.species.indexOf(s)%5;
    const deep=['perch','pike','sturgeon','tuna'].includes(s.shape),surface=['trout','salmon','slim'].includes(s.shape);
    return {weather:s.water==='river'?'rain':s.water==='ice'?'snow':'clear',depth:s.water==='offshore'?8:s.water==='reef'?6:deep?4:1.5,structure:deep?1:surface?0:2,light:s.id==='walleye'?'night':s.water==='flats'?'day':'dawn',lure:deep||s.water==='reef'?'jig':surface?'fly':'spinner',speed:[.038,.065,.028,.085,.055][i],twitch:[.45,.8,.3,.9,.65][i],name:['slow sweep','steady swim','pause & twitch','quick darts','sweep & pause'][i]};
  }
  class Water{
    constructor(water='river',rng=Math.random){this.water=water;this.rng=rng;this.clock=0;this.spot=1;this.boat=.5;this.destination=.5;this.wind=.018;this.drag=.5;this.rod=0;this.combo=0;this.popup='';this.popupTime=0;this.phase='ready';this.lure={x:.55,y:.66};this.target={...this.lure};this.trail=[];this.events=[];this.gear={};this.depth=1.5;this.populate();}
    populate(){const pool=(this.speciesPool||G.species.filter(s=>s.water===this.water).slice(0,5)).slice();if(this.castCount){const weights=pool.map(s=>s.rarity==='legendary'?.12:s.rarity==='rare'?.5:1),total=weights.reduce((a,b)=>a+b,0);let choice=this.rng()*total,index=0;while(index<weights.length-1&&choice>weights[index])choice-=weights[index++];pool.unshift(...pool.splice(index,1));}this.fish=pool.map((s,i)=>{const p=spots[i%3];return {species:s,x:i===0?.54:clamp(p.x+(i-2)*.045,.18,.85),y:i===0?.66:p.y+(i%2)*.055,home:{x:p.x,y:p.y},angle:0,interest:0,stage:'cruise',fear:0,depth:preference(s).depth,structure:preference(s).structure};});}
    moveSpot(index){if(this.phase!=='ready')return;this.spot=(index+3)%3;this.destination=[.27,.5,.74][this.spot];this.populate();this.fish.forEach(f=>{f.x=clamp(f.x+(this.spot-1)*.09,.18,.85);});this.say(spots[this.spot].name.toUpperCase());}
    say(text){this.popup=text;this.popupTime=2;}
    emit(type,x=this.lure.x,y=this.lure.y){this.events.push({type,x,y});}
    cast(target,{firstCast=false}={}){this.firstCast=firstCast;this.castCount=(this.castCount||0)+1;this.phase='flight';this.lure={x:this.boat,y:.88};this.origin={...this.lure};this.target={x:clamp(target.x,.16,.87),y:clamp(target.y,.5,.82)};this.depth=.1;this.flight=0;this.retrieveTime=0;this.still=0;this.speed=0;this.twitchPower=0;this.combo=0;this.twitchCount=0;this.trail=[];this.fish.forEach(f=>{f.interest=0;f.fear=0;f.stage='cruise';});}
    steer(x,y){this.target={x:clamp(x,.15,.88),y:clamp(y,.49,.86)};}
    twitch(){if(this.phase==='retrieve'){this.twitchCount=(this.twitchCount||0)+1;this.twitchPower=1;this.still=0;this.lure.y=clamp(this.lure.y-.009,.49,.86);this.emit('twitch');}}
    hook(){if(this.phase!=='bite')return false;this.phase='fight';this.specimen=G.specimen(this.hooked.species,this.rng,.5);this.profile=G.fightProfile(this.hooked.species,this.specimen.size);this.redTime=0;this.headshake=0;this.fightTime=0;this.tension=.32;this.progress=0;this.run=1;this.runTime=2.8;this.jump=0;this.nextJump=4;this.bowed=false;this.snag=0;this.slack=0;this.reelImpulse=0;this.combo++;this.say('HOOK SET  ×'+this.combo);this.emit('hook');return true;}
    reel(amount){if(this.phase==='fight')this.reelImpulse=clamp(this.reelImpulse+amount,0,1);}
    bow(){if(this.phase==='fight'&&this.jump>0&&!this.bowed){this.bowed=true;this.tension=clamp(this.tension-.22);this.progress=clamp(this.progress+.045);this.combo++;this.say('CLEAN BOW  ×'+this.combo);this.emit('bow');}}
    net(x,y){if(this.phase!=='net')return false;if(distance({x,y},this.lure)<.11){this.phase='landed';this.emit('landed');return true;}this.say('Bring the net to the fish');return false;}
    lose(reason){this.phase='lost';this.reason=reason;this.emit('lost');}
    step(dt,input={},conditions={}){
      dt=clamp(dt,0,.05);this.clock+=dt;const sink=conditions.lure==='jig'?1.3:conditions.lure==='fly'?.12:.45;this.depth+=Math.sign(Math.min(14,this.gear.depth||1.5)-this.depth)*Math.min(Math.abs(Math.min(14,this.gear.depth||1.5)-this.depth),dt*sink);this.popupTime=Math.max(0,this.popupTime-dt);this.wind=(conditions.weather==='rain'?.035:.018)*Math.sin(this.clock*.12+1);
      this.boat+=(this.destination-this.boat)*Math.min(1,dt*1.8);if(['lake','offshore','flats'].includes(this.water))this.boat+=Math.sin(this.clock*.4)*dt*.002;
      if(this.phase==='flight'){this.flight+=dt/.7;const t=clamp(this.flight),p=(1-Math.exp(-.3*t))/(1-Math.exp(-.3));this.lure={x:this.origin.x+(this.target.x-this.origin.x)*p,y:this.origin.y+(this.target.y-this.origin.y)*p};if(p>=1){this.phase='retrieve';this.emit('splash');this.say('MOVE THE LURE · TAP TO TWITCH');if(this.firstCast){const f=this.fish[0];f.x=this.lure.x-.025;f.y=this.lure.y;f.interest=.5;f.stage='follow';}}return;}
      if(this.phase==='retrieve'){
        this.retrieveTime+=dt;
        if(this.firstCast&&this.retrieveTime>=.35){const f=this.fish[0];f.x=this.lure.x;f.y=this.lure.y;f.interest=1;f.stage='commit';this.phase='bite';this.biteTime=0;this.hooked=f;this.emit('bite');this.say('BITE! SWIPE UP');return;}
this.twitchPower=Math.max(0,this.twitchPower-dt*1.4);
        const old={...this.lure};if(input.dx||input.dy){this.target.x=clamp(this.target.x+(input.dx||0)*dt*.18,.15,.88);this.target.y=clamp(this.target.y+(input.dy||0)*dt*.16,.49,.86);}
        const d=distance(this.lure,this.target),move=Math.min(d,dt*.19);if(d>.000001){this.lure.x+=(this.target.x-this.lure.x)/d*move;this.lure.y+=(this.target.y-this.lure.y)/d*move;}
        this.lure.x=clamp(this.lure.x+this.wind*dt*.11,.15,.88);
        this.speed+=(distance(old,this.lure)/Math.max(dt,.001)-this.speed)*Math.min(1,dt*8);
        this.still=this.speed<.008?this.still+dt:0;
        if(!this.trail.length||distance(this.lure,this.trail[this.trail.length-1])>.008){this.trail.push({...this.lure});if(this.trail.length>26)this.trail.shift();}
      }
      if(['ready','retrieve','bite'].includes(this.phase))for(const f of this.fish){
        const p=preference(f.species),d=distance(f,this.lure);f.fear=Math.max(0,f.fear-dt);
        const active=this.phase==='retrieve'&&d<.29&&f.fear===0;
        let tx=f.home.x+Math.sin(this.clock*.35+G.species.indexOf(f.species))*.07,ty=f.home.y+Math.cos(this.clock*.3)*.025,swim=.025;
        if(active){
          const motion=this.speed+this.twitchPower*.035;
          const match=clamp(1-Math.abs(motion-p.speed)/(p.speed+.035));
          const lureBoost=conditions.lure==='spinner'?1.2:conditions.lure==='fly'&&f.species.rarity!=='common'?1.25:1;
          const depthMatch=this.speciesPool?G.clamp(1-Math.abs(f.depth-this.depth)*.055,.55,1):1;const cover=this.speciesPool&&f.structure===this.spot?1.15:1;const speciesMatch=(conditions.day===p.light?1.15:1)*(conditions.lure===p.lure?1.2:1)*(conditions.weather===p.weather?1.12:1);const bite=depthMatch*cover*speciesMatch*(this.gear.attraction||1)*lureBoost*(conditions.day==='day'?.8:conditions.day==='night'?.9:1.2)*(conditions.weather==='rain'?1.18:1);
          if(this.speed>.145*(this.gear.stealth||1)||this.still>6){f.interest=Math.max(0,f.interest-dt*.55);f.fear=1.5;f.stage='spooked';}
          else{f.interest=clamp(f.interest+dt*((motion>.009?match*.33*bite:0)+(this.twitchPower*p.twitch*.13)-.025));f.stage=f.interest>.82?'commit':f.interest>.6?'nip':f.interest>.28?'follow':'curious';tx=this.lure.x;ty=this.lure.y;const leader=this.fish.reduce((a,b)=>a.interest>b.interest?a:b);if(f!==leader){tx+=(this.fish.indexOf(f)%2?1:-1)*.045;ty+=.025;}swim=f.stage==='commit'?.16:.05+f.interest*.055;
            if(f.interest>.93&&d<.045){this.phase='bite';this.biteTime=0;this.hooked=f;f.stage='commit';this.emit('bite');this.say('BITE! SWIPE UP');break;}}
        }else if(f.fear>0){f.stage='spooked';tx=f.home.x+(f.x<this.lure.x?-.12:.12);swim=.12;}else if(this.phase!=='bite'){f.stage='cruise';f.interest=Math.max(0,f.interest-dt*.1);}
        const a=Math.atan2(ty-f.y,tx-f.x),dist=Math.hypot(tx-f.x,ty-f.y);f.angle=a;f.x=clamp(f.x+Math.cos(a)*Math.min(dist,swim*dt),.14,.9);f.y=clamp(f.y+Math.sin(a)*Math.min(dist,swim*dt),.49,.85);
      }
      if(this.phase==='bite'){this.biteTime+=dt;if(this.biteTime>(this.firstCast?3.2:1.65))this.lose('The bite window closed. Swipe up when the float dips.');}
      if(this.phase==='fight'){
        this.fightTime+=dt;this.runTime-=dt;this.rod=clamp(input.rod??this.rod,-1,1);this.drag=clamp(input.drag??this.drag,.15,.85);
        if(this.runTime<=0){this.run*=-1;this.runTime=this.profile.run+this.rng()*1.6;this.say(this.run>0?'RUN RIGHT · ROD LEFT':'RUN LEFT · ROD RIGHT');}
        this.nextJump-=dt;if(this.nextJump<=0&&this.jump<=0&&(this.profile.jump||this.firstCast)){this.jump=1.3;this.bowed=false;this.nextJump=6+this.rng()*3;this.emit('jump');this.say('JUMP! TAP TO BOW');}
        if(this.jump>0){this.jump-=dt;if(this.jump<=0&&!this.bowed){this.tension=clamp(this.tension+.24);this.progress=clamp(this.progress-.06);this.combo=0;this.say('Bow next time · tap during a jump');}}
        const reel=input.held?1:this.reelImpulse||0;this.reelImpulse=Math.max(0,(this.reelImpulse||0)-dt*1.8);
        this.headshake=Math.sin(this.fightTime*2.1)>.91?Math.abs(Math.sin(this.fightTime*23)):0;
        const counter=Math.max(0,-this.rod*this.run),wrong=Math.max(0,this.rod*this.run),pull=.5+.5*Math.sin(this.fightTime*1.6);
        this.tension=clamp(this.tension+dt*(reel*(.26+this.drag*.25)*(this.gear.drag||1)/(this.gear.strength||1)+pull*.095*this.profile.force+this.headshake*.08+wrong*.16-counter*.12*(this.gear.control||1)-(1-reel)*(.22+(1-this.drag)*.2)));
        const sweet=this.tension>.2&&this.tension<.76;
        this.progress=clamp(this.progress+dt*(reel*(this.firstCast?1.45:1/this.profile.duration)*(this.gear.reel||1)*(sweet?.09:.035)*(1+counter*.55)*(.55+this.drag)-(reel<.1?.007:0)));
        this.lure.x=clamp(this.lure.x+dt*(this.run*.034+this.rod*.045),.2,.84);this.lure.y+=(.66+this.progress*.17-this.lure.y)*dt*1.8;
        this.hooked.x=this.lure.x;this.hooked.y=this.lure.y;this.hooked.angle=this.run>0?0:Math.PI;
        for(const f of this.fish)if(f!==this.hooked){f.stage='spooked';f.x+=(f.home.x-f.x)*dt;f.y+=(f.home.y-f.y)*dt;}
        this.snag=clamp(this.snag+dt*((this.lure.x<.24||this.lure.x>.8)? .28*(this.gear.snag||1):-.18));
        this.slack=this.tension<.06?this.slack+dt:0;
        this.redTime=this.tension>.9?this.redTime+dt:Math.max(0,this.redTime-dt*2);
        if(this.redTime>.65)this.lose('The line snapped. Ease the reel or lower the drag.');
        else if(this.snag>=1)this.lose('The fish reached a snag. Steer the rod toward open water.');
        else if(this.slack>3.5)this.lose('The hook came loose. Reel to keep some tension.');
        else if(this.progress>=1){this.phase='net';this.jump=0;this.netTime=0;this.say('WITHIN REACH · NET THE FISH');this.emit('net');}
      }
      if(this.phase==='net'){this.netTime+=dt;this.lure.x+=Math.sin(this.netTime*2)*dt*.014;this.lure.y=.82;}
    }
  }
  const api={Water,castGesture,preference,spots};if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.CastwardAction=api;
})(typeof globalThis!=='undefined'?globalThis:this);
