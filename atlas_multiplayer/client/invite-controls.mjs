// Static markup only; all names/status/data are inserted with textContent or value.
const FRIENDLY={ROOM_FULL:'This room is full.',ROOM_UNAVAILABLE:'This invitation has expired or the room is unavailable.',
  WORLD_MISMATCH:'This room uses a different world version.',INVITE_WORLD_MISMATCH:'This invitation uses a different world version.',
  INVITE_ORIGIN_MISMATCH:'Use an invitation from this same workshop.',BAD_INVITE:'Paste a valid invitation link.',
  CONNECTION_FAILED:'Could not connect. Single-player is still available.',SESSION_EXPIRED:'Your room session expired. Join again.',
  HOST_RESTORE_REFUSED:'The simulator could not safely restore this boat.',VESSEL_SWITCH_REQUIRES_REJOIN:'Leave the room before changing vessel.',
  BAD_NAME_OR_VESSEL:'Use a guest name of 1–24 characters.',STALE_WORLD_REVISION:'The world changed. Rejoin a matching room.',HOST_CLOCK_REGRESSION:'The local simulation changed unexpectedly. Rejoin the room.',CORE_RECOVERY_REQUIRED:'Recover the boat in the simulator before rejoining.'};
/** Pure presentation policy; DOM/visual acceptance is a separate browser gate. */
export function controlState(info) {
  const cleanup=info.cleanupIncomplete===true;
  const busy=['connecting','joining','connected','reconnecting'].includes(info.state);
  const connected=info.state==='connected'&&!cleanup;
  return {
    statusMessage:cleanup?'Offline — simulator cleanup incomplete':connected?
      `Connected · ${info.players} boat${info.players===1?'':'s'}${info.rttMs===null?'':` · ${info.rttMs} ms`}`:
      ({idle:'Single-player',connecting:'Connecting…',joining:'Preparing boat…',reconnecting:'Connection lost — reconnecting…',error:'Offline — single-player available'}[info.state]||'Offline'),
    errorMessage:cleanup?'Multiplayer stopped, but some remote visuals or session state could not be cleared. Reload the workshop before rejoining.':
      info.error&&info.state==='error'?(FRIENDLY[info.error]||'Room unavailable. Leave or try again.'):'',
    joinDisabled:busy||cleanup,leaveDisabled:!busy,copyDisabled:!connected
  };
}
export function mountInviteControls({adapter,parent=document.body,fixture=false,baseUrl=location.href}) {
  if(adapter.info.state==='disabled')return {dispose:()=>{}};
  const root=document.createElement('section');root.dataset.atlasMp='';root.setAttribute('aria-label','Multiplayer');
  root.innerHTML=`<details open><summary>Co-op rooms</summary>
    <p class="mp-scope"></p><p class="mp-status" role="status" aria-live="polite"></p>
    <label>Guest name<input class="mp-name" autocomplete="off" maxlength="48" value="Skipper"></label>
    <div class="mp-actions"><button class="mp-create" type="button">Create room</button><button class="mp-leave" type="button" disabled>Leave room</button></div>
    <label>Invitation link<input class="mp-join-link" data-private autocomplete="off" maxlength="2048" placeholder="Paste an invitation"></label>
    <button class="mp-join" type="button">Join room</button>
    <label>Your room invitation<input class="mp-share" data-private readonly aria-label="Your room invitation"></label>
    <button class="mp-copy" type="button" disabled>Copy invitation</button><p class="mp-copy-hint"></p>
    <p class="mp-error" role="alert"></p><ul class="mp-roster" aria-label="Room members"></ul>
  </details>`;
  const $=s=>root.querySelector(s);$('.mp-scope').textContent=fixture?'Network test fixture — not the live simulator.':'Private cooperative boats. No shared collision physics.';
  parent.append(root);
  const update=info=>{
    const view=controlState(info);
    $('.mp-status').textContent=view.statusMessage;
    $('.mp-create').disabled=view.joinDisabled;$('.mp-join').disabled=view.joinDisabled;$('.mp-name').disabled=view.joinDisabled;
    $('.mp-leave').disabled=view.leaveDisabled;$('.mp-copy').disabled=view.copyDisabled;
    if(!view.copyDisabled){
      const link=adapter.invite();if($('.mp-share').value!==link)$('.mp-share').value=link;
    }else { $('.mp-share').value='';if(['idle','error'].includes(info.state))$('.mp-roster').replaceChildren(); }
    $('.mp-error').textContent=view.errorMessage;
  };
  const run=async fn=>{ $('.mp-error').textContent='';try{await fn();}catch(e){if(e.code!=='CANCELLED')$('.mp-error').textContent=FRIENDLY[e.code||e.message]||'Could not join this room.';} };
  $('.mp-create').onclick=()=>run(()=>adapter.create($('.mp-name').value));
  $('.mp-join').onclick=()=>run(async()=>{
    await adapter.join($('.mp-name').value,$('.mp-join-link').value);
    // Only remove this component's invitation fragment; never clear unrelated CORE state.
    if(new URLSearchParams(location.hash.slice(1)).has('room'))history.replaceState(history.state,'',location.pathname+location.search);
  });
  $('.mp-leave').onclick=()=>{adapter.leave();$('.mp-roster').replaceChildren();update(adapter.info);};
  $('.mp-copy').onclick=async()=>{
    try{await navigator.clipboard.writeText(adapter.invite());$('.mp-copy-hint').textContent='Invitation copied.';}
    catch{$('.mp-share').focus();$('.mp-share').select();$('.mp-copy-hint').textContent='Copy the selected invitation.';}
  };
  root.addEventListener('keydown',e=>e.stopPropagation());
  const offStatus=adapter.subscribe('status',update);
  const offRoster=adapter.subscribe('snapshot',snapshot=>{
    $('.mp-roster').replaceChildren(...snapshot.players.map(p=>{
      const li=document.createElement('li');li.textContent=p.name+(p.id===snapshot.selfId?' (you)':'')+(p.connected?'':' — disconnected');return li;
    }));
  });
  if(new URLSearchParams(new URL(baseUrl).hash.slice(1)).has('room'))$('.mp-join-link').value=baseUrl;
  update(adapter.info);
  return {element:root,dispose:()=>{offStatus();offRoster();root.remove();}};
}
