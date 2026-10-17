import { ROOM_ID, PLAYER_ID, WORLD_HASH } from '../shared/world.mjs';
export function inviteLink(base,session,worldHash) {
  const url=new URL(base);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!ROOM_ID.test(session.roomId)||!PLAYER_ID.test(session.key)||!WORLD_HASH.test(worldHash))throw new Error('BAD_INVITE');
  url.search='';url.hash=new URLSearchParams({room:session.roomId,key:session.key,world:worldHash}).toString();
  return url.href;
}
/** Only join the configured frontend/world. An invitation cannot redirect the socket endpoint. */
export function parseInvite(input,base,worldHash) {
  if(typeof input!=='string'||input.length>2048)throw new Error('BAD_INVITE');
  let url,expected;
  try{url=new URL(input.trim(),base);expected=new URL(base);}catch{throw new Error('BAD_INVITE');}
  if(url.origin!==expected.origin||url.pathname!==expected.pathname||url.search||url.username||url.password)throw new Error('INVITE_ORIGIN_MISMATCH');
  const params=new URLSearchParams(url.hash.slice(1));
  if([...params.keys()].some(k=>!['room','key','world'].includes(k))||['room','key','world'].some(k=>params.getAll(k).length!==1))throw new Error('BAD_INVITE');
  const roomId=params.get('room'),key=params.get('key');
  if(!ROOM_ID.test(roomId||'')||!PLAYER_ID.test(key||'')||params.get('world')!==worldHash)throw new Error('INVITE_WORLD_MISMATCH');
  return {roomId,key};
}
