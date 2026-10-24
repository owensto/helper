import {LIMIT,COLORS} from './protocol.mjs';
/** Safe plain-text UI: packet values never become markup or CSS. */
export function rosterView(info){
  const players=info.roster||[];
  return Array.from({length:LIMIT},(_,slot)=>{
    const p=players.find(p=>p.slot===slot);
    return {slot,color:COLORS[slot],name:p?`${p.name}${p.self?' (you)':''}`:'Open seat',status:!p?'Invite a friend':!p.connected?'Reconnecting':!p.visible?'Tab in background':p.ready?(p.host?'Host · Ready':'Ready'):p.host?'Host':'Connected',occupied:!!p};
  });
}
export function roomSummary(info){
  if(!['hosting','connected','stale','reconnecting','connecting'].includes(info.state))return 'Not in a room';
  return `${info.connected??0} / ${LIMIT} connected${info.players>(info.connected??0)?` · ${info.players-info.connected} reserved`:''}`;
}
export function renderRoster(doc,root,info){
  const rows=rosterView(info),fragment=doc.createDocumentFragment();
  for(const r of rows){const item=doc.createElement('li'),badge=doc.createElement('span'),name=doc.createElement('strong'),status=doc.createElement('small');item.className=`crew-row seat-${r.slot}${r.occupied?'':' empty'}`;badge.className='crew-badge';badge.textContent=String(r.slot+1);name.textContent=r.name;status.textContent=r.status;item.append(badge,name,status);fragment.append(item);}
  root.replaceChildren(fragment);
}
