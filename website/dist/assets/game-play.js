/* Cast & Catch 4. One-thumb fishing on photo water. No libraries. No network calls after the scene image. */
(() => {
  'use strict';
  const root = document.querySelector('[data-cast-game]');
  if (!root) return;
  const G = window.CastwardGame, C = window.CastwardCareer, $ = id => document.getElementById(id);
  const canvas = $('cc-canvas'), ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) { $('cc-hint').textContent = 'This browser cannot draw the game.'; return; }
  const places = JSON.parse($('career-data').textContent).places;
  const PLATES = JSON.parse(root.dataset.plates), FISH_ART = root.dataset.fishArt || '';
  const LOG_KEY = 'castward-cast-catch-v2', CAREER_KEY = 'castward-career-v2';
  const TAU = Math.PI * 2, clamp = G.clamp, lerp = (a, b, t) => a + (b - a) * t, rand = (a, b) => a + Math.random() * (b - a);
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- Saved progress (same keys and formats as the earlier game) ---------- */
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch { return false; } };
  let log = G.restore(read(LOG_KEY)), career = C.restore(read(CAREER_KEY), places);
  const dailyBonus = C.visit(career, today());
  const save = () => { write(LOG_KEY, log); write(CAREER_KEY, career); };
  let sound = false; try { sound = localStorage.getItem('castward-sound') === 'on'; } catch {}
  const daily = G.daily(today()), WATER_ORDER = ['river', 'lake', 'ice', 'flats', 'offshore', 'reef'];

  /* ---------- Fish art ---------- */
  const SHAPES = { trout: [12.5, .25], salmon: [13.5, .35], bass: [17, .2], perch: [15, .3], pike: [9, .4], grayling: [12, .4], sturgeon: [9.5, .5], slim: [11, .7], round: [25, .8], billfish: [12.5, .9], sail: [11.5, .9], mahi: [16, .75], tuna: [17.5, .9] };
  function mix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), x = p(a), y = p(b);
    return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')';
  }
  // Side view. The fish faces right. Origin is the middle of the body; len is the full length in pixels.
  function drawFish(c, sp, len) {
    const [D, fork] = SHAPES[sp.shape] || SHAPES.trout, id = sp.id, shape = sp.shape;
    const col = sp.color, back = mix(col, '#0f1f1b', .6), belly = mix(col, '#f7f2df', .8), fin = mix(col, '#17251f', .38);
    const warm = { 'tigerfish': '#c8603a', 'taimen': '#b5503c', 'arctic-char': '#d2733f', 'brook-trout': '#c9703f', 'yellow-perch': '#d3833a', 'yellowfin-tuna': '#e2c23c', 'peacock-bass': '#d98b2e', 'red-drum': '#b9733f', 'snapper': '#c9604a' }[id];
    const finCol = warm || fin, tx = -36;
    c.save(); c.scale(len / 100, len / 100); c.lineJoin = 'round';
    const poly = (pts, fill, alpha = 1) => { c.globalAlpha = alpha; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = fill; c.fill(); c.globalAlpha = 1; };
    // Tail.
    const th = D * (.78 + fork * .6);
    c.beginPath(); c.moveTo(tx + 3, -D * .3); c.quadraticCurveTo(-43, -D * .55, -50, -th); c.quadraticCurveTo(-50 + fork * 10 + 2, 0, -50, th); c.quadraticCurveTo(-43, D * .55, tx + 3, D * .3); c.closePath(); c.fillStyle = id === 'taimen' ? '#a8452f' : finCol; c.fill();
    // Dorsal fins.
    if (shape === 'sail') { c.beginPath(); c.moveTo(30, -D * .8); c.bezierCurveTo(24, -44, -6, -48, -24, -D * .7); c.closePath(); c.fillStyle = '#31506b'; c.fill(); }
    else if (shape === 'grayling') { c.beginPath(); c.moveTo(14, -D * .9); c.bezierCurveTo(8, -D - 22, -14, -D - 20, -18, -D * .8); c.closePath(); c.fillStyle = mix(col, '#6a4f7a', .5); c.fill(); }
    else if (shape === 'pike' || shape === 'sturgeon') poly([[-18, -D * .8], [-26, -D - 9], [-33, -D * .5]], finCol);
    else if (shape === 'bass' || shape === 'perch') { poly([[18, -D * .85], [14, -D - 9], [8, -D - 6], [5, -D - 11], [-1, -D - 6], [-3, -D * .95]], finCol); poly([[-5, -D * .95], [-9, -D - 10], [-20, -D - 6], [-24, -D * .6]], finCol); }
    else if (shape === 'mahi') { c.beginPath(); c.moveTo(34, -D * .95); c.bezierCurveTo(20, -D - 12, -18, -D - 7, -33, -D * .35); c.lineTo(-30, -D * .2); c.closePath(); c.fillStyle = '#2f6f7f'; c.fill(); }
    else if (shape === 'tuna' || shape === 'round' || shape === 'billfish') { poly([[10, -D * .9], [4, -D - 16], [-1, -D - 15], [0, -D * .9]], shape === 'tuna' ? '#e2c23c' : finCol); if (shape === 'tuna') for (let i = 0; i < 5; i++) { poly([[-10 - i * 5, -D * (.75 - i * .1)], [-13 - i * 5, -D * (.75 - i * .1) - 3], [-14 - i * 5, -D * (.7 - i * .1)]], '#e2c23c'); poly([[-10 - i * 5, D * (.75 - i * .1)], [-13 - i * 5, D * (.75 - i * .1) + 3], [-14 - i * 5, D * (.7 - i * .1)]], '#e2c23c'); } }
    else { poly([[8, -D * .92], [2, -D - 10], [-8, -D - 7], [-11, -D * .85]], finCol); if (shape !== 'slim') poly([[-24, -D * .55], [-28, -D * .55 - 4], [-30, -D * .45]], finCol); }
    // Belly fins.
    if (shape === 'round' || shape === 'tuna' || shape === 'billfish') poly([[-2, D * .9], [-8, D + 14], [-11, D + 13], [-9, D * .85]], shape === 'tuna' ? '#e2c23c' : finCol);
    else { poly([[4, D * .9], [-1, D + 8], [-6, D * .9]], finCol); poly([[-16, D * .8], [-22, D + 7], [-27, D * .55]], finCol); }
    // Body.
    c.beginPath(); c.moveTo(tx, -D * .3);
    if (shape === 'mahi') c.bezierCurveTo(-14, -D * .85, 34, -D * 1.4, 46, -D * .35); else c.bezierCurveTo(-18, -D * 1.08, 22, -D * 1.14, 44, -D * .24);
    c.quadraticCurveTo(shape === 'pike' || shape === 'sturgeon' ? 56 : 51, D * .05, 43, D * .32);
    c.bezierCurveTo(24, D * 1.06, -16, D * 1.02, tx, D * .3); c.closePath();
    const g = c.createLinearGradient(0, -D, 0, D); g.addColorStop(0, back); g.addColorStop(.42, col); g.addColorStop(.62, mix(col, '#f7f2df', .35)); g.addColorStop(1, id === 'mahi-mahi' ? '#e5d86a' : id === 'arctic-char' || id === 'brook-trout' ? '#e0a36b' : belly);
    c.fillStyle = g; c.fill();
    c.save(); c.clip();
    const spots = (n, color, r, y0, y1, x0 = -34, x1 = 26) => { c.fillStyle = color; for (let i = 0; i < n; i++) { const x = x0 + ((i * 37.7) % (x1 - x0)), y = y0 + ((i * 17.3) % (y1 - y0)); c.beginPath(); c.arc(x, y, r * (.7 + (i % 3) * .25), 0, TAU); c.fill(); } };
    const bars = (n, color, x0, step, wdt, y1 = D) => { c.fillStyle = color; for (let i = 0; i < n; i++) c.fillRect(x0 + i * step, -D * 1.2, wdt, D * 1.2 + y1); };
    if (id === 'rainbow-trout') { c.fillStyle = 'rgba(196,96,110,.5)'; c.fillRect(-36, -2.5, 78, 5); }
    if (shape === 'trout' || shape === 'grayling') spots(id === 'brook-trout' || id === 'lake-trout' || id === 'arctic-char' ? 30 : 44, id === 'brook-trout' || id === 'lake-trout' || id === 'arctic-char' ? 'rgba(246,238,205,.75)' : 'rgba(24,36,32,.62)', .95, -D * .95, D * .3);
    if (id === 'brown-trout') spots(9, 'rgba(180,70,48,.8)', 1, -2, D * .5);
    if (shape === 'salmon' && id !== 'tigerfish') spots(16, 'rgba(24,36,32,.5)', .8, -D * .95, -D * .2);
    if (id === 'tigerfish') { c.fillStyle = 'rgba(20,30,30,.5)'; for (let i = 0; i < 5; i++) c.fillRect(-36, -D * .8 + i * D * .36, 76, 1.1); }
    if (id === 'atlantic-tarpon' || id === 'barramundi' || id === 'giant-trevally' || id === 'permit' || id === 'bonefish') { c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = .6; for (let x = -32; x < 30; x += 6) for (let y = -D; y < D; y += 5) { c.beginPath(); c.arc(x + ((y / 5) % 2) * 3, y, 3.2, -1.2, 1.2); c.stroke(); } }
    if (id === 'yellow-perch') bars(6, 'rgba(34,50,36,.6)', -30, 10, 4.5, D * .25);
    if (id === 'walleye') bars(5, 'rgba(34,40,30,.22)', -30, 12, 6, 0);
    if (id === 'smallmouth-bass') bars(7, 'rgba(40,36,20,.28)', -30, 8.5, 3, D * .5);
    if (id === 'largemouth-bass') { c.fillStyle = 'rgba(22,34,22,.55)'; for (let i = 0; i < 13; i++) { c.beginPath(); c.ellipse(-33 + i * 5.6, -1 + (i % 2) * 1.6, 3.4, 2.6, 0, 0, TAU); c.fill(); } }
    if (id === 'peacock-bass') { bars(3, 'rgba(18,22,16,.75)', -22, 16, 5, D * .4); c.fillStyle = '#15180f'; c.beginPath(); c.arc(-38, -2, 3, 0, TAU); c.fill(); c.strokeStyle = '#e5c95a'; c.lineWidth = .9; c.stroke(); }
    if (shape === 'pike' && id !== 'wahoo' && id !== 'barracuda') spots(34, id === 'burbot' ? 'rgba(40,36,22,.4)' : 'rgba(240,236,190,.55)', 1.5, -D * .8, D * .5);
    if (id === 'wahoo') bars(13, 'rgba(46,82,120,.55)', -32, 5.5, 2.2, D * .5);
    if (id === 'barracuda') spots(9, 'rgba(26,36,40,.55)', 1.8, 0, D * .6, -32, 10);
    if (id === 'common-snook') { c.fillStyle = '#1c241f'; c.fillRect(-36, -1.2, 70, 1.5); }
    if (id === 'red-drum') { c.fillStyle = '#1b1f18'; c.beginPath(); c.arc(-32, -D * .2, 2.4, 0, TAU); c.fill(); }
    if (id === 'mahi-mahi') spots(26, 'rgba(40,110,150,.7)', .8, -D * .8, D * .7);
    if (shape === 'tuna') { c.fillStyle = 'rgba(226,194,60,.55)'; c.fillRect(-34, -3, 70, 2.2); }
    if (shape === 'billfish' || shape === 'sail') bars(11, 'rgba(190,215,235,.24)', -30, 6, 1.6, D);
    if (id === 'grouper') spots(20, 'rgba(60,44,28,.4)', 2.6, -D * .8, D * .6);
    if (shape === 'sturgeon') { c.fillStyle = 'rgba(235,232,205,.6)'; for (let i = 0; i < 12; i++) poly([[-32 + i * 5.6, -1.6], [-30 + i * 5.6, 0], [-32 + i * 5.6, 1.6], [-34 + i * 5.6, 0]], 'rgba(235,232,205,.55)'); }
    const hi = c.createLinearGradient(0, -D * .75, 0, -D * .1); hi.addColorStop(0, 'rgba(255,255,255,0)'); hi.addColorStop(.5, 'rgba(255,255,255,.3)'); hi.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = hi; c.fillRect(-36, -D, 82, D);
    c.restore();
    if (shape === 'billfish' || shape === 'sail') poly([[44, -D * .2], [76, -1.6], [44, D * .12]], back);
    // Gill, pectoral fin, mouth, eye.
    c.strokeStyle = 'rgba(16,28,24,.4)'; c.lineWidth = 1; c.beginPath(); c.arc(21, 0, D * .78, -1, 1.05); c.stroke();
    poly([[19, D * .22], [8, D * .78], [4, D * .5], [12, D * .16]], finCol, .85);
    c.strokeStyle = 'rgba(16,28,24,.55)'; c.lineWidth = .9; c.beginPath(); c.moveTo(shape === 'pike' ? 53 : 48, D * .1); c.lineTo(shape === 'bass' ? 33 : 39, D * .24); c.stroke();
    const ey = -D * .2, er = Math.max(2, D * .16);
    c.fillStyle = '#e9dfae'; c.beginPath(); c.arc(36, ey, er, 0, TAU); c.fill(); c.fillStyle = '#10201c'; c.beginPath(); c.arc(36.3, ey, er * .58, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(37, ey - er * .3, er * .2, 0, TAU); c.fill();
    c.restore();
  }
  // Seen from above, under the surface: a soft dark shape with a moving tail.
  function drawShadow(c, x, y, len, dir, wig, alpha, tint) {
    const w = len * .21, tail = Math.sin(wig) * len * .09;
    c.save(); c.translate(x, y); c.scale(dir, .5); c.globalAlpha = alpha;
    c.shadowColor = tint; c.shadowBlur = len * .16; c.fillStyle = tint;
    c.beginPath(); c.moveTo(len * .5, 0); c.bezierCurveTo(len * .32, -w, -len * .1, -w * .9, -len * .34, tail * .5);
    c.lineTo(-len * .52, tail - w * .75); c.lineTo(-len * .45, tail); c.lineTo(-len * .52, tail + w * .75); c.lineTo(-len * .34, tail * .5);
    c.bezierCurveTo(-len * .1, w * .9, len * .32, w, len * .5, 0); c.fill();
    c.restore();
  }
  // Species photos are white rectangles. Cut the white out once, then draw the cached canvas.
  const pics = Object.create(null);
  function loadFish(id) {
    let rec = pics[id];
    if (rec) return rec.cv || null;
    rec = pics[id] = { cv: null };
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const im = g.getImageData(0, 0, w, h), d = im.data, row = w * 4;
        const corners = [0, row - 4, (h - 1) * row, h * row - 4];
        let br = 0, bgc = 0, bb = 0;
        for (const i of corners) { br += d[i]; bgc += d[i + 1]; bb += d[i + 2]; }
        br /= 4; bgc /= 4; bb /= 4;
        for (let i = 0; i < d.length; i += 4) {
          const dr = d[i] - br, dg = d[i + 1] - bgc, db = d[i + 2] - bb;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist < 34) d[i + 3] = dist < 14 ? 0 : Math.min(255, (dist - 14) * 12.5);
        }
        g.putImageData(im, 0, 0);
        rec.cv = c;
      } catch {}
    };
    img.src = FISH_ART + id + '-320.webp';
    return null;
  }
  function paintFish(c, sp, len, dir, tilt) {
    const pic = pics[sp.id] && pics[sp.id].cv;
    c.save(); c.rotate(tilt || 0); c.scale(dir < 0 ? -1 : 1, 1);
    if (pic) { const w = len * 1.42, h = w * pic.height / pic.width; c.drawImage(pic, -w * .58, -h * .48, w, h); }
    else drawFish(c, sp, len);
    c.restore();
  }

  /* ---------- Sound and touch feedback (small synth, off until the player turns it on) ---------- */
  let audio = null;
  function tone(freq, dur, type = 'sine', vol = .12, slide = 0) {
    if (!sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime;
      o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
      o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + dur + .02);
    } catch {}
  }
  function hiss(dur, vol = .16, cut = 1400) {
    if (!sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const n = Math.floor(audio.sampleRate * dur), buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
      const s = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
      f.type = 'lowpass'; f.frequency.value = cut; g.gain.value = vol; s.buffer = buf; s.connect(f).connect(g).connect(audio.destination); s.start();
    } catch {}
  }
  const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch {} };

  /* ---------- Scene ---------- */
  let W = 0, H = 0, dpr = 1, hzY = 0, bg = document.createElement('canvas'), plate = null, plateFor = '';
  let water = 'river', place = null, pool = [], gear = C.effects(career);
  let phase = 'ready', fish = [], lure = null, cast = null, wait = null, F = null, hooked = null, lost = null;
  let t = 0, rings = [], drops = [], hold = false, aim = null, keyAim = false, paused = false, visible = true, streak = 0, lastCatch = null, tapStart = null, rodKick = 0;
  let shake = 0, boil = null, lift = null, aid = false;
  const told = {};
  const markPause = v => { paused = v; root.dataset.paused = v ? 'true' : 'false'; };
  markPause(false);
  const still = () => reducedQuery.matches;
  const proj = (u, d) => { const k = Math.pow(1 - d, 1.7); return { x: W / 2 + u * W * (.2 + .46 * Math.pow(1 - d, 1.2)), y: hzY + (H - hzY) * (.05 + .9 * k), s: .2 + .8 * Math.pow(1 - d, 1.3) }; };
  function unproj(x, y) { const k = clamp(((y - hzY) / (H - hzY) - .05) / .9, 0, 1), d = clamp(1 - Math.pow(k, 1 / 1.7), .14, .9); return { u: clamp((x - W / 2) / (W * (.2 + .46 * Math.pow(1 - d, 1.2))), -1, 1), d }; }

  function bake() {
    bg.width = canvas.width; bg.height = canvas.height;
    const c = bg.getContext('2d'), P = PLATES[water];
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (plate && plateFor === water) {
      const sc = Math.max(W / plate.naturalWidth, H / plate.naturalHeight), dw = plate.naturalWidth * sc, dh = plate.naturalHeight * sc;
      const oy = clamp(H * .37 - P.hz * dh, H - dh, 0); hzY = oy + P.hz * dh;
      c.drawImage(plate, (W - dw) / 2, oy, dw, dh);
    } else {
      hzY = H * .37; const w = G.waters[water];
      let g = c.createLinearGradient(0, 0, 0, hzY); g.addColorStop(0, w.sky[0]); g.addColorStop(1, w.sky[1]); c.fillStyle = g; c.fillRect(0, 0, W, hzY);
      g = c.createLinearGradient(0, hzY, 0, H); g.addColorStop(0, w.water[0]); g.addColorStop(1, w.water[1]); c.fillStyle = g; c.fillRect(0, hzY, W, H - hzY);
    }
    // Soft edges so the labels stay readable. Baked once.
    let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(8,20,18,.42)'); g.addColorStop(.16, 'rgba(8,20,18,0)'); g.addColorStop(.72, 'rgba(8,20,18,0)'); g.addColorStop(1, 'rgba(8,20,18,.5)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight; if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 2 : 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); bake();
  }
  function loadPlate() {
    const P = PLATES[water], want = water, img = new Image();
    img.decoding = 'async'; img.onload = () => { if (want !== water) return; plate = img; plateFor = want; bake(); };
    const need = Math.max(W * dpr, H * dpr * 1.5) * .55, sizes = Object.keys(P.sizes).map(Number).sort((a, b) => a - b);
    img.src = P.sizes[sizes.find(n => n >= need) || sizes[sizes.length - 1]];
  }

  /* ---------- Fish in the water ---------- */
  function kindOf(sp, prof) {
    if (prof.jump) return 'jump';
    if (prof.run >= 4.2 || sp.shape === 'tuna' || sp.id === 'wahoo' || sp.id === 'barracuda') return 'run';
    if (prof.force >= 1.3 || sp.shape === 'sturgeon' || sp.shape === 'pike' || sp.id === 'grouper' || sp.id === 'giant-trevally') return 'deep';
    return 'pull';
  }
  function pickSpecies() {
    const bonus = ((gear.attraction || 1) - 1) * .12, r = Math.random();
    const tier = !log.total ? 'common' : r > .955 - bonus ? 'legendary' : r > .68 - bonus ? 'rare' : 'common';
    const list = pool.filter(s => s.rarity === tier);
    return (list.length ? list : pool)[Math.floor(Math.random() * (list.length ? list.length : pool.length))];
  }
  function spawn(edge) {
    const sp = pickSpecies(), spec = G.specimen(sp, Math.random, 0), dir = Math.random() < .5 ? -1 : 1;
    return { sp, spec, u: edge ? -dir * 1.25 : rand(-.75, .75), d: rand(.3, .78), dir, speed: rand(.045, .1), wig: rand(0, TAU), state: 'cruise', alpha: 0, big: .75 + Math.min(1.5, spec.length / 95) };
  }
  const fishCount = () => 4 + ((gear.cast || 1) >= 1.2 ? 1 : 0) + ((gear.cast || 1) >= 1.45 ? 1 : 0);
  function stock() { fish = []; for (let i = 0; i < fishCount(); i++) fish.push(spawn(false)); if (!log.total) { fish[0].u = .08; fish[0].d = .5; fish[0].speed = .03; } }
  function setWater(w, p) {
    water = w; place = p || null;
    pool = place ? C.targets(place) : G.species.filter(s => s.water === w);
    if (!pool.length) pool = G.species.filter(s => s.water === w);
    career.place = place ? place.id : null; write('castward-water', w);
    phase = 'ready'; lure = null; F = null; hooked = null; hold = false; stock(); loadPlate(); bake(); hud(); hint(); save();
  }

  /* ---------- Player actions ---------- */
  function castTo(x, y) {
    if (phase !== 'ready') return;
    aid = C.firstCast(career);
    if (aid) save();
    const p = unproj(x, Math.max(y, hzY + (H - hzY) * .08));
    cast = { from: rodTip(), to: p, t: 0 }; lure = { ...p }; phase = 'cast'; rodKick = 1; keyAim = false; hideCard();
    hiss(.28, .1, 2600); hint();
  }
  function splashAt(u, d, n = 10, big = 1) {
    rings.push({ u, d, age: 0, big });
    if (still()) return;
    const p = proj(u, d);
    for (let i = 0; i < n && drops.length < 140; i++) drops.push({ x: p.x + rand(-6, 6) * p.s * big, y: p.y, vx: rand(-60, 60) * p.s * big, vy: rand(-190, -70) * p.s * big, life: rand(.35, .7), r: rand(1, 2.4) * p.s * big + .6 });
  }
  function startWait() {
    phase = 'wait'; splashAt(lure.u, lure.d, 9, .8); hiss(.16, .14, 900); tone(190, .12, 'sine', .1, -90);
    if (aid) {
      const sp = pool.find(s => s.rarity === 'common') || pool[0];
      let best = fish.find(f => f.sp.rarity === 'common');
      if (!best) { best = spawn(false); fish.push(best); }
      if (best.sp.rarity !== 'common') best.sp = sp;
      best.u = lure.u; best.d = lure.d; best.alpha = 1; best.state = 'cruise';
      wait = { fish: best, t: 0, delay: .2, near: 0, seq: null, step: 0, stepT: 0, dip: 0, quality: 1, aid: true };
      aid = false; toast('A fish is on your cast'); hint(); return;
    }
    let best = null, bd = 9;
    for (const f of fish) { if (f.state !== 'cruise') continue; const dd = Math.hypot(f.u - lure.u, (f.d - lure.d) * 2.2); if (dd < bd) { bd = dd; best = f; } }
    if (!best) { best = spawn(true); fish.push(best); bd = 1; }
    const boost = gear.attraction || 1, first = !log.total;
    wait = { fish: best, t: 0, delay: (bd < .3 ? rand(.3, .8) : bd < .62 ? rand(1, 1.9) : rand(2.1, 3.6)) / boost, near: bd, seq: null, step: 0, stepT: 0, dip: 0, quality: bd < .3 ? 1 : bd < .62 ? .5 : .15 };
    if (first) wait.delay = Math.min(wait.delay, 1);
    toast(bd < .3 ? 'Right on the fish' : bd < .62 ? 'Close. It saw the splash.' : 'A long way from a fish');
    hint();
  }
  function tapWait() {
    if (!wait) return;
    const cur = wait.seq && wait.seq[wait.step];
    if (cur && cur[0] === 'nib') { toast('Wait. Tap when the float goes under.'); wait.seq.splice(wait.step + 1, 0, ['pause', .5]); return; }
    if (wait.fish.state === 'cruise') wait.t += .7;
    rings.push({ u: lure.u, d: lure.d, age: 0, big: .5 }); rodKick = .4; tone(520, .04, 'triangle', .04);
  }
  function hook() {
    hooked = wait.fish; hooked.state = 'hooked';
    const sp = hooked.sp, prof = G.fightProfile(sp, hooked.spec.size), kind = kindOf(sp, prof);
    const runs = sp.rarity === 'legendary' ? 4 + (hooked.spec.size > .5 ? 1 : 0) : sp.rarity === 'rare' ? 2 + (hooked.spec.size > .6 ? 1 : 0) : 1 + (hooked.spec.size > .7 ? 1 : 0);
    const hard = sp.rarity === 'legendary' ? 1.6 : sp.rarity === 'rare' ? 1.25 : 1;
    F = { hard, prof, kind, dist: 7 + lure.d * 24, tension: .38, stamina: 1, mode: 'pull', modeT: log.total ? rand(1.4, 2.4) : 3, runs: log.total ? runs : 1, time: 0, zone: 0, red: 0, slack: 0, u: lure.u, dir: Math.random() < .5 ? -1 : 1, jump: 0, clean: true, click: 0 };
    phase = 'fight'; hold = false; streak++; if (!still()) shake = 1; loadFish(sp.id);
    buzz(60); tone(330, .1, 'square', .08, 200); splashAt(lure.u, lure.d, still() ? 6 : 14, 1.2);
    if (!told[kind]) { told[kind] = true; const msg = { jump: 'Jumper: let go when it jumps', run: 'Long run: let go until it stops', deep: 'Heavy fish: let go before the bar turns red' }[kind]; if (msg) toast(msg); }
    hint();
  }
  function endCast(reason) {
    lost = { t: 0, reason }; phase = 'lost'; hold = false; streak = 0;
    if (hooked) { hooked.state = 'flee'; hooked = null; }
    if (wait && wait.fish && wait.fish.state !== 'cruise') wait.fish.state = 'flee';
    F = null; wait = null; hint();
  }
  function land() {
    const sp = hooked.sp, sz = hooked.spec, date = today();
    const entry = { id: sp.id, species: sp.name, water: G.waters[water].name, length: sz.length, weight: sz.weight, date };
    const isNew = !log.collected[sp.id], bestSpecies = !log.collected[sp.id] || sz.length > log.collected[sp.id].length;
    if (bestSpecies) log.collected[sp.id] = entry;
    const bestWeight = !log.best || sz.weight > log.best.weight; if (bestWeight) log.best = entry;
    log.total++; log.log.unshift(entry); log.log = log.log.slice(0, 12);
    const challenge = !place && water === daily.water && (log.daily[date] || 0) < 3;
    if (challenge) log.daily[date] = (log.daily[date] || 0) + 1;
    const clean = F.clean, before = C.level(career);
    const reward = C.land(career, place, entry, clean, date, challenge);
    lastCatch = { sp, sz, entry, isNew, bestSpecies, bestWeight, reward, clean, levelUp: C.level(career) > before, dailyDone: challenge && log.daily[date] === 3 };
    lift = { sp, u: hooked.u, dir: hooked.dir || 1, big: hooked.big, t: 0, card: false };
    loadFish(sp.id); splashAt(hooked.u, .12, still() ? 4 : 14, 1.5);
    fish = fish.filter(f => f !== hooked); fish.push(spawn(true)); hooked = null; F = null; wait = null; lure = null; hold = false;
    phase = 'landed'; save(); buzz([40, 60, 120]);
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .28, 'triangle', .1), i * 90));
    hud(); renderLog(); renderDaily(); hint();
  }

  /* ---------- Simulation ---------- */
  function rodTip() { return { x: W * (W < 700 ? .6 : .58), y: H * .615 }; }
  function step(dt) {
    t += dt; rodKick = Math.max(0, rodKick - dt * 2.2);
    for (const f of fish) {
      f.alpha = Math.min(1, f.alpha + dt * .7); f.wig += dt * (f.state === 'cruise' ? 5 : 11);
      if (f.state === 'cruise') { f.u += f.dir * f.speed * dt; f.d = clamp(f.d + Math.sin(t * .35 + f.wig * .02) * .012 * dt, .24, .82); if (Math.abs(f.u) > 1.3) f.dir = f.u > 0 ? -1 : 1; }
      else if (f.state === 'approach' && lure) { const dx = lure.u - f.u, dd = lure.d - f.d, m = Math.hypot(dx, dd * 2.2); f.dir = dx >= 0 ? 1 : -1; if (m > .035) { const v = .42 * dt / m; f.u += dx * v; f.d += dd * v; } }
      else if (f.state === 'flee') { f.u += f.dir * .9 * dt; f.alpha = Math.max(0, f.alpha - dt * 1.6); }
    }
    if (fish.some(f => f.state === 'flee' && (f.alpha <= 0 || Math.abs(f.u) > 1.4))) { fish = fish.filter(f => !(f.state === 'flee' && (f.alpha <= 0 || Math.abs(f.u) > 1.4))); while (fish.length < fishCount()) fish.push(spawn(true)); }
    if (phase === 'ready' && Math.random() < dt * .22 && !still()) { const f = fish[Math.floor(Math.random() * fish.length)]; if (f && f.state === 'cruise' && Math.abs(f.u) < 1) rings.push({ u: f.u, d: f.d, age: 0, big: .45 }); }
    if (phase === 'cast') { cast.t += dt / .62; if (cast.t >= 1) startWait(); }
    else if (phase === 'wait' || phase === 'strike') {
      const f = wait.fish; wait.t += dt;
      if (f.state === 'cruise' && wait.t > wait.delay) f.state = 'approach';
      if (f.state === 'approach' && Math.hypot(f.u - lure.u, (f.d - lure.d) * 2.2) < .05 && !wait.seq) {
        const n = wait.aid ? 0 : !log.total ? 1 : Math.floor(Math.random() * 3), seq = [['pause', wait.aid ? .35 : rand(.35, .7)]];
        for (let i = 0; i < n; i++) seq.push(['nib', .32], ['pause', rand(.45, 1)]);
        seq.push(['strike', (wait.aid || !log.total ? 2.8 : f.sp.rarity === 'legendary' ? 1 : 1.25) * (gear.stealth || 1)]); wait.seq = seq; wait.step = 0; wait.stepT = 0;
      }
      if (wait.seq) {
        const cur = wait.seq[wait.step]; wait.stepT += dt;
        if (wait.stepT === dt && cur[0] === 'nib') { rings.push({ u: lure.u, d: lure.d, age: 0, big: .4 }); tone(240, .05, 'sine', .05); buzz(12); }
        if (cur[0] === 'strike' && phase !== 'strike') { phase = 'strike'; boil = { u: lure.u, d: lure.d, t: 0 }; splashAt(lure.u, lure.d, still() ? 4 : 8, .9); tone(160, .16, 'sine', .14, -70); buzz(90); hint(); }
        wait.dip = cur[0] === 'nib' ? Math.sin(Math.min(1, wait.stepT / cur[1]) * Math.PI) * .45 : cur[0] === 'strike' ? Math.min(1, wait.stepT * 9) : 0;
        if (wait.stepT >= cur[1]) { if (cur[0] === 'strike') endCast('miss'); else { wait.step++; wait.stepT = 0; } }
      }
    }
    else if (phase === 'fight') fight(dt);
    else if (phase === 'lost') { lost.t += dt; if (lost.t > 3.2) { phase = 'ready'; lure = null; lost = null; hint(); } }
    shake = Math.max(0, shake - dt / .28);
    if (boil) { boil.t += dt; if (boil.t > .7) boil = null; }
    if (lift) { lift.t += dt; if (!lift.card && lift.t > (still() ? .08 : .82)) { lift.card = true; showCard(); } if (lift.t > 1.35) lift = null; }
    for (const r of rings) r.age += dt; rings = rings.filter(r => r.age < 1.5);
    for (const p of drops) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; } drops = drops.filter(p => p.life > 0);
  }
  function fight(dt) {
    const f = F, tired = f.stamina <= 0, air = f.jump > .12, reel = hold && !air;
    const runScale = f.kind === 'run' ? Math.min(1.28, f.prof.run / 2.8) : 1;
    f.time += dt; f.modeT -= dt;
    if (f.modeT <= 0) {
      if (f.mode === 'run') { f.mode = 'pull'; f.modeT = rand(2.2, 3.4); hint(); }
      else if (f.runs > 0 && !tired) {
        f.mode = 'run'; f.runs--; f.dir = -f.dir; f.modeT = rand(1.3, 2) * runScale / (gear.control || 1);
        if (f.kind === 'jump') f.jump = 1;
        buzz([30, 40, 30]); tone(140, .25, 'sawtooth', .07, 120); splashAt(f.u, fishD(), still() ? 4 : 12, 1.2); hint();
      } else { f.mode = 'pull'; f.modeT = 2.5; }
    }
    const jumping = f.jump > .12;
    let rise = f.mode === 'run' ? 1.05 * f.prof.force * f.hard : tired ? .06 : .23 * f.prof.force;
    if (f.kind === 'deep') rise *= 1.32;
    if (jumping && hold) f.tension += dt * 1.5 * f.hard;
    else if (reel) f.tension += dt * rise / (gear.strength || 1);
    else f.tension -= dt * (f.mode === 'run' ? .85 : .55);
    if ((f.mode === 'run' || jumping) && !hold) f.tension = Math.max(f.tension, .22);
    f.tension = clamp(f.tension, 0, 1);
    const zone = f.tension > .3 && f.tension < .8, slow = .72 + .28 * f.prof.duration;
    const reelK = f.kind === 'deep' && zone ? 1.18 : 1;
    if (jumping) { /* In the air the fish takes no line. */ }
    else if (reel) f.dist -= dt * (f.mode === 'run' ? -.5 : zone ? 3.3 * reelK : f.tension >= .8 ? 1.3 : 1.9) * (gear.reel || 1) * (tired ? 1.3 : 1) / slow;
    else f.dist += dt * (f.mode === 'run' ? 2.4 / runScale : .3);
    f.stamina -= dt * (f.mode === 'run' ? .2 : reel ? .1 : .025) / f.prof.duration;
    if (tired && f.mode !== 'run' && !f.tiredSaid) { f.tiredSaid = true; toast('It is tired. Bring it in.'); }
    if (zone && reel) f.zone += dt;
    f.red = f.tension >= .97 ? f.red + dt : Math.max(0, f.red - dt * 2); if (f.tension > .9) f.clean = false;
    f.slack = f.tension <= .02 && f.mode !== 'run' && !jumping ? f.slack + dt : 0;
    f.dist = clamp(f.dist, 0, 46);
    const span = f.kind === 'deep' ? .28 : .8;
    const target = f.mode === 'run' ? f.dir * span : f.dir * .3 * Math.sin(f.time * 1.3);
    f.u += (target - f.u) * Math.min(1, dt * (f.mode === 'run' ? (f.kind === 'deep' ? .7 : 1.6) : .9));
    hooked.u = f.u; hooked.d = fishD(); hooked.dir = f.mode === 'run' && f.kind !== 'deep' ? f.dir : -Math.sign(f.u || 1);
    if (f.jump > 0) { const was = f.jump; f.jump -= dt / .95; if (was > .05 && f.jump <= .05) { f.dist += 1.5; splashAt(f.u, fishD(), still() ? 3 : 16, 1.5); hiss(.28, .18, 800); } }
    if (reel && f.mode !== 'run') { f.click -= dt; if (f.click <= 0) { f.click = zone ? .07 : .12; tone(1700, .012, 'square', .02); } }
    if (!still() && Math.random() < dt * (f.mode === 'run' ? 8 : 2.2)) splashAt(f.u + rand(-.03, .03), fishD(), 2, .65);
    if (f.red > (f.hard > 1.5 ? .4 : f.hard > 1 ? .5 : .6)) { tone(900, .08, 'sawtooth', .12, -700); buzz(160); endCast('snap'); }
    else if (f.slack > 3.6) endCast('slack');
    else if (f.dist <= 4) land();
  }
  const fishD = () => clamp((F.dist - 4) / 34 + (F.kind === 'deep' ? .16 : 0), F.kind === 'deep' ? .24 : .03, .88);

  /* ---------- Drawing ---------- */
  function drawBoil() {
    if (!boil) return;
    const p = proj(boil.u, boil.d), k = boil.t / .7;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const a = Math.max(0, .62 - k * (.65 + i * .1)), rad = (12 + k * 52 + i * 9) * p.s;
      ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 2.1 - i * .35;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, rad, rad * .36, 0, 0, TAU); ctx.stroke();
    }
    if (!still()) for (let i = 0; i < 6; i++) {
      const a = (k * 1.35 + i * .16) % 1, ang = i * 1.05 + .4;
      ctx.globalAlpha = (1 - a) * .8; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x + Math.cos(ang) * a * 24 * p.s, p.y - a * 32 * p.s, (2.3 - a) * p.s + .4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function draw() {
    const CW = canvas.width, CH = canvas.height, P = PLATES[water];
    const sh = shake > 0 && !still() ? shake * 6 : 0, ox = sh ? Math.sin(t * 70) * sh : 0, oy = sh ? Math.cos(t * 49) * sh * .6 : 0;
    ctx.setTransform(1, 0, 0, 1, ox * dpr, oy * dpr); ctx.drawImage(bg, 0, 0);
    if (!still()) {
      // The photo water moves: thin rows shift sideways, more near the camera.
      const y0 = Math.ceil(hzY * dpr) + 2, stepPx = Math.max(2, Math.round(2.5 * dpr)), span = CH - y0;
      for (let y = y0; y < CH; y += stepPx) { const k = (y - y0) / span, ph = 46 * Math.sqrt(k); const off = (Math.sin(ph - t * 1.5) * (.5 + k * 3.4) + Math.sin(ph * 2.7 + t * 2.2) * k * 1.3) * dpr; ctx.drawImage(bg, 0, y, CW, stepPx, off, y, CW, stepPx); }
    }
    ctx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
    if (!still()) { ctx.strokeStyle = 'rgba(255,255,255,.1)'; for (let i = 0; i < 22; i++) { const k = Math.pow((i * .618) % 1, 1.6), y = hzY + (H - hzY) * (.04 + .9 * k), len = (10 + (i % 5) * 9) * (.3 + k * 1.3), x = ((i * 173 + t * (9 + (i % 4) * 5) * (.3 + k)) % (W + 120)) - 60; ctx.lineWidth = .6 + k; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len / 2, y + Math.sin(t * 1.4 + i) * 1.6 * k, x + len, y); ctx.stroke(); } }
    // Fish under the surface.
    const base = Math.max(112, Math.min(W, 900) * .2);
    for (const f of fish) {
      if (f === hooked && F && F.jump > 0) continue;
      const p = proj(f.u, f.d), len = base * f.big * p.s, isHooked = f === hooked;
      drawShadow(ctx, p.x, p.y, len, f.dir, f.wig, f.alpha * (isHooked ? .82 : f.state === 'approach' ? .74 : .6) * (P.light ? .55 : 1), P.shadow);
      if (gear.sonar && f.state === 'cruise' && phase === 'ready') { ctx.fillStyle = f.sp.rarity === 'legendary' ? '#f3cf6e' : f.sp.rarity === 'rare' ? '#9fd6e0' : 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y - len * .22 - 6, 2.5, 0, TAU); ctx.fill(); }
    }
    if (phase === 'ready' && !log.total && fish[0]) { const p = proj(fish[0].u, fish[0].d), a = (t * 1.1) % 1; ctx.strokeStyle = 'rgba(255,240,196,' + (1 - a) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, (26 + a * 34) * p.s + 10, ((26 + a * 34) * p.s + 10) * .42, 0, 0, TAU); ctx.stroke(); }
    if (phase === 'ready' && keyAim && aim) { const p = proj(aim.u, aim.d); ctx.strokeStyle = '#fff0c4'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, 20 * p.s + 6, (20 * p.s + 6) * .42, 0, 0, TAU); ctx.moveTo(p.x - 6, p.y); ctx.lineTo(p.x + 6, p.y); ctx.stroke(); }
    for (const r of rings) { const p = proj(r.u, r.d), a = r.age / 1.5, rad = (8 + a * 46) * p.s * r.big + 3; ctx.strokeStyle = 'rgba(255,255,255,' + (.55 * (1 - a)) + ')'; ctx.lineWidth = 1.4 * p.s + .4; ctx.beginPath(); ctx.ellipse(p.x, p.y, rad, rad * .36, 0, 0, TAU); ctx.stroke(); if (a > .25) { ctx.beginPath(); ctx.ellipse(p.x, p.y, rad * .55, rad * .2, 0, 0, TAU); ctx.stroke(); } }
    drawBoil();
    // Rod, line and float.
    const tip = rodTip(), tension = F ? F.tension : 0; let end = null, floatP = null;
    if (phase === 'cast') { const k = Math.min(1, cast.t), q = proj(cast.to.u, cast.to.d), e = 1 - Math.pow(1 - k, 1.6); end = { x: lerp(tip.x, q.x, e), y: lerp(tip.y, q.y, e) - Math.sin(k * Math.PI) * H * .22 }; floatP = { ...end, s: lerp(.9, q.s, e), dip: 0 }; }
    else if ((phase === 'wait' || phase === 'strike') && lure) { const q = proj(lure.u, lure.d); end = { x: q.x, y: q.y + Math.sin(t * 2.1) * 1.2 * q.s }; floatP = { ...end, s: q.s, dip: wait ? wait.dip : 0 }; }
    else if (phase === 'fight' && hooked) { const q = proj(hooked.u, hooked.d); end = { x: q.x + hooked.dir * base * hooked.big * q.s * .4, y: q.y }; }
    const kick = rodKick * (phase === 'cast' ? 1 : .35), bx = W * (W < 700 ? .8 : .7), by = H + 30;
    const tx = tip.x + (end && F ? (end.x - tip.x) * .16 * tension : 0) - kick * W * .05 + Math.sin(t * .9) * 1.5, ty = tip.y + tension * H * .075 + kick * H * .07;
    const cx = lerp(bx, tip.x, .62) - tension * W * .02, cy = lerp(by, tip.y, .78) - H * .05 * (1 - tension);
    if (end) {
      const sag = F ? (1 - tension) * 26 : phase === 'cast' ? 4 : 30;
      ctx.strokeStyle = F ? (tension > .8 ? '#ff8a6b' : tension > .3 ? 'rgba(255,250,225,.9)' : 'rgba(255,250,225,.6)') : 'rgba(255,250,225,.72)'; ctx.lineWidth = F && tension > .8 ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo((tx + end.x) / 2, (ty + end.y) / 2 + sag, end.x, end.y + (floatP ? -3 * floatP.s : 0)); ctx.stroke();
    }
    if (floatP) {
      const r = 6.5 * floatP.s + 2.5, yy = floatP.y + floatP.dip * r * 1.7;
      ctx.save(); ctx.beginPath(); ctx.rect(floatP.x - r * 2, floatP.y - r * 6, r * 4, r * 6 + (phase === 'cast' ? r * 3 : 1)); ctx.clip();
      ctx.fillStyle = '#f4efe1'; ctx.beginPath(); ctx.ellipse(floatP.x, yy - r * .5, r * .78, r, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d6452f'; ctx.beginPath(); ctx.ellipse(floatP.x, yy - r * .5, r * .78, r, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#2a2f2b'; ctx.fillRect(floatP.x - .7, yy - r * 2.3, 1.4, r * .9); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(floatP.x - r * .28, yy - r * .9, r * .16, r * .3, .4, 0, TAU); ctx.fill();
      ctx.restore();
      if (phase !== 'cast') { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(floatP.x, floatP.y, r * (1.5 + Math.sin(t * 2) * .12), r * .5, 0, 0, TAU); ctx.stroke(); }
      if (phase === 'strike') { const a = .6 + .4 * Math.sin(t * 22); ctx.fillStyle = 'rgba(255,214,120,' + a + ')'; ctx.font = '800 ' + Math.round(30 * floatP.s + 22) + 'px "Barlow Condensed",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', floatP.x, floatP.y - r * 3.2); }
    }
    if (phase === 'fight' && hooked) {
      const q = proj(hooked.u, hooked.d), len = base * hooked.big * q.s;
      if (F.jump > 0) { const k = 1 - F.jump, hgt = Math.sin(k * Math.PI) * (H * .1 + len * .5); ctx.save(); ctx.translate(q.x + (hooked.dir || 1) * k * len * .45, q.y - hgt); paintFish(ctx, hooked.sp, len * 1.2, hooked.dir || 1, lerp(-.8, .65, k)); ctx.restore(); }
      else { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(q.x - hooked.dir * i * len * .22, q.y, len * (.3 + i * .14), len * (.07 + i * .03), 0, 0, TAU); ctx.globalAlpha = .5 - i * .14; ctx.stroke(); } ctx.globalAlpha = 1; }
    }
    if (lift && lift.t < 1.25) {
      const k = Math.min(1, lift.t / .9), q = proj(lift.u, .16), len = base * lift.big * Math.max(.72, q.s);
      const hgt = still() ? len * .12 : Math.sin(k * Math.PI * .5) * H * .16;
      ctx.save(); ctx.translate(q.x, Math.min(q.y, hzY + 10) - hgt);
      paintFish(ctx, lift.sp, len * 1.28, lift.dir, still() ? -.12 : lerp(-.5, .35, k));
      ctx.restore();
    }
    // The rod: a tapered blank with a cork grip, drawn in short segments.
    ctx.lineCap = 'round'; let px = bx, py = by;
    for (let i = 1; i <= 16; i++) { const k = i / 16, a = 1 - k, x = a * a * bx + 2 * a * k * cx + k * k * tx, y = a * a * by + 2 * a * k * cy + k * k * ty; ctx.strokeStyle = k < .16 ? '#a8845a' : '#161c1a'; ctx.lineWidth = lerp(W < 700 ? 12 : 17, 1.6, Math.pow(k, .6)); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); if (k > .2 && i % 4 === 0) { ctx.strokeStyle = '#8f9a94'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y + 2, 2.4 * (1 - k) + 1, 0, TAU); ctx.stroke(); } px = x; py = y; }
    ctx.fillStyle = 'rgba(240,244,236,.82)'; for (const p of drops) { ctx.globalAlpha = Math.min(1, p.life * 2.4); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
    if (F) {
      const bar = $('cc-tension-fill'); bar.style.width = Math.round(F.tension * 100) + '%'; bar.dataset.zone = F.tension >= .8 ? 'red' : F.tension > .3 ? 'good' : 'slack';
      $('cc-dist').textContent = Math.max(0, Math.round(F.dist - 4)) + ' m to go'; $('cc-fight').dataset.run = F.mode === 'run' ? '1' : '';
    }
  }

  /* ---------- Interface ---------- */
  let toastTimer = 0;
  function toast(text) { const el = $('cc-toast'); el.textContent = text; el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200); }
  function hint() {
    const el = $('cc-hint'); let text = '', sub = '';
    if (phase === 'ready') { text = 'Tap the water to cast'; sub = log.total ? 'Aim for a shadow. A big shadow is a big fish.' : 'Aim for the fish shadow in the ring.'; }
    else if (phase === 'cast') text = '';
    else if (phase === 'wait') { text = 'Watch the float'; sub = 'Tap when it goes under. Not before.'; }
    else if (phase === 'strike') { text = 'Tap now!'; }
    else if (phase === 'fight') {
      if (F.jump > .12) { text = 'It jumps. Let go!'; sub = 'Hold again when it lands.'; }
      else if (F.mode === 'run' && F.kind === 'run') { text = 'Long run. Let go!'; sub = 'Hold again when the bar drops.'; }
      else if (F.mode === 'run' && F.kind === 'deep') { text = 'It digs down'; sub = 'Let go before the bar turns red.'; }
      else if (F.mode === 'run') { text = 'It runs. Let go!'; sub = 'Hold again when the bar drops.'; }
      else if (F.kind === 'deep') { text = 'Hold to reel'; sub = 'Heavy fish. Let go before the bar turns red.'; }
      else { text = 'Hold to reel'; sub = 'Keep the bar in the green band. Let go before the red.'; }
    }
    else if (phase === 'lost') { text = { miss: 'Too late. It let go.', snap: 'The line broke.', slack: 'The hook came loose.' }[lost.reason]; sub = { miss: 'Tap the moment the float goes under.', snap: 'Let go when the bar turns red.', slack: 'Hold to keep the line tight.' }[lost.reason]; }
    el.innerHTML = text ? '<b>' + esc(text) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') : '';
    el.dataset.phase = phase; el.hidden = !text || phase === 'landed';
    $('cc-fight').hidden = phase !== 'fight';
    canvas.style.touchAction = phase === 'fight' || phase === 'strike' || phase === 'wait' ? 'none' : 'pan-y';
    root.dataset.phase = phase; root.dataset.kind = phase === 'fight' && F ? F.kind : '';
  }
  function goalText() {
    const date = today(), n = Object.keys(log.collected).length;
    if (!log.total) return 'Goal: land your first fish';
    if (place) { const o = career.objectives[place.id] || [], ts = C.targets(place); if (!o[0]) return 'Goal: catch a ' + ts[0].name.toLowerCase(); if (!o[2]) return 'Goal: land a fish and keep the bar out of the red'; if (!o[1]) return 'Goal: land a trophy fish here'; return place.name + ' is complete. Choose a new place.'; }
    if (water === daily.water && (log.daily[date] || 0) < 3) return 'Today: ' + (log.daily[date] || 0) + ' of 3 fish for the daily bonus';
    return 'Fish Log: ' + n + ' of ' + G.species.length + ' species';
  }
  function hud() {
    gear = C.effects(career);
    $('cc-water-name').textContent = place ? place.name : G.waters[water].name;
    $('cc-level').textContent = 'LV ' + C.level(career); $('cc-coins').textContent = career.coins.toLocaleString();
    $('cc-log-count').textContent = Object.keys(log.collected).length + '/' + G.species.length;
    $('cc-goal').textContent = goalText();
    $('cc-sound').setAttribute('aria-pressed', String(sound)); $('cc-sound').textContent = sound ? 'Sound on' : 'Sound off';
  }
  const imperial = sz => (sz.length / 2.54 >= 24 ? (sz.length / 2.54).toFixed(0) : (sz.length / 2.54).toFixed(1)) + ' in · ' + (sz.weight * 2.20462 >= 10 ? (sz.weight * 2.20462).toFixed(0) : (sz.weight * 2.20462).toFixed(1)) + ' lb';
  function artTo(el, sp, pad = .86) { const r = Math.min(window.devicePixelRatio || 1, 2), w = el.clientWidth || 300, h = el.clientHeight || 120; el.width = w * r; el.height = h * r; const c = el.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h); const [D] = SHAPES[sp.shape] || SHAPES.trout, long = sp.shape === 'billfish' || sp.shape === 'sail' ? 128 : 104, len = Math.min(w * pad / (long / 100), h * .8 / ((D * 2 + (sp.shape === 'sail' ? 40 : 22)) / 100)); c.translate(w / 2 - (long - 100) / 200 * len, h / 2 + (sp.shape === 'sail' ? len * .12 : len * .02)); drawFish(c, sp, len); }
  function showCard() {
    const k = lastCatch, sp = k.sp, card = $('cc-card');
    $('cc-card-rarity').textContent = (k.isNew ? 'New species · ' : '') + sp.rarity.charAt(0).toUpperCase() + sp.rarity.slice(1); $('cc-card-rarity').dataset.rarity = sp.rarity;
    $('cc-card-name').textContent = sp.name;
    $('cc-card-size').innerHTML = '<b>' + imperial(k.sz) + '</b> <span>' + k.sz.length + ' cm · ' + k.sz.weight.toFixed(2) + ' kg</span>';
    const tags = []; if (k.bestWeight && log.total > 1) tags.push('Your heaviest fish'); else if (k.bestSpecies && !k.isNew) tags.push('Your longest ' + sp.name.toLowerCase()); if (k.reward.trophy) tags.push('Trophy size'); if (k.clean) tags.push('Clean fight'); if (k.dailyDone) tags.push('Daily bonus'); if (k.levelUp) tags.push('Level ' + C.level(career)); if (streak > 1) tags.push(streak + ' in a row');
    $('cc-card-tags').innerHTML = tags.map(x => '<li>' + esc(x) + '</li>').join('');
    $('cc-card-fact').textContent = sp.fact || '';
    $('cc-card-reward').textContent = '+' + k.reward.xp + ' XP · +' + k.reward.coins + ' coins';
    const link = $('cc-card-real'); link.href = place ? place.canonicalPath : '/environments/' + G.waters[water].route + '/'; link.textContent = place ? 'Plan ' + place.name + ' for real ↗' : ({ river: 'Fish rivers and streams', lake: 'Fish lakes and reservoirs', ice: 'Go ice fishing', flats: 'Fish saltwater flats', offshore: 'Fish offshore', reef: 'Fish a reef' }[water]) + ' for real ↗';
    card.hidden = false; showArt($('cc-card-img'), $('cc-card-art'), sp, 640); card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    setTimeout(() => $('cc-again').focus({ preventScroll: true }), 50);
  }
  function showArt(img, cv, sp, size) {
    img.hidden = true; cv.hidden = false; artTo(cv, sp);
    img.onload = () => { img.hidden = false; cv.hidden = true; }; img.onerror = () => { img.hidden = true; cv.hidden = false; };
    img.alt = sp.name; img.src = FISH_ART + sp.id + '-' + size + '.webp';
  }
  function hideCard() { $('cc-card').hidden = true; }
  function again() { hideCard(); phase = 'ready'; hint(); hud(); canvas.focus({ preventScroll: true }); }

  function renderLog() {
    const n = Object.keys(log.collected).length;
    const html = WATER_ORDER.map(w => '<h3>' + esc(G.waters[w].name) + '</h3><ul class="cc-log-grid">' + G.species.filter(s => s.water === w).map(s => { const c = log.collected[s.id]; return '<li class="' + (c ? 'got ' : '') + s.rarity + '">' + (c ? '<img src="' + FISH_ART + s.id + '-320.webp" alt="" loading="lazy" width="320" height="213" onerror="this.replaceWith(Object.assign(document.createElement(\'canvas\'),{className:\'cc-art-fallback\'}))"><b>' + esc(s.name) + '</b><span>' + imperial(c) + '</span>' : '<i aria-hidden="true">?</i><b>' + (s.rarity === 'legendary' ? 'Legendary fish' : s.rarity === 'rare' ? 'Rare fish' : 'Common fish') + '</b><span>Not caught yet</span>') + '</li>'; }).join('') + '</ul>').join('');
    for (const host of document.querySelectorAll('[data-fish-log]')) host.innerHTML = html;
    document.querySelectorAll('[data-log-count]').forEach(el => { el.textContent = n + ' of ' + G.species.length; });
    const best = $('cc-best'); if (best) best.textContent = log.best ? log.best.species + ', ' + imperial(log.best) : 'No fish yet';
  }
  function renderDaily() {
    const n = log.daily[today()] || 0, el = $('cc-daily'); if (!el) return;
    $('cc-daily-text').textContent = n >= 3 ? 'Done for today. The bonus is in your coins.' : 'Land 3 fish on the ' + G.waters[daily.water].name.toLowerCase() + ' water today. The third fish pays a bonus of 180 coins.';
    $('cc-daily-count').textContent = n + ' of 3'; $('cc-daily-go').hidden = n >= 3 || (water === daily.water && !place);
  }
  function renderWaters() {
    const lv = C.level(career);
    $('cc-waters-list').innerHTML = WATER_ORDER.map(w => '<button type="button" data-w="' + w + '" aria-pressed="' + (!place && w === water) + '" style="background-image:url(' + PLATES[w].thumb + ')"><b>' + esc(G.waters[w].name) + '</b><span>' + G.species.filter(s => s.water === w).length + ' species' + (w === daily.water ? ' · daily bonus' : '') + '</span></button>').join('');
    $('cc-places-list').innerHTML = places.map(p => { const locked = p.level > lv, o = career.objectives[p.id] || [], done = o.filter(Boolean).length; return '<li class="' + (locked ? 'locked' : '') + (place && place.id === p.id ? ' on' : '') + '"><div><b>' + esc(p.name) + '</b><span>' + esc(p.country) + ' · ' + esc(C.targets(p).map(s => s.name).slice(0, 3).join(', ')) + (done ? ' · ' + done + '/3 goals' : '') + '</span></div>' + (locked ? '<em>Level ' + p.level + '</em>' : '<button type="button" data-p="' + esc(p.id) + '">Fish here</button>') + '<a href="' + esc(p.canonicalPath) + '">Real trip ↗</a></li>'; }).join('');
  }
  function renderTackle() {
    $('cc-tackle-coins').textContent = career.coins.toLocaleString() + ' coins';
    $('cc-tackle-list').innerHTML = C.gear.map(g => { const own = career.owned.includes(g.id), on = career.equipped[g.slot] === g.id; return '<li><div><b>' + esc(g.name) + '</b><span>' + esc(TACKLE[g.id] || g.effect) + '</span><a href="/guides/' + g.guide + '/">See the real gear ↗</a></div><button type="button" data-g="' + g.id + '" ' + (on || (!own && career.coins < g.cost) ? 'disabled' : '') + '>' + (on ? 'In use' : own ? 'Use' : g.cost + ' coins') + '</button></li>'; }).join('');
  }
  // What each item does in this game. The names and prices come from the shared career rules.
  const TACKLE = { spinner: 'Fish come to the float sooner. A few more rare fish.', fly: 'The strongest pull on fish. More rare fish.', jig: 'Fish come to the float a little sooner.', rod: 'Shorter runs. One more fish in reach.', line: 'A stronger line. The bar climbs slower.', reel: 'Brings line in 18% faster.', waders: 'More time to tap when the float goes under.', kayak: 'Sonar: a dot shows how rare each shadow is. More time to hook.', boat: 'Sonar, and one more fish in reach.' };
  function openSheet(id, render) { if (phase === 'fight' || phase === 'strike') return; render && render(); markPause(true); const d = $(id); if (d.showModal) d.showModal(); else d.setAttribute('open', ''); if (id === 'cc-log-sheet') renderLog(); }
  document.querySelectorAll('.cc-sheet').forEach(d => { d.addEventListener('close', () => { markPause(false); last = 0; }); d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); }); });

  $('cc-water-btn').onclick = () => openSheet('cc-waters-sheet', renderWaters);
  $('cc-tackle-btn').onclick = () => openSheet('cc-tackle-sheet', renderTackle);
  $('cc-log-btn').onclick = () => openSheet('cc-log-sheet');
  $('cc-waters-list').onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; setWater(b.dataset.w, null); $('cc-waters-sheet').close(); renderDaily(); };
  $('cc-places-list').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; const p = places.find(x => x.id === b.dataset.p); if (!p || p.level > C.level(career)) return; if (!career.permits.includes(p.licence)) career.permits.push(p.licence); setWater(p.water, p); $('cc-waters-sheet').close(); renderDaily(); };
  $('cc-tackle-list').onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; if (C.buy(career, b.dataset.g)) { save(); hud(); renderTackle(); while (fish.length < fishCount()) fish.push(spawn(true)); tone(880, .08, 'triangle', .08); } };
  $('cc-sound').onclick = () => { sound = !sound; write('castward-sound', sound ? 'on' : 'off'); hud(); if (sound) tone(660, .12, 'triangle', .1); };
  $('cc-full').onclick = () => { const on = !root.classList.contains('cc-fullview'); root.classList.toggle('cc-fullview', on); document.documentElement.classList.toggle('cc-lock', on); $('cc-full').setAttribute('aria-pressed', String(on)); $('cc-full').textContent = on ? 'Exit full view' : 'Full view'; requestAnimationFrame(resize); };
  $('cc-again').onclick = again;
  $('cc-card-log').onclick = () => openSheet('cc-log-sheet');
  if ($('cc-daily-go')) $('cc-daily-go').onclick = () => { setWater(daily.water, null); renderDaily(); $('cc-stage').scrollIntoView({ block: 'start', behavior: still() ? 'auto' : 'smooth' }); };

  /* ---------- Input: one finger, or Space ---------- */
  const point = e => { const b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  function press(p) {
    if (paused) return;
    if (phase === 'wait') tapWait(); else if (phase === 'strike') hook(); else if (phase === 'fight') hold = true;
  }
  canvas.addEventListener('pointerdown', e => { if (e.button > 0) return; const p = point(e); tapStart = phase === 'ready' ? { ...p, id: e.pointerId, time: performance.now() } : null; if (phase === 'fight') { try { canvas.setPointerCapture(e.pointerId); } catch {} } press(p); });
  canvas.addEventListener('pointerup', e => { hold = false; if (tapStart && tapStart.id === e.pointerId && phase === 'ready' && !paused) { const p = point(e); if (Math.hypot(p.x - tapStart.x, p.y - tapStart.y) < 14) castTo(p.x, p.y); } tapStart = null; });
  canvas.addEventListener('pointercancel', () => { hold = false; tapStart = null; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (e.repeat) return; if (phase === 'ready') { if (!aim) aim = { u: fish[0] ? fish[0].u : 0, d: fish[0] ? fish[0].d : .5 }; const p = proj(aim.u, aim.d); castTo(p.x, p.y); } else if (phase === 'landed') again(); else press(); }
    else if (e.key.startsWith('Arrow') && phase === 'ready') { e.preventDefault(); aim = aim || { u: 0, d: .5 }; keyAim = true; if (e.key === 'ArrowLeft') aim.u -= .08; if (e.key === 'ArrowRight') aim.u += .08; if (e.key === 'ArrowUp') aim.d += .05; if (e.key === 'ArrowDown') aim.d -= .05; aim.u = clamp(aim.u, -1, 1); aim.d = clamp(aim.d, .16, .88); }
  });
  canvas.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') hold = false; });
  window.addEventListener('blur', () => { hold = false; });

  /* ---------- Loop ---------- */
  let last = 0, raf = 0;
  function frame(now) {
    raf = 0; if (!visible || document.hidden) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    if (!paused && W) { step(dt); draw(); }
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { hold = false; wake(); });
  new ResizeObserver(resize).observe(canvas);
  const logSection = document.querySelector('.cc-log-section [data-fish-log]');
  if (logSection) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { renderLog(); o.disconnect(); } }, { rootMargin: '300px' }).observe(logSection);

  /* ---------- Start ---------- */
  const startPlace = places.find(p => p.id === career.place);
  let startWater = startPlace ? startPlace.water : (() => { try { return localStorage.getItem('castward-water'); } catch { return null; } })();
  if (!G.waters[startWater]) startWater = 'river';
  resize(); setWater(startWater, startPlace || null); renderLog(); renderDaily();
  if (dailyBonus && log.total) setTimeout(() => toast('Welcome back. Day ' + career.streak + ': coins added.'), 900);
  // Test hooks: read the state, or move the clock by hand (browser tests run with a throttled frame clock).
  window.CastwardPlay = { advance(sec, quiet) { for (let left = sec; left > 1e-6; left -= 1 / 60) step(Math.min(1 / 60, left)); if (!quiet) draw(); }, bench(n = 120) { const t0 = performance.now(); for (let i = 0; i < n; i++) { t += 1 / 60; draw(); } return (performance.now() - t0) / n; }, state: () => ({ rarity: hooked ? hooked.sp.rarity : '', size: hooked ? hooked.spec.size : 0, reason: lost ? lost.reason : '', phase, water, tension: F ? F.tension : 0, mode: F ? F.mode : '', kind: F ? F.kind : '', jump: F ? F.jump : 0, dist: F ? F.dist : 0, fish: fish.map(f => { const p = proj(f.u, f.d); return { x: Math.round(p.x), y: Math.round(p.y), state: f.state, id: f.sp.id }; }), total: log.total, coins: career.coins }) };
  wake();
})();
