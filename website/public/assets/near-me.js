/* Castward "Fish near me": one tap per screen, a real result at the end. No library. */
(() => {
  const root = document.querySelector('[data-near-me]');
  if (!root) return;
  const card = root.querySelector('[data-nm-card]');
  const tag = root.dataset.tag || '';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let units = 'us';
  try { const u = localStorage.getItem('castward.units'); units = u === 'metric' || u === 'us' ? u : (/^en-US$/i.test(navigator.language) ? 'us' : 'metric'); } catch { units = /^en-US$/i.test(navigator.language) ? 'us' : 'metric'; }
  const us = units === 'us';
  const dist = km => us ? Math.round(km * 0.621371) + ' mi' : Math.round(km) + ' km';
  const temp = c => us ? Math.round(c * 9 / 5 + 32) + '°F' : Math.round(c) + '°C';
  const wind = k => us ? Math.round(k * 0.621371) + ' mph' : Math.round(k) + ' km/h';
  const rain = mm => us ? (mm / 25.4).toFixed(2) + ' in' : mm.toFixed(1) + ' mm';

  const RANGES = [
    {km: 80, label: 'Close to home', sub: 'About an hour away'},
    {km: 250, label: 'A day trip', sub: 'Two to three hours each way'},
    {km: 600, label: 'A weekend away', sub: 'Up to a day of travel'},
    {km: Infinity, label: 'Anywhere', sub: 'I will fly'},
  ];
  const STEPS = ['where', 'range', 'water', 'fish'];
  let data = null, state = {};

  const loadData = () => data ? Promise.resolve(data) : fetch(root.dataset.catalog).then(r => { if (!r.ok) throw new Error('Places did not load. Try again.'); return r.json(); }).then(d => (data = d));
  function km(a, b) {
    const R = 6371, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  const places = () => data.places.map(p => ({...p, d: km(state.from, {lat: p.y, lon: p.x})})).sort((a, b) => a.d - b.d);
  const inRange = () => places().filter(p => p.d <= state.range);
  const inWater = () => inRange().filter(p => !state.water || p.g.includes(state.water));
  const matches = () => inWater().filter(p => !state.fish || p.s.includes(state.fish));
  const groupLabel = k => (data.groups.find(g => g[0] === k) || [k, k])[1];

  function frame(step, html) {
    const i = STEPS.indexOf(step);
    const head = i >= 0 ? `<div class="nm-progress" aria-label="Step ${i + 1} of 4"><span style="width:${(i + 1) * 25}%"></span></div><div class="nm-bar">${i > 0 ? '<button type="button" class="nm-back" data-back>← Back</button>' : '<span></span>'}<small>Step ${i + 1} of 4</small></div>` : '';
    root.classList.toggle('nm-going', step !== 'where');
    card.innerHTML = head + `<div class="nm-step" data-step="${step}">${html}</div>`;
    if (!reduced) card.animate?.([{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 220, easing: 'ease-out'});
    const top = card.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * .6) card.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'start'});
    card.querySelector('[data-back]')?.addEventListener('click', () => show(STEPS[i - 1]));
  }
  const option = (attr, value, label, sub, count, disabled) =>
    `<button type="button" class="nm-opt" ${attr}="${esc(value)}"${disabled ? ' disabled' : ''}><b>${esc(label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}${count != null ? `<em>${count} ${count === 1 ? 'place' : 'places'}</em>` : ''}</button>`;
  const live = text => `<p class="nm-live" role="status">${text}</p>`;

  // Screen 1: where
  function whereStep() {
    frame('where', `<p class="nm-q">Where do you start from?</p>
<button type="button" class="nm-big" data-locate>Use my location</button>
<form class="nm-town" data-town><label for="nm-town-input">Or type a town</label><div><input id="nm-town-input" type="search" minlength="2" maxlength="80" placeholder="Town or city" autocomplete="off" required><button type="submit">Find</button></div></form>
<div class="nm-options" data-town-results></div><p class="nm-note" data-where-status role="status">Your location stays on this device. Castward does not store it.</p>`);
    const status = card.querySelector('[data-where-status]'), results = card.querySelector('[data-town-results]');
    card.querySelector('[data-locate]').onclick = () => {
      if (!navigator.geolocation) { status.textContent = 'Location is not available here. Type a town.'; return; }
      status.textContent = 'Allow location access in your browser…';
      navigator.geolocation.getCurrentPosition(p => setFrom({lat: p.coords.latitude, lon: p.coords.longitude, name: 'your location'}),
        () => { status.textContent = 'Location is off or blocked. Type a town instead.'; card.querySelector('#nm-town-input').focus(); },
        {maximumAge: 600000, timeout: 12000});
    };
    card.querySelector('[data-town]').onsubmit = async e => {
      e.preventDefault();
      const q = card.querySelector('#nm-town-input').value.trim();
      if (q.length < 2) return;
      status.textContent = 'Find ' + q + '…'; results.replaceChildren();
      try {
        const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?' + new URLSearchParams({name: q, count: 5, language: 'en', format: 'json'}));
        const j = await r.json();
        if (!j.results?.length) { status.textContent = 'No town found. Check the spelling or try a bigger town.'; return; }
        status.textContent = 'Select your town.';
        results.innerHTML = j.results.map((p, i) => `<button type="button" class="nm-opt" data-town-pick="${i}"><b>${esc(p.name)}</b><span>${esc([p.admin1, p.country].filter(Boolean).join(', '))}</span></button>`).join('');
        results.querySelectorAll('[data-town-pick]').forEach(b => b.onclick = () => { const p = j.results[Number(b.dataset.townPick)]; setFrom({lat: p.latitude, lon: p.longitude, name: [p.name, p.admin1].filter(Boolean).join(', ')}); });
      } catch { status.textContent = 'The town search did not load. Check your connection and try again.'; }
    };
  }
  async function setFrom(from) {
    state = {from};
    try { sessionStorage.setItem('castward.nearme.from', JSON.stringify(from)); } catch {}
    try { await loadData(); } catch (e) { card.querySelector('[data-where-status]').textContent = e.message; return; }
    show('range');
  }

  // Screen 2: how far
  function rangeStep() {
    const all = places();
    const counts = RANGES.map(r => all.filter(p => p.d <= r.km).length);
    const nearest = all[0];
    frame('range', `<p class="nm-q">How far will you go?</p>
<div class="nm-options">${RANGES.map((r, i) => option('data-range', i, r.label, r.km === Infinity ? r.sub : r.sub + ' · up to ' + dist(r.km), counts[i], !counts[i])).join('')}</div>
${live(`The nearest Castward place to ${esc(state.from.name)} is <b>${esc(nearest.n)}</b>, about ${dist(nearest.d)} away.`)}`);
    card.querySelectorAll('[data-range]').forEach(b => b.onclick = () => { state.range = RANGES[Number(b.dataset.range)].km; delete state.water; delete state.fish; show('water'); });
  }

  // Screen 3: water
  function waterStep() {
    const set = inRange();
    const counts = data.groups.map(([k]) => [k, set.filter(p => p.g.includes(k)).length]).filter(([, n]) => n);
    if (counts.length === 1) { state.water = counts[0][0]; return show('fish'); }
    frame('water', `<p class="nm-q">What water do you want?</p>
<div class="nm-options">${counts.map(([k, n]) => option('data-water', k, groupLabel(k), '', n)).join('')}${option('data-water', '', 'Any water', 'Show me the nearest', set.length)}</div>
${live(`${set.length} ${set.length === 1 ? 'place' : 'places'} in range.`)}`);
    card.querySelectorAll('[data-water]').forEach(b => b.onclick = () => { state.water = b.dataset.water || null; delete state.fish; show('fish'); });
  }

  // Screen 4: fish
  function fishStep() {
    const set = inWater(), tally = new Map();
    set.forEach(p => p.s.forEach(s => tally.set(s, (tally.get(s) || 0) + 1)));
    const top = [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
    if (!top.length) { state.fish = null; return result(); }
    frame('fish', `<p class="nm-q">What do you want to catch?</p>
<div class="nm-options nm-two">${top.map(([s, n]) => option('data-fish', s, s, '', n)).join('')}${option('data-fish', '', 'Anything that bites', '', set.length)}</div>
${live(`${set.length} ${set.length === 1 ? 'place' : 'places'}${state.water ? ' with ' + esc(groupLabel(state.water).toLowerCase()) : ''} in range.`)}`);
    card.querySelectorAll('[data-fish]').forEach(b => b.onclick = () => { state.fish = b.dataset.fish || null; result(); });
  }

  // Best day: the calmest, driest day in the forecast. It does not predict fish.
  function bestDay(dly) {
    const scores = dly.time.map((_, i) => {
      const w = dly.wind_speed_10m_max[i] ?? 99, g = dly.wind_gusts_10m_max[i] ?? w, p = dly.precipitation_sum[i] ?? 0, pp = dly.precipitation_probability_max?.[i] ?? 0, hi = dly.temperature_2m_max[i] ?? 15;
      return Math.max(0, w - 10) + Math.max(0, g - 40) * .5 + p * 3 + pp * .05 + (hi > 34 ? (hi - 34) * 2 : 0) + (hi < -12 ? (-12 - hi) : 0);
    });
    let best = 0; scores.forEach((s, i) => { if (s < scores[best] - .01) best = i; });
    return best;
  }
  const dayName = (iso, i) => i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'});
  const clock = iso => { const m = /T(\d{2}):(\d{2})/.exec(iso || ''); if (!m) return ''; const h = Number(m[1]); return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`; };
  function why(dly, i) {
    const w = dly.wind_speed_10m_max[i], p = dly.precipitation_sum[i], minW = Math.min(...dly.wind_speed_10m_max);
    const parts = [];
    parts.push(w <= minW + .5 ? `the lightest wind of the week (${wind(w)})` : `wind up to ${wind(w)}`);
    parts.push(p < .2 ? 'no rain in the forecast' : `${rain(p)} of rain`);
    return parts.join(' and ');
  }

  function gearFor(group, hiC) {
    const scopes = new Set(['all']);
    scopes.add(group === 'ice' || hiC < 21 ? 'cool' : 'warm');
    if (group === 'river' || group === 'coast') scopes.add('wade');
    if (group === 'boat') scopes.add('boat');
    return data.gear.filter(g => scopes.has(g.s) && g.e);
  }
  const amazon = q => { const u = new URL('https://www.amazon.com/s'); u.searchParams.set('k', q); if (/^[A-Za-z0-9-]{3,60}$/.test(tag)) u.searchParams.set('tag', tag); return u.href; };

  async function result() {
    const list = matches();
    const pick = list[0];
    const label = state.fish ? state.fish.toLowerCase() : state.water ? groupLabel(state.water).toLowerCase() : 'fishing';
    const steps = [`Found ${list.length} ${list.length === 1 ? 'place' : 'places'} for ${esc(label)}${state.range === Infinity ? '' : ' within ' + dist(state.range)}`, `Read the 7-day forecast for ${esc(pick.n)}`, 'Made your gear list'];
    frame('build', `<p class="nm-q">Your plan</p><ol class="nm-build">${steps.map((s, i) => `<li data-b="${i}">${s}</li>`).join('')}</ol>`);
    const tick = i => card.querySelector(`[data-b="${i}"]`)?.classList.add('done');
    tick(0);
    const query = new URLSearchParams({lat: state.from.lat.toFixed(3), lon: state.from.lon.toFixed(3), from: state.from.name, r: state.range === Infinity ? 'any' : state.range, w: state.water || '', f: state.fish || ''});
    history.replaceState(null, '', location.pathname + '?' + query);
    let fc = null;
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({latitude: pick.y, longitude: pick.x, timezone: 'auto', forecast_days: 7,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset'}));
      if (r.ok) fc = await r.json();
    } catch {}
    tick(1);
    await new Promise(r => setTimeout(r, reduced ? 0 : 350));
    tick(2);
    await new Promise(r => setTimeout(r, reduced ? 0 : 250));
    render(list, pick, fc);
  }

  function render(list, pick, fc) {
    const dly = fc?.daily, best = dly ? bestDay(dly) : -1;
    const group = state.water || pick.g[0];
    const hi = dly ? dly.temperature_2m_max[best] : 15;
    const gear = gearFor(group, hi);
    const weatherUrl = '/tools/weather/?' + new URLSearchParams({lat: pick.y, lon: pick.x, name: pick.n});
    const tidesUrl = '/tools/tides/?' + new URLSearchParams({lat: pick.y, lon: pick.x, name: pick.n});
    const when = dly ? `<section class="nm-box"><h2>When: ${esc(dayName(dly.time[best], best))}</h2>
<p>${esc(dayName(dly.time[best], best))} has ${why(dly, best)}. High ${temp(dly.temperature_2m_max[best])}, low ${temp(dly.temperature_2m_min[best])}.</p>
<p>Go early or late: sunrise ${clock(dly.sunrise[best])}, sunset ${clock(dly.sunset[best])}. Many anglers fish the first and last light.</p>
<div class="nm-days" role="list">${dly.time.map((t, i) => `<div role="listitem" class="${i === best ? 'best' : ''}"><b>${esc(i === 0 ? 'Today' : new Date(t + 'T12:00:00Z').toLocaleDateString('en-US', {timeZone: 'UTC', weekday: 'short'}))}</b><span>${wind(dly.wind_speed_10m_max[i])}</span><span>${dly.precipitation_sum[i] < .2 ? 'Dry' : rain(dly.precipitation_sum[i])}</span></div>`).join('')}</div>
<p class="nm-small">Castward picks the calmest, driest day in the Open-Meteo forecast for the place's map point. It does not predict fish. <a href="${esc(weatherUrl)}">Full weather</a>${pick.t ? ` · <a href="${esc(tidesUrl)}">Tides</a>` : ''}</p></section>`
      : `<section class="nm-box"><h2>When</h2><p>The forecast did not load. <a href="${esc(weatherUrl)}">Open the weather tool</a> for ${esc(pick.n)}.</p></section>`;
    const more = list.slice(1, 4);
    card.innerHTML = `<div class="nm-result">
<p class="nm-eyebrow">Your free fishing plan from ${esc(state.from.name)}</p>
<h2 class="nm-title" tabindex="-1">${esc(pick.n)}</h2>
${dly ? `<p class="nm-sub">Best day: <b>${esc(dayName(dly.time[best], best))}</b> · ${state.fish ? esc(state.fish) + ' · ' : ''}about ${dist(pick.d)} away</p>` : ''}
<section class="nm-box"><h2>Where</h2><p><b>${esc(pick.n)}</b>${pick.r ? ' · ' + esc(pick.r) : ''}</p><p>About ${dist(pick.d)} from ${esc(state.from.name)} in a straight line${pick.p ? '. The map point marks a broad area' : ''}.</p>
${pick.s.length ? `<p class="nm-chips">${[...pick.s].sort((a, b) => (b === state.fish) - (a === state.fish)).map(s => `<span${s === state.fish ? ' class="on"' : ''}>${esc(s)}</span>`).join('')}</p>` : ''}
<a class="nm-cta" href="${esc(pick.u)}">Open the ${esc(pick.n)} guide →</a></section>
${when}
<section class="nm-box"><h2>What to bring</h2><ul class="nm-gear">${gear.map((g, i) => `<li${i >= 6 ? ' hidden' : ''}><b>${esc(g.n)}</b><span>${esc(g.w)}</span>${g.q ? `<a href="${esc(amazon(g.q))}" rel="sponsored nofollow noopener" target="_blank">See on Amazon ↗</a>` : '<em>Ask the local shop or guide</em>'}</li>`).join('')}</ul>${gear.length > 6 ? `<button type="button" class="nm-more" data-more>Show all ${gear.length} items</button>` : ''}
<p class="nm-small">As an Amazon Associate, Castward earns from qualifying purchases. Prices are on Amazon. Bring what you already own first.</p></section>
<section class="nm-box"><h2>Next steps</h2><ul class="nm-next">
<li><a href="${esc(pick.l)}">Check the fishing licence${pick.r ? ' for ' + esc(pick.r.split(', ')[0]) : ''}</a></li>
<li><a href="${esc(pick.u)}">Read the full ${esc(pick.n)} guide</a></li>
${more.map(p => `<li><a href="${esc(p.u)}">Or try ${esc(p.n)}</a> <span>about ${dist(p.d)}</span></li>`).join('')}
</ul></section>
<div class="nm-again"><button type="button" data-restart>Start again</button><button type="button" data-change>Change the fish</button></div>
</div>`;
    card.querySelector('[data-restart]').onclick = () => { history.replaceState(null, '', location.pathname); state = {}; show('where'); };
    root.classList.add('nm-going');
    card.querySelector('[data-change]').onclick = () => show('fish');
    card.querySelector('[data-more]')?.addEventListener('click', e => { card.querySelectorAll('.nm-gear li[hidden]').forEach(li => li.hidden = false); e.currentTarget.remove(); });
    card.querySelector('.nm-title')?.focus?.();
    const top = card.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * .5) card.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'start'});
  }

  function show(step) {
    if (step === 'where') return whereStep();
    if (step === 'range') return rangeStep();
    if (step === 'water') return waterStep();
    if (step === 'fish') return fishStep();
  }

  // A shared link opens the result directly.
  const q = new URLSearchParams(location.search), lat = Number(q.get('lat')), lon = Number(q.get('lon'));
  if (q.has('lat') && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    loadData().then(() => {
      state = {from: {lat, lon, name: (q.get('from') || 'your start').slice(0, 80)}, range: q.get('r') === 'any' || !q.get('r') ? Infinity : Number(q.get('r')) || Infinity, water: q.get('w') || null, fish: q.get('f') || null};
      if (!matches().length) { state.fish = null; }
      if (!matches().length) { state.water = null; }
      if (!matches().length) { state.range = Infinity; }
      result();
    }).catch(() => whereStep());
  } else whereStep();
})();
