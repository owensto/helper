/* Career rules are shared by the browser and Node tests. No DOM or storage here. */
(function(scope){
 'use strict';
 const G=typeof module!=='undefined'&&module.exports?require('./game-engine.js'):scope.CastwardGame;
 const gear=[
  {id:'spinner',slot:'lure',name:'Silver spinner',cost:120,effect:'A faster response to a steady retrieve.',guide:'fishing-gear-you-already-own',stats:{attraction:1.2}},
  {id:'fly',slot:'lure',name:'Dusk fly',cost:180,effect:'A quiet surface lure. Rare fish respond sooner.',guide:'first-five-flies-to-tie',stats:{attraction:1.25,depth:.4}},
  {id:'jig',slot:'lure',name:'Deepwater jig',cost:180,effect:'Reaches deep fish and bottom structure.',guide:'first-offshore-fishing-charter-checklist',stats:{depth:8,attraction:1.15}},
  {id:'rod',slot:'rod',name:'Reach / 240',cost:220,effect:'20% more cast distance. More control on a run.',guide:'fishing-gear-quality-tiers',stats:{cast:1.2,control:1.12}},
  {id:'line',slot:'line',name:'Rockguard braid',cost:160,effect:'30% less snag damage. A stronger line.',guide:'fishing-gear-you-already-own',stats:{snag:.7,strength:1.15}},
  {id:'reel',slot:'reel',name:'Current / 3000',cost:240,effect:'Smoother drag. 18% more line per turn.',guide:'fishing-gear-quality-tiers',stats:{reel:1.18,drag:.88}},
  {id:'waders',slot:'waders',name:'Quietstep waders',cost:140,effect:'Fish tolerate a faster lure near the bank.',guide:'fishing-waders-buying-guide',stats:{stealth:1.2}},
  {id:'kayak',slot:'boat',name:'Drift kayak',cost:280,effect:'Quiet approach and sonar on boat waters.',guide:'inshore-vs-offshore-fishing-charter',stats:{stealth:1.3,cast:1.1,sonar:1}},
  {id:'boat',slot:'boat',name:'Sounder skiff',cost:420,effect:'Sonar, longer casts, and 4 m of extra depth.',guide:'first-offshore-fishing-charter-checklist',stats:{cast:1.25,depth:4,sonar:1}}
 ];
 const aliases={'bonefish-group':'bonefish','permit-group':'permit','tarpon-group':'atlantic-tarpon','snook':'common-snook','brook-trout-group':'brook-trout','lake-trout-group':'lake-trout','giant-trevally-group':'giant-trevally'};
 const level=s=>Math.min(30,1+Math.floor(s.xp/180));
 const natural=(n,max=10000000)=>Number.isSafeInteger(n)&&n>=0?Math.min(n,max):0;
 const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d));
 function restore(raw,places=[]){
  const d=raw&&typeof raw==='object'?raw:{};
  const owned=Array.isArray(d.owned)?[...new Set(d.owned.filter(id=>gear.some(g=>g.id===id)))]:[];
  const equipped={};for(const g of gear)if(d.equipped?.[g.slot]===g.id&&owned.includes(g.id))equipped[g.slot]=g.id;
  const permits=Array.isArray(d.permits)?[...new Set(d.permits.filter(id=>places.some(p=>p.licence===id)))]:[];
  const objectives={};for(const p of places){const o=d.objectives?.[p.id];if(Array.isArray(o))objectives[p.id]=[0,1,2].map(i=>o[i]===true);}
  const records={};for(const s of G.species){const c=d.records?.[s.id];if(G.validCatch(c)&&c.id===s.id&&c.length>=s.min&&c.length<=s.max)records[s.id]={id:s.id,species:s.name,length:c.length,weight:c.weight,water:c.water};}
  const place=places.find(p=>p.id===d.place&&permits.includes(p.licence)&&p.level<=1+Math.floor(natural(d.xp)/180));
  return {version:2,xp:natural(d.xp),coins:d.coins===undefined?300:natural(d.coins),owned,equipped,permits,objectives,records,place:place?.id||null,total:natural(d.total),firstCastUsed:d.firstCastUsed===true||natural(d.total)>0,streak:natural(d.streak,3650),lastDay:validDay(d.lastDay)?d.lastDay:null,tutorial:d.tutorial===true,achievements:Array.isArray(d.achievements)?d.achievements.filter(x=>['first','traveller','collector','trophy','master'].includes(x)):[],daily:validDay(d.daily?.date)?{date:d.daily.date,count:natural(d.daily.count,3)}:{date:'',count:0},settings:{quality:['auto','low','medium','high'].includes(d.settings?.quality)?d.settings.quality:'auto',motion:d.settings?.motion===true}};
 }
 function targets(p){return p.speciesIds.map(id=>G.species.find(s=>s.id===(aliases[id]||id))).filter(Boolean);}
 function effects(s){const result={cast:1,control:1,strength:1,snag:1,reel:1,drag:1,stealth:1,depth:1.5,attraction:1,sonar:0};for(const g of gear.filter(g=>s.equipped[g.slot]===g.id)){if(g)for(const [k,v]of Object.entries(g.stats))result[k]=k==='depth'?(g.slot==='boat'?result[k]+v:v):k==='sonar'?v:result[k]*v;}return result;}
 function buy(s,id){const g=gear.find(g=>g.id===id);if(!g)return false;if(!s.owned.includes(id)){if(s.coins<g.cost)return false;s.coins-=g.cost;s.owned.push(id);}s.equipped[g.slot]=id;return true;}
 function travel(s,p){if(level(s)<p.level)return false;if(!s.permits.includes(p.licence)){if(s.coins<p.permit.coins)return false;s.coins-=p.permit.coins;s.permits.push(p.licence);}s.place=p.id;return true;}
 function visit(s,date){if(s.lastDay===date)return false;const yesterday=new Date(Date.parse(date)-86400000).toISOString().slice(0,10);s.streak=s.lastDay===yesterday?s.streak+1:1;s.lastDay=date;s.coins+=Math.min(70,20+s.streak*5);return true;}
 function land(s,p,entry,technique,date,challenge=false){
  const species=G.species.find(f=>f.id===entry.id);if(!species||!G.validCatch(entry))return {xp:0,coins:0};
  let xp=70,coins=70;s.total++;
  if(!s.records[entry.id]||entry.length>s.records[entry.id].length)s.records[entry.id]=entry;
  const trophy=entry.length>=Math.round(species.min+(species.max-species.min)*.7);
  if(p&&targets(p).some(f=>f.id===entry.id)){
   const o=s.objectives[p.id]||[false,false,false],done=[entry.id===targets(p)[0].id,trophy,technique];
   done.forEach((v,i)=>{if(v&&!o[i]){o[i]=true;xp+=60;coins+=55;}});s.objectives[p.id]=o;
  }
  if(challenge){if(s.daily.date!==date)s.daily={date,count:0};if(s.daily.count<3){s.daily.count++;if(s.daily.count===3){xp+=120;coins+=180;}}}
  const awards={first:s.total>=1,traveller:s.permits.length>=3,collector:Object.keys(s.records).length>=5,trophy,master:Object.values(s.objectives).filter(o=>o.every(Boolean)).length>=3};
  for(const [id,ok]of Object.entries(awards))if(ok&&!s.achievements.includes(id)){s.achievements.push(id);coins+=40;}
  s.xp+=xp;s.coins+=coins;return {xp,coins,trophy};
 }
 function firstCast(s){if(s.firstCastUsed)return false;s.firstCastUsed=true;return true;}
 function nextGoal(s,p){
  if(!s.total)return {text:'Land your first fish',action:'cast'};
  if(!p)return {text:'Choose your first expedition on the world map',action:'map'};
  const done=s.objectives[p.id]||[];
  if(!done[0])return {text:'Catch '+targets(p)[0].name+' at '+p.name,action:'cast'};
  if(!done[2])return {text:'Land a fish after 3 twitches or a clean jump bow',action:'cast'};
  if(!done[1])return {text:'Land a trophy at '+p.name,action:'cast'};
  return {text:'Choose a new water. Level '+level(s)+' is yours.',action:'map'};
 }
 function weekly(date,places){const week=Math.floor((Date.parse(date)-345600000)/604800000);return places[G.seed('week-'+week)%places.length];}
 const api={gear,level,firstCast,nextGoal,restore,targets,effects,buy,travel,visit,land,weekly};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.CastwardCareer=api;
})(typeof globalThis!=='undefined'?globalThis:this);
