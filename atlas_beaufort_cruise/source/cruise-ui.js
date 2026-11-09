/* Explicit integration into the pinned standalone Waterfront14 candidate. */
(()=>{'use strict';let wait=null,stopped=false;const until=performance.now()+90000;
function start(){if(stopped)return;if(!window.SEA14?.ready){if(performance.now()<until)wait=setTimeout(start,150);return;}
 let disposed=false;const A=BAYPLAY,S=A.state,D=document,$=id=>D.getElementById(id),root=$('helm09'),owned=[],off=new AbortController();
 const local=()=>!stopped&&SEA14.inspect().multiplayer===false;
 function element(tag,text,cls){const n=D.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
 function button(text,fn){const n=element('button',text);n.type='button';n.onclick=()=>{if(local())fn();};return n;}
 function closeTools(){if(!$('helm09-panel').hidden)$('helm09-close').click();root.classList.toggle('s14-tools-open',false);root.classList.toggle('s11-panel-open',false);}
 const host={window,document,radio:ATLAS_RADIO,storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},isLocal:local,read:()=>S,paused:()=>A.inspect().paused,dispatch:(k,v)=>SEA09.bus.dispatch(k,v),closePanel:closeTools,panel:k=>SEA09.openPanel(k),setInterval:(f,t)=>setInterval(f,t),clearInterval:t=>clearInterval(t),stopOtherMusic:()=>{SEA09.closeYouTube();ATLAS_RADIO.pause();}};
 const music=AtlasMotorMusic.install(host);host.closeProviders=()=>{music.close();SEA09.closeYouTube();};host.providersActive=()=>!!music.inspect().queue||!!SEA09.inspect().externalVisible;
 const audio=AtlasCruiseAudio.install(host);let optics=null;
 try{optics=AtlasWaterRefinements.installMaterial(A.coast.water.material);}catch(e){console.error('Cruise water optics not installed:',e.message);}
 root.classList.add('beaufort-cruise');D.title='ATLAS · Beaufort Cruise Preview';root.querySelector('.h09-brand').innerHTML='ATLAS<span>BEAUFORT CRUISE · PREVIEW</span>';
 const status=element('div','Loading Beaufort scenery…','bc-stream-status');status.id='bc-stream-status';root.append(status);owned.push(status);
 let stopIndex=-1;const card=element('section','','bc-voyage');card.id='bc-voyage';card.hidden=true;card.setAttribute('aria-label','Beaufort sightseeing objective');
 const title=element('strong'),info=element('span'),hint=element('small'),next=button('Next stop',()=>choose(stopIndex+1)),end=button('End trip',()=>{stopIndex=-1;card.hidden=true;});card.append(title,info,hint,next,end);root.append(card);owned.push(card);
 function choose(i){if(i>=AtlasBeaufortTrip.stops.length){stopIndex=-1;card.hidden=true;SEA09.openPanel('bc-finished');return;}
  const p=AtlasBeaufortTrip.stops[i],q=Sea09World.sample(p.x,p.z,'beaufort');if(!q.known||q.land||!Number.isFinite(q.depth)||q.depth+(S.config.tide||0)<1.2){status.textContent='This stop lacks sufficient known depth. Stay in control and choose another.';return;}
  stopIndex=i;CMD_INSTRUMENTS.waypoint={location:'beaufort',x:p.x,z:p.z};closeTools();if(!$('helm09-mapcard').hidden)SEA09.toggleMap();card.hidden=false;update();}
 const prior=SEA10.renderPanel;
 function panel(kind,body){if(kind==='bc-finished'){$('helm09-title').textContent='Beaufort cruise complete';body.replaceChildren(element('p','You visited the marina waterfront, Waterfront Park and Woods Bridge. Keep exploring or open More to return to launch. Returning requires confirmation; the boat does not move automatically.'),button('Keep exploring',closeTools));return true;}
  const result=prior.call(this,kind,body);
  if(kind==='radio'){
   const box=element('section','','bc-playlists');box.append(element('h3','Country on the water'),element('p','Choose a built-in queue, press Play in YouTube, then Drive with music. Your own audio files can use Boat Speakers or Computer Speakers.'));
   for(const q of music.presets){const group=element('div','','bc-music-card');group.append(element('strong',q.name),element('small',q.description),button('Load '+q.name,()=>music.openQueue(q.id)));const tracks=element('details'),sum=element('summary','Choose a song');tracks.append(sum);q.tracks.forEach((t,i)=>tracks.append(button(t.title+' — '+t.artist,()=>music.openQueue(q.id,i))));group.append(tracks);box.append(group);}
   body.prepend(box);
  }
  if(kind==='more14'){const grid=body.querySelector('.s14-cards');if(grid){const trip=button('Start Beaufort cruise',()=>choose(0));trip.id='bc-start-cruise';const fittings=button('Explore boat fittings',()=>SEA09.openPanel('boat'));grid.prepend(trip);grid.append(fittings,button('Retry missing scenery',()=>window.ATLAS_CRUISE_STREAM?.retry()));}body.append(element('p','Preview: scenery streams within the prepared Beaufort region. Mapped footprints, illustrative architectural detail. Music, trim and weather remain manual.','bc-small'));}
  return result;
 }
 SEA10.renderPanel=panel;
 function update(){if(stopped||D.hidden)return;const q=window.ATLAS_CRUISE_STREAM?.inspect(),m=q?.stream;status.textContent=m?'PREVIEW · Beaufort · '+m.ready+' detail sections ready'+(m.pending?' · loading ahead':'')+(m.failedTiles?' · some detail unavailable':''):'Beaufort foundation loading…';
  if(stopIndex>=0){const o=AtlasBeaufortTrip.observe(stopIndex,S,Sea09World.sample(S.x,S.z,'beaufort'));card.hidden=false;title.textContent=o.goal?.name||'Beaufort cruise';info.textContent=o.available?Math.round(o.distance)+' m · '+o.knots.toFixed(1)+' kn':'';hint.textContent=o.text;next.hidden=!o.arrived;next.textContent=stopIndex===2?'Finish cruise':'Next stop';}
 }
 const timer=setInterval(update,250);update();
 window.ATLAS_BEAUFORT_CRUISE={ready:true,version:1,music,audio,inspect:()=>({version:1,ready:true,base:'Waterfront14-R3',stop:stopIndex,stream:window.ATLAS_CRUISE_STREAM?.inspect(),water:optics?.inspect(),physics:Sea14Physics.inspect(),music:music.inspect(),audio:audio.inspect(),multiplayer:false,browserVerified:false}),dispose(){if(disposed)return;disposed=true;stopped=true;clearInterval(timer);off.abort();if(SEA10.renderPanel===panel)SEA10.renderPanel=prior;music.dispose();audio.dispose();optics?.dispose();owned.forEach(n=>n.remove());root.classList.remove('beaufort-cruise');}};
 addEventListener('pagehide',()=>window.ATLAS_BEAUFORT_CRUISE.dispose(),{once:true});
}
addEventListener('pagehide',()=>{stopped=true;clearTimeout(wait);},{once:true});start();})();
