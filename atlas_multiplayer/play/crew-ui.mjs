import {DESTINATIONS,destinationOf} from './crew-plan.mjs';
/** UI view model; all names use textContent, not markup. */
export function crewView(info){
  const roster=info.roster||[],self=roster.find(p=>p.self),host=!!self?.host;
  const active=['hosting','connected'].includes(info.state),destination=destinationOf(info.plan?.destination);
  const ready=roster.filter(p=>p.ready&&p.connected&&p.visible).length;
  return {active,host,ready,total:roster.length,selfReady:self?.ready===true,destination,
    canDepart:active&&host&&!!destination&&roster.length>=2&&ready===roster.length&&info.plan?.departAt===null,
    canCancel:active&&host&&info.plan?.departAt!==null&&info.plan?.departAt!==undefined};
}
export function fillDestinations(doc,root){
  const nodes=DESTINATIONS.map(d=>{const o=doc.createElement('option');o.value=d.id;o.textContent=d.name;return o;});root.replaceChildren(...nodes);
}
export function fillCrewTargets(doc,root,roster){
  const previous=root.value,first=doc.createElement('option');first.value='rally';first.textContent='Shared destination';
  const options=[first,...roster.filter(p=>!p.self).sort((a,b)=>a.slot-b.slot).map(p=>{const o=doc.createElement('option');o.value=String(p.slot);o.textContent=`${p.slot+1} · ${p.name}${p.connected?'':' (reconnecting)'}`;return o;})];
  root.replaceChildren(...options);root.value=options.some(o=>o.value===previous)?previous:'rally';
}
export function renderCrewPlan(doc,info){
  const $=id=>doc.getElementById(id),view=crewView(info);
  $('crewPlan').hidden=!view.active;$('hostPlan').hidden=!view.host;
  $('readyCrew').disabled=!view.active||!view.destination;
  $('readyCrew').textContent=view.selfReady?'Ready ✓ · undo':'I’m ready';$('readyCrew').setAttribute('aria-pressed',String(view.selfReady));
  $('departCrew').disabled=!view.canDepart;$('cancelCruise').disabled=!view.canCancel;
  $('readyCount').textContent=`${view.ready} / ${view.total} ready`;
  $('crewNotice').textContent=info.controlNotice||(!view.destination?'The host chooses the shared destination.':'Advisory countdown only. You stay in control of your boat.');
  $('rallyName').textContent=view.destination?.name||'Choose where to sail together';
}
