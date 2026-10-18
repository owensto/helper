/* Pure presentation and intent policy. No physics, renderer, media download or timer. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AtlasEasyPolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DEFAULTS = Object.freeze({ easy: true, largeText: false });
  const MAX_FAVORITES = 5;
  function preferences(raw, mobile = true) {
    let data = {};
    try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) {}
    if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
    return { easy: Object.hasOwn(data,'easy') && typeof data.easy === 'boolean' ? data.easy : mobile,
      largeText: Object.hasOwn(data,'largeText') && typeof data.largeText === 'boolean' ? data.largeText : false };
  }
  function mediaLink(text) {
    if (typeof text !== 'string' || text.length > 2048) throw Error('Paste a YouTube or Spotify link.');
    let u; try { u = new URL(text.trim()); } catch (_) { throw Error('Paste a complete https:// link.'); }
    if (u.protocol !== 'https:' || u.username || u.password || u.port) throw Error('Use an ordinary HTTPS music link.');
    const host = u.hostname.toLowerCase();
    const youtube = ['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host);
    let id = null;
    if (host === 'youtu.be' && /^\/[\w-]{11}\/?$/.test(u.pathname)) id = u.pathname.split('/')[1];
    if (youtube) {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      const part = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/);
      if (part) id = part[1];
    }
    if (id) {
      if (!/^[\w-]{11}$/.test(id)) throw Error('That YouTube video link looks incomplete.');
      return { provider: 'youtube', url: 'https://www.youtube.com/watch?v=' + id,
        label: 'YouTube video', spatial: false };
    }
    const list = u.searchParams.get('list');
    if (youtube && ['/playlist','/watch'].includes(u.pathname) && list && /^[\w-]{10,150}$/.test(list))
      return { provider: 'youtube', url: 'https://www.youtube.com/playlist?list=' + list,
        label: 'YouTube playlist', spatial: false };
    if (host === 'open.spotify.com' && /^\/(?:intl-[a-z]+\/)?(?:track|album|playlist|episode|show)\/[a-zA-Z0-9]{1,128}\/?$/.test(u.pathname))
      return { provider: 'spotify', url: 'https://open.spotify.com' + u.pathname,
        label: 'Open in Spotify', spatial: false };
    throw Error('Use a YouTube video/playlist or Spotify selection link.');
  }
  function favorites(raw) {
    let input; try { input = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { return []; }
    if (!Array.isArray(input)) return [];
    const out = [], seen = new Set();
    for (const row of input) {
      try {
        const valid = mediaLink(row?.url);
        if (seen.has(valid.url)) continue;
        const label = typeof row?.label === 'string' ? row.label.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,64) : '';
        out.push({ ...valid, label: label || valid.label }); seen.add(valid.url);
        if (out.length === MAX_FAVORITES) break;
      } catch (_) {}
    }
    return out;
  }
  function addFavorite(list, url, label) {
    const m = mediaLink(url);
    return favorites([{ ...m, label }, ...favorites(list).filter(x => x.url !== m.url)]);
  }
  function depthStatus(sample, feet = true) {
    const unit = feet ? 'ft' : 'm', factor = feet ? 3.280839895 : 1;
    // Never coerce null, strings or missing coverage into a safe depth.
    if (!sample || sample.known !== true || !Number.isFinite(sample.waterDepth))
      return { tone: 'unknown', headline: 'Depth unknown', detail: 'No reliable bottom estimate here.' };
    if (sample.land === true) return { tone: 'contact', headline: 'Land contact', detail: 'Reduce power; use recovery if stuck.' };
    const water = Math.max(0, sample.waterDepth * factor).toFixed(1) + ' ' + unit;
    const c = sample.contact?.clearance;
    if (!Number.isFinite(c)) return { tone: 'unknown', headline: 'Water depth ' + water, detail: 'Clearance under boat unknown.' };
    const part = sample.contact.part === 'PROP' ? 'propeller' : 'hull';
    if (c <= 0) return { tone: 'contact', headline: 'Bottom contact', detail: part + ' is touching the bottom. Reduce power.' };
    const gap = c * factor < 0.05 ? 'Less than 0.1 ' + unit : (c * factor).toFixed(1) + ' ' + unit;
    return { tone: c < 0.55 ? 'shallow' : 'depth', headline: gap + ' under ' + part,
      detail: 'Water depth ' + water + (c < 0.55 ? ' · Shallow water' : ' · Not a safe-route guarantee') };
  }
  function nextInstruction(state, context = {}) {
    if (!state) return 'Boat information unavailable. Pause before continuing.';
    if (context.paused === true) return 'Paused. Press Resume when you are ready.';
    if (state.destroyed10 || state.engineDisabled10) return 'Boat disabled. Open More for recovery.';
    if (state.startTimer > 0) return 'Engine starting…';
    if (!state.engine) return '1. Turn the key to start the engine.';
    if (!state.gear) return '2. Select Forward or Reverse.';
    if (!(state.throttle > 0)) return Math.abs(state.u || 0) > .2 ? 'Power at idle. The boat is still coasting; idle is not a brake.' : '3. Tap + to add power gradually.';
    return state.gear < 0 && state.u > 0.2 ? 'Reverse selected. Forward momentum is still slowing.' : 'Hold Left or Right to turn; release to straighten.';
  }
  // Read-only coaching. This selects instructions, never throttle, steering or time.
  function guideStep(state, context = {}) {
    if (!state) return {key:'unavailable',step:0,title:'Boat information unavailable',message:'Pause before continuing.',targets:[]};
    if (state.destroyed10 || state.engineDisabled10) return {key:'disabled',step:0,title:'Boat disabled',message:'Open More for recovery. Nothing is reset automatically.',targets:[]};
    if (context.paused === true) return {key:'paused',step:0,title:'Paused',message:'Press Resume when you are ready. Your guide will continue.',targets:['helm09-pause']};
    if (context.depth?.tone === 'contact' || state.grounded === true) return {key:'contact',step:0,title:'Bottom contact',message:'Reduce power. Check the depth and use recovery if stuck.',targets:['s11-less']};
    if (state.startTimer > 0) return {key:'starting',step:1,title:'Engine starting',message:'Wait for the engine to finish starting.',targets:[]};
    if (!state.engine) return {key:'ignition',step:1,title:'Turn the key',message:'Tap Turn key on the driving panel. You stay in control.',targets:['helm09-key']};
    if (state.gear !== 1 && state.gear !== -1) return {key:'direction',step:2,title:'Choose a direction',message:'Tap Forward to head ahead, or Reverse to move astern.',targets:['eh-native-gears']};
    if (state.gear < 0 && state.u > .2) return {key:'reverse',step:3,title:'Reverse selected',message:'Forward momentum is still slowing. Reverse is not an instant stop.',targets:[]};
    if (!(state.throttle > 0)) return {key:'power',step:3,title:'Add power gradually',message:Math.abs(state.u || 0)>.2?'You are coasting. Tap + only when you are ready to add power.':'Tap + once, then watch your speed. Use − to reduce power.',targets:['s11-more','s11-less']};
    return {key:'steer',step:4,title:'Steer and watch the water',message:'Hold Left or Right for a gentle turn. Release to straighten. Keep an eye on depth.',targets:['s11-left','s11-right','s11-center']};
  }
  function createActions(host) {
    if (!host || ['dispatch','read','isLocal','pause','panel','weather','option','view'].some(k => typeof host[k] !== 'function')) throw Error('An explicit local host adapter is required.');
    function ready() { if (host.isLocal() !== true) throw Error('This preview supports the local boat only.'); }
    return Object.freeze({
      coast() { ready(); host.dispatch('throttle',0); }, // Not a brake or anchor.
      pauseHelp() { ready(); host.pause(true); host.panel('help'); },
      resumeGuide() { ready(); if (typeof host.closePanel !== 'function') throw Error('This host does not support the guide yet.'); host.closePanel(); host.pause(false); },
      weather(name) { ready(); if (!['clear','breeze','swell','rain','fog','squall'].includes(name)) throw Error('Unknown weather preset.'); host.weather(name); },
      option(name,value) { ready(); if (!['docking','steadyCamera','shallowAssist','spokenAlerts','feet','hotspots'].includes(name) || typeof value !== 'boolean') throw Error('Unsupported assistance option.'); host.option(name,value); },
      view(name) { ready(); if (!['helm','follow','orbit','deck','engine','instruments'].includes(name)) throw Error('Unknown view.'); host.view(name); }
    });
  }
  return Object.freeze({ DEFAULTS,MAX_FAVORITES,preferences,mediaLink,favorites,addFavorite,depthStatus,nextInstruction,guideStep,createActions });
});
