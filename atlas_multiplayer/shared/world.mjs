/** Proposed wire contract, independent of CORE's physics or renderer. */
export const PROTOCOL = 'atlas-net-2';
export const ID = /^[a-zA-Z0-9_.:-]{1,80}$/;
export const PLAYER_ID = /^[A-Za-z0-9_-]{32}$/;
export const ROOM_ID = /^[a-f0-9]{16}$/;
export const WORLD_HASH = /^[a-f0-9]{64}$/;
const fail = code => { throw new Error(code); };
export const finite = (n, max=100000) => typeof n==='number' && Number.isFinite(n) && Math.abs(n)<=max;
const vector = (v,n,max) => Array.isArray(v)&&v.length===n&&v.every(x=>finite(x,max));
export function validatePose(value) {
  if (!value || typeof value!=='object' || Array.isArray(value)) fail('BAD_POSE');
  if (Object.keys(value).some(k=>!['p','q','engine','rpm','gear'].includes(k))) fail('BAD_POSE');
  if (!vector(value.p,3,100000)||!vector(value.q,4,1.001)) fail('BAD_POSE');
  const norm=Math.hypot(...value.q);
  if (Math.abs(norm-1)>.01||typeof value.engine!=='boolean'||!finite(value.rpm,10000)||value.rpm<0||![-1,0,1].includes(value.gear)) fail('BAD_POSE');
  return {p:[...value.p],q:value.q.map(n=>n/norm),engine:value.engine,rpm:value.rpm,gear:value.gear};
}
export function canonical(value) {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  fail('NON_JSON_WORLD_VALUE');
}
const frozen = value => {
  if (value && typeof value==='object') { Object.values(value).forEach(frozen);Object.freeze(value); }
  return value;
};
/** A fixture flag cannot silently turn a proposed world into a production world. */
export function validateWorld(input,{allowFixture=false}={}) {
  if (!input || input.schema!=='atlas-world-1') fail('WORLD_CONFIG_REQUIRED');
  const w=structuredClone(input);
  if (!['fixture','core'].includes(w.kind)) fail('WORLD_NOT_APPROVED');
  if (w.kind==='fixture' && !allowFixture) fail('FIXTURE_WORLD_NOT_ALLOWED');
  if (w.kind==='core' && (!/^[a-f0-9]{40}$/.test(w.coreSourceSha||'') ||
      !/^https:\/\/github\.com\/owensto\/helper\/pull\/[12]#issuecomment-\d+$/.test(w.approvalRef||''))) fail('WORLD_NOT_APPROVED');
  for (const key of ['worldId','worldRevision','sceneRevision','spawnValidationRef']) if(typeof w[key]!=='string'||!ID.test(w[key])) fail('BAD_WORLD_CONFIG');
  if (w.kind==='fixture' && !w.worldId.startsWith('transport-fixture')) fail('BAD_WORLD_CONFIG');
  if (w.units!=='metres-seconds-radians'||w.axes!=='RH:X-forward:Y-up:Z-starboard:quat-XYZW') fail('WORLD_AXES_MISMATCH');
  if (!Number.isInteger(w.capacity)||w.capacity<1||w.capacity>8) fail('BAD_WORLD_CONFIG');
  if (!w.clock||w.clock.physics!=='host-per-client-resettable'||w.clock.transport!=='server-arrival-monotonic'||w.clock.waterPhaseSynchronized!==false) fail('BAD_WORLD_CONFIG');
  if (!w.water||!ID.test(w.water.revision||'')||w.water.unknownDepth!=='unknown') fail('BAD_WORLD_CONFIG');
  if (!w.weather||!ID.test(w.weather.presetId||'')||w.weather.mutable!==false||
      !finite(w.weather.windMps,100)||w.weather.windMps<0||!finite(w.weather.windDirectionRad,Math.PI*2)) fail('BAD_WORLD_CONFIG');
  if (!w.vessels||typeof w.vessels!=='object'||Array.isArray(w.vessels)||Object.keys(w.vessels).length<1||Object.keys(w.vessels).length>8) fail('BAD_WORLD_CONFIG');
  for(const [id,v] of Object.entries(w.vessels)) {
    if(!ID.test(id)||['__proto__','constructor','prototype'].includes(id)||!v||!ID.test(v.controllerRevision||'')||!ID.test(v.footprintRevision||'')) fail('BAD_VESSEL_CONFIG');
    if(!Array.isArray(v.spawns)||v.spawns.length!==w.capacity) fail('BAD_SPAWN_CONFIG');
    const positions=new Set();
    for(const spawn of v.spawns) {
      if(!spawn||!ID.test(spawn.id||'')) fail('BAD_SPAWN_CONFIG');
      validatePose({p:spawn.p,q:spawn.q,engine:false,rpm:0,gear:0});
      const key=canonical(spawn.p);if(positions.has(key))fail('DUPLICATE_SPAWN');positions.add(key);
    }
  }
  if(canonical(w).length>16384)fail('WORLD_CONFIG_TOO_LARGE');
  return frozen(w);
}
export async function worldFingerprint(world) {
  const bytes=new TextEncoder().encode(canonical(world));
  const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
