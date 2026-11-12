/* Shared, deterministic game rules. No network, account, or server score. */
(function(scope){
  'use strict';
  const waters={
    reef:{name:'Reef',subtitle:'THE REEF / CORAL GARDENS',route:'reef-bottom',sky:['#7cbcbc','#f2dfb6'],water:['#49b8aa','#175669']},
    river:{name:'River',subtitle:'THE RIVER / CEDAR REACH',route:'rivers-streams',sky:['#719b9c','#edcf9b'],water:['#6b9e8a','#183e38']},
    lake:{name:'Lake',subtitle:'THE LAKE / PINE HOLLOW',route:'lakes-reservoirs',sky:['#769ca8','#ead7b2'],water:['#6b9f9e','#244b57']},
    ice:{name:'Ice edge',subtitle:'THE ICE / NORTH WINDOW',route:'ice-fishing',sky:['#849fad','#e2e9de'],water:['#a2c2c7','#27485d']},
    flats:{name:'Flats',subtitle:'THE FLATS / TURTLE KEY',route:'saltwater-flats',sky:['#7bb9c0','#f3e5bd'],water:['#80c9b4','#257f7a']},
    offshore:{name:'Offshore',subtitle:'OFFSHORE / THE BLUE MILE',route:'offshore',sky:['#7c9cb6','#ecc7a4'],water:['#4d91ad','#173853']}
  };
  // id, name, water, rarity, length range (cm), game weight coefficient, illustration color, shape.
  const rows=[
    ['snapper','Snapper','reef','common',25,85,.000018,'#d78567','bass'],
    ['grouper','Grouper','reef','rare',35,120,.000024,'#a99570','bass'],
    ['barracuda','Barracuda','reef','legendary',60,150,.000005,'#a2c1c6','pike'],
    ['peacock-bass','Peacock bass','river','rare',25,85,.000023,'#b7a844','bass'],
    ['tigerfish','Tigerfish','river','rare',30,100,.000013,'#b3c5b8','salmon'],
    ['taimen','Taimen','river','legendary',65,160,.000009,'#ab7763','salmon'],
    ['giant-trevally','Giant trevally','flats','legendary',45,145,.000025,'#9db3b3','round'],
    ['barramundi','Barramundi','flats','rare',40,130,.000013,'#b7c2a0','bass'],
    ['black-marlin','Black marlin','offshore','legendary',170,380,.000006,'#6e899e','billfish'],
    ['rainbow-trout','Rainbow trout','river','common',25,62,.000012,'#8fae9b','trout'],
    ['brown-trout','Brown trout','river','common',28,70,.000012,'#b49b55','trout'],
    ['brook-trout','Brook trout','river','rare',20,49,.000012,'#648773','trout'],
    ['arctic-grayling','Arctic grayling','river','rare',28,55,.000009,'#8a9eaa','grayling'],
    ['atlantic-salmon','Atlantic salmon','river','legendary',65,115,.00001,'#b7c4ba','salmon'],
    ['largemouth-bass','Largemouth bass','lake','common',22,65,.000012,'#78905a','bass'],
    ['yellow-perch','Yellow perch','lake','common',16,34,.000012,'#b9a554','perch'],
    ['smallmouth-bass','Smallmouth bass','lake','rare',24,54,.000019,'#9a8c56','bass'],
    ['northern-pike','Northern pike','lake','rare',45,105,.000006,'#86956b','pike'],
    ['muskellunge','Muskellunge','lake','legendary',80,145,.000006,'#a3a47d','pike'],
    ['walleye','Walleye','ice','common',28,68,.000009,'#a89d66','perch'],
    ['burbot','Burbot','ice','common',30,72,.000008,'#8b825c','pike'],
    ['lake-trout','Lake trout','ice','rare',35,85,.000011,'#96a58f','trout'],
    ['arctic-char','Arctic char','ice','rare',30,75,.000011,'#b88671','trout'],
    ['lake-sturgeon','Lake sturgeon','ice','legendary',90,180,.000005,'#899b9b','sturgeon'],
    ['bonefish','Bonefish','flats','common',35,76,.000009,'#b8c8ba','slim'],
    ['red-drum','Redfish','flats','common',35,85,.000013,'#b48c61','bass'],
    ['common-snook','Snook','flats','rare',40,100,.000009,'#adb89b','slim'],
    ['permit','Permit','flats','rare',35,85,.000025,'#a4b8ad','round'],
    ['atlantic-tarpon','Tarpon','flats','legendary',90,180,.00001,'#c1c7b1','salmon'],
    ['mahi-mahi','Mahi-mahi','offshore','common',55,125,.000005,'#96b84f','mahi'],
    ['yellowfin-tuna','Yellowfin tuna','offshore','common',60,135,.000018,'#83a5a9','tuna'],
    ['wahoo','Wahoo','offshore','rare',65,145,.0000045,'#91afc0','pike'],
    ['sailfish','Sailfish','offshore','rare',120,230,.000004,'#799cb2','sail'],
    ['blue-marlin','Blue marlin','offshore','legendary',180,340,.000006,'#7f9bae','billfish']
  ];
  rows.push(...rows.splice(0,9));
  // Species facts are display data, resolved from the canonical ID; saves retain IDs and sizes.
  const facts={
  "rainbow-trout": "Rainbow trout feed on aquatic insects and small fish.",
  "brown-trout": "Brown trout use undercut banks and submerged wood for cover.",
  "brook-trout": "Brook trout live in cold, well-oxygenated streams and lakes.",
  "arctic-grayling": "Arctic grayling often feed on insects at the water surface.",
  "atlantic-salmon": "Atlantic salmon return to freshwater rivers to spawn.",
  "largemouth-bass": "Largemouth bass ambush prey near plants and submerged cover.",
  "yellow-perch": "Yellow perch often form schools in lakes.",
  "smallmouth-bass": "Smallmouth bass feed on crayfish and small fish.",
  "northern-pike": "Northern pike ambush prey from aquatic plants.",
  "muskellunge": "Adult muskellunge feed mainly on other fish.",
  "walleye": "Walleye often feed in low light.",
  "burbot": "Burbot spawn in winter beneath the ice.",
  "lake-trout": "Lake trout seek deep, cold water in summer.",
  "arctic-char": "Arctic char live in cold Arctic and subarctic waters.",
  "lake-sturgeon": "Lake sturgeon use barbels to find food on the bottom.",
  "bonefish": "Bonefish search shallow flats for crabs, shrimp, and other prey.",
  "red-drum": "Redfish feed on crabs, shrimp, and small fish.",
  "common-snook": "Snook use mangrove edges and tidal creeks for cover.",
  "permit": "Permit feed on crabs and other hard-shelled prey.",
  "atlantic-tarpon": "Tarpon can gulp air at the surface.",
  "mahi-mahi": "Mahi-mahi often gather near floating seaweed and debris.",
  "yellowfin-tuna": "Yellowfin tuna feed on fish, squid, and crustaceans.",
  "wahoo": "Wahoo hunt small fish in warm offshore water.",
  "sailfish": "Sailfish use their bills to strike schooling fish.",
  "blue-marlin": "Blue marlin hunt fish and squid in the open ocean.",
  "snapper": "Snappers feed on small fish and crustaceans.",
  "grouper": "Groupers use reefs and rocky ledges as cover.",
  "barracuda": "Barracuda ambush smaller fish near reefs and seagrass.",
  "peacock-bass": "Peacock bass hunt smaller fish in tropical fresh water.",
  "tigerfish": "Tigerfish hunt other fish in African rivers and lakes.",
  "taimen": "Taimen live in cold rivers across northern Asia.",
  "giant-trevally": "Giant trevally hunt fish around tropical reefs.",
  "barramundi": "Barramundi use rivers, estuaries, and coastal waters.",
  "black-marlin": "Black marlin hunt fish and squid in tropical seas."
};
  const species=rows.map(([id,name,water,rarity,min,max,k,color,shape])=>({id,name,water,rarity,min,max,k,color,shape,fact:facts[id]}));
  const lures=[{id:'spoon',name:'Copper spoon',need:0,detail:'Let it sink, then use a steady retrieve.',color:'#bb8252'}, {id:'spinner',name:'Silver spinner',need:3,detail:'A steady flash for active fish.',color:'#b8c7bf'}, {id:'fly',name:'Streamer fly',need:8,detail:'Small strips near the surface.',color:'#d1b15b'}];
  lures.push({id:'jig',name:'Metal jig',need:5,detail:'Let it sink. Lift, pause, then lift again.',color:'#8baba4'});
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  function seed(text){let n=2166136261;for(const c of text){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
  function random(n){return()=>{n|=0;n=n+0x6D2B79F5|0;let t=Math.imul(n^n>>>15,1|n);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function daily(date){const n=seed(date),water=Object.keys(waters)[n%Object.keys(waters).length];return{date,water,target:3,seed:n};}
  function choose(water,quality,lure,rng=Math.random){const roll=rng(), bonus=quality*.05+(lure==='fly'?.06:0);const tier=roll>.97-bonus?'legendary':roll>.65-bonus?'rare':'common';const pool=species.filter(s=>s.water===water&&s.rarity===tier);return pool[Math.floor(rng()*pool.length)];}
  function points(rarity,quality,streak){return Math.round(({common:100,rare:250,legendary:600}[rarity]+quality*100)*Math.min(3,1+(streak-1)*.25));}
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  function validCatch(c){return c&&typeof c.species==='string'&&c.species.length<80&&typeof c.water==='string'&&finite(c.length)&&c.length>0&&c.length<1000&&finite(c.weight)&&c.weight>0&&c.weight<5000;}
  function restore(saved){const empty={log:[],best:null,total:0,collected:{},scores:[],daily:{},slam:{date:'',ids:[]}};if(!saved||typeof saved!=='object')return empty;const log=Array.isArray(saved.log)?saved.log.filter(validCatch).slice(0,12):[];const collected={};for(const s of species){const v=saved.collected?.[s.id];if(validCatch(v))collected[s.id]=v;}for(const c of log){const s=species.find(s=>s.name===c.species);if(s&&!collected[s.id])collected[s.id]=c;}const days={};if(saved.daily&&typeof saved.daily==='object')for(const [k,v]of Object.entries(saved.daily).slice(-14))if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isInteger(v)&&v>=0)days[k]=Math.min(3,v);const slam={date:/^\d{4}-\d{2}-\d{2}$/.test(saved.slam?.date)?saved.slam.date:'',ids:Array.isArray(saved.slam?.ids)?[...new Set(saved.slam.ids.filter(id=>species.some(s=>s.id===id)))]:[]};return{slam,log,best:validCatch(saved.best)?saved.best:null,total:Number.isInteger(saved.total)&&saved.total>=0?Math.min(saved.total,1000000):log.length,collected,scores:Array.isArray(saved.scores)?saved.scores.filter(s=>s&&finite(s.score)&&s.score>=0&&s.score<1000000&&typeof s.date==='string').sort((a,b)=>b.score-a.score).slice(0,5):[],daily:days};}
  // Cubic condition-factor estimates in kg/cm. These are game estimates, not weigh-ins.
  function weightAt(s,length){if(s.id==='largemouth-bass'){const lbs=[.48,.66,.87,1.14,1.45,1.82,2.25,2.74,3.31,3.95,4.68,5.49,6.4,7.41,8.52,9.75,11.09],inch=clamp(length/2.54,10,26),i=Math.min(15,Math.floor(inch)-10);return (lbs[i]+(lbs[i+1]-lbs[i])*(inch-10-i))*.453592;}return length**3*s.k;}
  function specimen(s,rng=Math.random,quality=0){const u=clamp(Math.pow(rng(),1.65)*.85+quality*.15),length=Math.round(s.min+(s.max-s.min)*u);return {length,weight:Math.max(.01,Math.round(weightAt(s,length)*(.94+rng()*.12)*100)/100),size:u};}
  function fightProfile(s,size=.5){const jumper=['trout','salmon','billfish','sail','mahi'].includes(s.shape);return {duration:(s.rarity==='legendary'?1.6:s.rarity==='rare'?1.25:1)*(1+size*.6),run:s.id==='atlantic-tarpon'?4.8:s.shape==='salmon'?4.2:s.shape==='tuna'?5:2.8,jump:jumper,force:s.shape==='tuna'||s.shape==='sturgeon'?1.35:1+size*.2};}
  const slams=[{id:'flats-slam',name:'Flats grand slam',ids:['bonefish','permit','atlantic-tarpon'],path:'/fishing-lingo/#florida-keys'}];
  const api={weightAt,specimen,fightProfile,slams,waters,species,lures,clamp,seed,random,daily,choose,points,restore,validCatch};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.CastwardGame=api;
})(typeof globalThis!=='undefined'?globalThis:this);
