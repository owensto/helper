/* Forecast data stays in the browser; all coordinates use explicit lat/lon. */
(function (root) {
  'use strict';
  const WEATHER = 'https://api.open-meteo.com/v1/forecast';
  const MARINE = 'https://marine-api.open-meteo.com/v1/marine';
  const NOAA = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
  const STATIONS = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json';
  const stationKey = 'castward.tide-stations.v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (value, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '—';
  function coords(lat, lon) {
    return lat !== null && lon !== null && String(lat).trim() !== '' && String(lon).trim() !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lon)) <= 180;
  }
  async function json(url, params = {}) {
    const response = await fetch(url + '?' + new URLSearchParams(params), {signal: AbortSignal.timeout(18000)});
    if (!response.ok) throw Error('The forecast service is unavailable. Please try again.');
    const data = await response.json();
    if (data.error) throw Error('The forecast service has no data for this request.');
    return data;
  }
  const distance = (a, b) => {
    const r = Math.PI / 180, dlat = (b.lat - a.lat) * r, dlon = (b.lon - a.lon) * r;
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dlon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
  };
  function localDate(time, zone) {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date(time));
    const get = key => parts.find(p => p.type === key).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function wallNow(zone) {
    return localDate(Date.now(), zone) + ' ' + new Intl.DateTimeFormat('en-GB', {timeZone:zone, hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(new Date());
  }
  const timeLabel = (seconds, zone) => Number.isFinite(seconds) ? new Intl.DateTimeFormat('en-US', {timeZone:zone, hour:'numeric', minute:'2-digit'}).format(new Date(seconds * 1000)) : 'Unavailable';
  const dayLabel = (seconds, zone) => new Intl.DateTimeFormat('en-US', {timeZone:zone, weekday:'short', month:'short', day:'numeric'}).format(new Date(seconds * 1000));
  const currentIndex = times => Math.max(0, times.findLastIndex(t => t <= Date.now() / 1000));
  function trend(values, i) {
    if (!Number.isInteger(i) || i < 3 || !Number.isFinite(values[i]) || !Number.isFinite(values[i - 3])) return 'Trend unavailable';
    const change = values[i] - values[i - 3];
    return `${change < -0.5 ? 'Falling' : change > 0.5 ? 'Rising' : 'Steady'} (${change > 0 ? '+' : ''}${change.toFixed(1)} hPa / 3h)`;
  }
  async function forecast(place, units = 'us', days = 7) {
    const result = await json(WEATHER, {latitude:place.lat, longitude:place.lon, timezone:'auto', timeformat:'unixtime', forecast_days:days, past_days:1,
      temperature_unit:units === 'us' ? 'fahrenheit' : 'celsius', wind_speed_unit:units === 'us' ? 'mph' : 'kmh', precipitation_unit:units === 'us' ? 'inch' : 'mm',
      current:'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl',
      hourly:'apparent_temperature,weather_code,temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,cloud_cover,pressure_msl',
      daily:'temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,precipitation_sum,sunrise,sunset'});
    // Remove yesterday from daily cards; retain its hourly pressure samples for the trend.
    for (const key of Object.keys(result.daily)) result.daily[key] = result.daily[key].slice(1);
    return result;
  }
  async function marine(place, days = 7) {
    const result = await json(MARINE, {latitude:place.lat, longitude:place.lon, timezone:'auto', timeformat:'unixtime', forecast_days:days,
      cell_selection:'sea', hourly:'swell_wave_period,wave_height,wave_period,sea_surface_temperature,sea_level_height_msl'});
    if (distance(place, {lat:result.latitude, lon:result.longitude}) > 60) throw Error('No nearby marine model cell. Choose a coastal location.');
    return result;
  }
  let stationsPromise;
  function stations() {
    if (!stationsPromise) stationsPromise = (async () => {
      try {
        const cached = JSON.parse(sessionStorage.getItem(stationKey));
        if (Array.isArray(cached) && cached.length && cached.every(s => /^[0-9]{7}$/.test(s.id) && coords(s.lat, s.lng))) return cached;
      } catch (_) { /* Storage is optional. */ }
      const data = await json(STATIONS, {type:'tidepredictions'});
      const list = (data.stations || []).filter(s => /^[0-9]{7}$/.test(s.id) && coords(s.lat, s.lng));
      if (!list.length) throw Error('The NOAA station list is unavailable.');
      try { sessionStorage.setItem(stationKey, JSON.stringify(list)); } catch (_) { /* Storage is optional. */ }
      return list;
    })().catch(error => { stationsPromise = undefined; throw error; });
    return stationsPromise;
  }
  function nearestStation(list, place) {
    return list.map(s => ({...s, distance:distance(place, {lat:Number(s.lat), lon:Number(s.lng)})})).sort((a, b) => a.distance - b.distance)[0];
  }
  async function predictions(station, date, units, interval) {
    const result = await json(NOAA, {product:'predictions', application:'Castward', station:station.id,
      begin_date:date.replaceAll('-', ''), range:72, datum:'MLLW', time_zone:'lst_ldt', units:units === 'us' ? 'english' : 'metric', interval, format:'json'});
    if (!result.predictions?.length) throw Error('No tide predictions are available at this station.');
    const end = new Date(Date.parse(date+'T00:00:00Z') + 3 * 86400000).toISOString().slice(0, 10);
    return result.predictions.filter(p => p.t.slice(0, 10) < end && p.v !== null && p.v !== '' && Number.isFinite(Number(p.v))).map(p => ({t:p.t, v:Number(p.v), type:p.type}));
  }
  function extremes(points) {
    return points.filter((p, i) => i && i < points.length - 1 && ((p.v > points[i - 1].v && p.v >= points[i + 1].v) || (p.v < points[i - 1].v && p.v <= points[i + 1].v)))
      .map(p => ({...p, type:p.v > points[points.indexOf(p) - 1].v ? 'H' : 'L'}));
  }
  async function tides(place, units = 'us') {
    // A NOAA outage must remain distinguishable from a location outside coverage.
    const list = await stations();
    const station = nearestStation(list, place);
    if (station && station.distance <= 100) {
      const sun = await forecast({lat:station.lat, lon:station.lng}, units, 3);
      const date = localDate(Date.now(), sun.timezone);
      const results = await Promise.allSettled([predictions(station, date, units, 'hilo'), predictions(station, date, units, '6')]);
      if (results[0].status === 'rejected') throw results[0].reason;
      let curve = results[1].status === 'fulfilled' ? results[1].value : [], curveStation = station, curveEvents = results[0].value;
      // Subordinate stations provide high/low only. Use their named reference for a separate curve.
      if (!curve.length && station.reference_id) {
        const reference = list.find(s => s.id === station.reference_id);
        if (reference) {
          const fallback = await Promise.allSettled([predictions(reference, date, units, '6'), predictions(reference, date, units, 'hilo')]);
          if (fallback.every(r => r.status === 'fulfilled')) {
            curve = fallback[0].value; curveEvents = fallback[1].value; curveStation = reference;
          }
        }
      }
      return {model:false, station, curveStation, curveEvents, curve, events:results[0].value, sun, zone:sun.timezone, unit:units === 'us' ? 'ft' : 'm'};
    }
    const [m, sun] = await Promise.all([marine(place, 3), forecast(place, units, 3)]);
    const curve = m.hourly.time.map((t, i) => ({t:localDate(t * 1000, m.timezone) + ' ' + new Intl.DateTimeFormat('en-GB', {timeZone:m.timezone, hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(new Date(t * 1000)), v:m.hourly.sea_level_height_msl[i]}))
      .filter(p => Number.isFinite(p.v)).map(p => ({...p, v:p.v * (units === 'us' ? 3.28084 : 1)}));
    if (curve.length < 3) throw Error('No marine sea-level estimate is available here. Choose a coastal location.');
    const events = extremes(curve);
    return {model:true, curve, curveEvents:events, events, sun, zone:m.timezone, unit:units === 'us' ? 'ft' : 'm'};
  }
  function sunText(data) {
    return `Today: sunrise ${timeLabel(data.daily.sunrise[0], data.timezone)} · sunset ${timeLabel(data.daily.sunset[0], data.timezone)} (${esc(data.timezone)})`;
  }
  function condition(code, cloud = 0) {
    if (code >= 95) return ['Storms', 'storm'];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['Snow', 'snow'];
    if (code >= 51) return ['Rain', 'rain'];
    if (code >= 45) return ['Fog', 'cloud'];
    return code === 0 || (code == null && cloud < 20) ? ['Clear skies', 'sun'] : ['Cloud cover', 'cloud'];
  }
  function icon(kind) {
    return `<svg class="weather-icon ${kind}" viewBox="0 0 80 80" aria-hidden="true"><g class="sun-rays" fill="none" stroke="currentColor" stroke-width="2"><circle cx="35" cy="32" r="13"/>${Array.from({length:8},(_,i)=>`<path d="M35 8V2" transform="rotate(${i*45} 35 32)"/>`).join('')}</g>${kind !== 'sun' ? '<path d="M22 56C5 55 8 35 22 35C23 16 52 16 55 36C74 31 80 56 60 56Z" fill="var(--cloud-fill,#e9ece0)" stroke="currentColor" stroke-width="2"/>' : ''}${['rain','storm','snow'].includes(kind)?'<path class="rain-drops" d="M26 65l-4 8m20-8-4 8m20-8-4 8" stroke="currentColor" stroke-width="3"/>':''}</svg>`;
  }
  function arrow(degrees) { return Number.isFinite(degrees) ? `<span class="wind-arrow" style="transform:rotate(${degrees+180}deg)" aria-hidden="true">↑</span>` : '—'; }
  function moon(time=Date.now()) {
    const cycle=29.530588853, age=((time-Date.UTC(2000,0,6,18,14))/86400000%cycle+cycle)%cycle, phase=age/cycle;
    return {name:['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'][Math.round(phase*8)%8], light:Math.round((1-Math.cos(phase*2*Math.PI))*50), phase};
  }
  function moonIcon(phase) {
    const p=phase<=.5?phase:1-phase,rx=Math.abs(24*Math.cos(p*2*Math.PI));
    return `<svg class="moon-disc" viewBox="-30 -30 60 60" aria-hidden="true"><circle r="25" fill="#28483c"/><path d="M0 -24 A24 24 0 0 1 0 24 A${rx} 24 0 0 ${p<.25?0:1} 0 -24Z" fill="#e4ecd1" transform="scale(${phase<=.5?1:-1} 1)"/></svg>`;
  }
  function outlook(pressure, wind, rain) {
    if (![pressure,wind,rain].every(Number.isFinite)) return {score:null,label:'Data incomplete'};
    const score=Math.max(0,Math.min(100,50+(Math.abs(pressure)<=0.5?20:pressure<0?10:0)+(wind<=15?25:wind<=25?10:-15)+(rain<=1?5:rain<=5?0:-15)));
    return {score,label:score>=80?'Promising':score>=55?'Worth a look':'Pick your window'};
  }
  function today(data, units, name='') {
    const h=data.hourly, i=currentIndex(h.time), c=data.current||{}, us=units==='us', unit=us?'°F':'°C';
    const get=key=>c[key]??h[key]?.[i], state=condition(get('weather_code'),h.cloud_cover[i]), change=trend(h.pressure_msl,i);
    return `<div class="forecast-hero"><div class="forecast-hero-top"><span class="eyebrow">ON THE WATER / RIGHT NOW</span>${name?'<button type="button" data-save-place>♡ Save place</button>':''}</div>${name?'<h2>'+esc(name)+'</h2>':''}<div class="conditions-now"><strong>${num(get('temperature_2m'))}${unit}</strong>${icon(state[1])}<div>${state[0]}<small>Feels like ${num(get('apparent_temperature'))}${unit}</small></div></div><div class="forecast-metrics"><div><small>WIND · FROM ${num(get('wind_direction_10m'))}°</small><strong>${arrow(get('wind_direction_10m'))} ${num(get('wind_speed_10m'))} <em>${us?'mph':'km/h'}</em></strong><span>Gusts ${num(get('wind_gusts_10m'))} ${us?'mph':'km/h'}</span></div><div><small>PRESSURE</small><strong>${change.startsWith('Rising')?'↗':change.startsWith('Falling')?'↘':'→'} ${num(get('pressure_msl'))} <em>hPa</em></strong><span>${change}</span></div><div><small>SUNRISE & SUNSET</small><strong>${timeLabel(data.daily.sunrise[0],data.timezone)}</strong><span>Sunset ${timeLabel(data.daily.sunset[0],data.timezone)}</span></div></div><small class="forecast-scene-note">Illustrative coastal scene · ${esc(data.timezone)}</small></div>`;
  }
  function hourlyHTML(data,units,day=0) {
    const h=data.hourly,start=data.daily.time[day],indices=h.time.map((t,i)=>t>=start&&t<start+86400?i:-1).filter(i=>i>=0), valid=indices.filter(i=>Number.isFinite(h.temperature_2m[i]));
    if(!valid.length)return '<p>Hourly data are unavailable for this day.</p>';
    const min=Math.min(...valid.map(i=>h.temperature_2m[i]))-3,max=Math.max(...valid.map(i=>h.temperature_2m[i]))+3;
    const x=j=>35+j/Math.max(1,indices.length-1)*930,y=v=>150-(v-min)/(max-min)*100;
    const line=valid.map((i,j)=>`${j?'L':'M'}${x(indices.indexOf(i))},${y(h.temperature_2m[i])}`).join(' '),rainMax=Math.max(units==='us'?.1:2,...indices.map(i=>h.precipitation[i]||0));
    return `<div class="hour-chart"><div class="hour-readout" data-hour-readout role="status"></div><div class="hour-chart-scroll"><svg viewBox="0 0 1000 240" role="img" aria-label="Hourly temperature line, rain bars and wind direction arrows"><defs><linearGradient id="temp-fill" x2="0" y2="1"><stop stop-color="#b5cbb3" stop-opacity=".5"/><stop offset="1" stop-color="#b5cbb3" stop-opacity="0"/></linearGradient></defs>${[50,100,150].map(y=>`<path d="M35 ${y}H965" stroke="#dce2d6" stroke-dasharray="3 5"/>`).join('')}<path d="${line} L965 175 L35 175Z" fill="url(#temp-fill)"/><path d="${line}" fill="none" stroke="#285b47" stroke-width="3"/>${indices.map((i,j)=>`<rect x="${x(j)-8}" y="${185-(h.precipitation[i]||0)/rainMax*40}" width="16" height="${(h.precipitation[i]||0)/rainMax*40}" rx="3" fill="#7daab8"/>${j%3===0?`<text x="${x(j)}" y="28" text-anchor="middle">${num(h.temperature_2m[i])}°</text><text x="${x(j)}" y="208" text-anchor="middle">${esc(timeLabel(h.time[i],data.timezone))}</text><text transform="translate(${x(j)} 230) rotate(${(h.wind_direction_10m[i]||0)+180})" text-anchor="middle">↑</text>`:''}`).join('')}<path data-hour-marker d="M35 36V185" stroke="#b16c3a" stroke-width="2"/><circle data-hour-dot cx="35" cy="${y(h.temperature_2m[indices[0]])}" r="5" fill="#b16c3a"/></svg></div><label class="hour-slider-label">Slide to check an hour<input data-hour-slider type="range" min="0" max="${indices.length-1}" value="0" aria-label="Forecast hour"></label><p class="chart-key"><span>— Temperature</span><span>▥ Rain (${units==='us'?'in':'mm'})</span><span>↑ Wind direction</span></p></div>`;
  }
  function bindHours(target,data,units,day=0) {
    const slider=target.querySelector('[data-hour-slider]');if(!slider)return;
    const h=data.hourly,indices=h.time.map((t,i)=>t>=data.daily.time[day]&&t<data.daily.time[day]+86400?i:-1).filter(i=>i>=0), valid=indices.map(i=>h.temperature_2m[i]).filter(Number.isFinite),min=Math.min(...valid)-3,max=Math.max(...valid)+3;
    const update=()=>{const j=Number(slider.value),i=indices[j],x=35+j/Math.max(1,indices.length-1)*930;target.querySelector('[data-hour-readout]').innerHTML=`<strong>${timeLabel(h.time[i],data.timezone)} · ${num(h.temperature_2m[i])}°${units==='us'?'F':'C'}</strong><span>Rain ${num(h.precipitation[i],2)} ${units==='us'?'in':'mm'} · Wind ${num(h.wind_speed_10m[i])} ${units==='us'?'mph':'km/h'} · Gusts ${num(h.wind_gusts_10m[i])}</span>`;slider.setAttribute('aria-valuetext',target.querySelector('[data-hour-readout]').textContent);target.querySelector('[data-hour-marker]').setAttribute('d',`M${x} 36V185`);const dot=target.querySelector('[data-hour-dot]');dot.setAttribute('cx',x);dot.setAttribute('cy',Number.isFinite(h.temperature_2m[i])?150-(h.temperature_2m[i]-min)/(max-min)*100:175);};slider.oninput=update;update();
    const svg=target.querySelector('svg');let down=false;const scrub=e=>{const b=svg.getBoundingClientRect();slider.value=Math.round(Math.max(0,Math.min(1,((e.clientX-b.left)/b.width*1000-35)/930))*(indices.length-1));update();};svg.onpointerdown=e=>{down=true;svg.setPointerCapture(e.pointerId);scrub(e);};svg.onpointermove=e=>{if(down||e.pointerType==='mouse')scrub(e);};svg.onpointerup=svg.onpointercancel=()=>down=false;
  }
  function weatherHTML(data, units, name) {
    const d=data.daily,h=data.hourly,us=units==='us',m=moon();
    return today(data,units,name)+`<div class="forecast-section-head"><div><span class="eyebrow">MAKE A LITTLE ROOM FOR A GOOD DAY</span><h3>Fishing outlook</h3></div><span>Next 7 days · our rule-of-thumb</span></div><div class="forecast-days">`+d.time.map((t,i)=>{const noon=h.time.findIndex(v=>v>=t+43200),change=Number.isFinite(h.pressure_msl[noon])&&Number.isFinite(h.pressure_msl[noon-3])?h.pressure_msl[noon]-h.pressure_msl[noon-3]:null,o=outlook(change,Number.isFinite(d.wind_speed_10m_max[i])?d.wind_speed_10m_max[i]*(us?1.609344:1):null,Number.isFinite(d.precipitation_sum[i])?d.precipitation_sum[i]*(us?25.4:1):null),state=condition(h.weather_code?.[noon],h.cloud_cover[noon]);return `<article><button type="button" data-forecast-day="${i}" aria-pressed="${i===0}"><h4>${i===0?'Today':esc(dayLabel(t,data.timezone).split(',')[0])}</h4><small>${esc(dayLabel(t,data.timezone).split(',').slice(1).join(','))}</small>${icon(state[1])}<p class="day-temp">${num(d.temperature_2m_max[i])}° <span>${num(d.temperature_2m_min[i])}°</span></p><strong class="outlook-score">${o.score??'—'}<small>/100</small></strong><span class="outlook-label">${o.label}</span><span class="score-meter"><i style="width:${o.score||0}%"></i></span><small>${num(d.wind_speed_10m_max[i])} ${us?'mph':'km/h'} · ${num(d.precipitation_sum[i],us?2:1)} ${us?'in':'mm'}</small></button></article>`;}).join('')+`</div><details class="outlook-explainer"><summary>How we read the weather ↗</summary><p>Our rule-of-thumb starts at 50. A steady three-hour noon pressure trend adds 20; falling pressure adds 10. Wind up to 15 km/h adds 25; up to 25 adds 10; stronger wind subtracts 15. Rain up to 1 mm adds 5; over 5 mm subtracts 15. Scores stay between 0 and 100. Missing data means no score.</p><p>This is a simple planning cue, not a catch prediction or a safety rating. It uses no solunar tables. Conditions vary by water and species.</p></details><div class="forecast-section-head"><div><span class="eyebrow">FIND YOUR WINDOW</span><h3>Hour by hour</h3></div><span data-hour-day>${esc(dayLabel(d.time[0],data.timezone))} · ${esc(data.timezone)}</span></div><div data-hour-chart>${hourlyHTML(data,units)}</div><div class="water-moon-grid"><section class="moon-panel"><span class="eyebrow">AFTER THE SUN GOES DOWN</span><div class="moon-copy">${moonIcon(m.phase)}<div><h3>${m.name}</h3><p>${m.light}% illuminated</p></div></div><small>Approximate phase, calculated here. Not used in the outlook score.</small></section><section data-marine-output><span class="eyebrow">ON COASTAL WATER</span><p>Check coastal data…</p></section></div>`;
  }
  function marineHTML(data, units) {
    const h=data.hourly,i=currentIndex(h.time),us=units==='us',temp=h.sea_surface_temperature[i];
    return `<span class="eyebrow">ON COASTAL WATER</span><h3>A look below the surface.</h3><div class="marine-metrics"><div><small>Waves</small><strong>${num(Number.isFinite(h.wave_height[i])?h.wave_height[i]*(us?3.28084:1):null,1)} <em>${us?'ft':'m'}</em></strong></div><div><small>Swell period</small><strong>${num(h.swell_wave_period?.[i],1)} <em>s</em></strong></div><div><small>Water temp</small><strong>${num(Number.isFinite(temp)?(us?temp*9/5+32:temp):null)}<em>°${us?'F':'C'}</em></strong></div></div><small>Open-Meteo marine model · nearest sea cell</small>`;
  }
  function curveHTML(points, events, unit) {
    if (!points.length) return '<p>The six-minute curve is unavailable for this station. Use the high/low table below.</p>';
    const dates = [...new Set(points.map(p => p.t.slice(0, 10)))].slice(0, 3);
    return dates.map(date => {
      const day = points.filter(p => p.t.startsWith(date)), marks = events.filter(p => p.t.startsWith(date));
      const min = Math.min(...day.map(p => p.v)), max = Math.max(...day.map(p => p.v)), span = max - min || 1;
      const x = p => 55 + (Number(p.t.slice(11, 13)) * 60 + Number(p.t.slice(14, 16))) / 1440 * 610;
      const y = p => 165 - (p.v - min) / span * 100;
      const path = day.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
      return `<figure class="tide-chart"><figcaption>${esc(date)} · ${unit}</figcaption><svg viewBox="0 0 720 220" role="img" aria-label="Tide curve for ${esc(date)}. High and low times are in the table below."><path d="M55 55V180H665" fill="none" stroke="currentColor" opacity=".3"/><text x="5" y="70">${num(max, 1)}</text><text x="5" y="165">${num(min, 1)}</text><path d="${path}" fill="none" stroke="#26776d" stroke-width="3"/>${marks.map(p => `<circle cx="${x(p).toFixed(1)}" cy="${y(p).toFixed(1)}" r="4" fill="#193e32"/><text x="${Math.max(85, Math.min(630, x(p))).toFixed(1)}" y="${p.type === 'H' ? 36 : 196}" text-anchor="middle">${p.type === 'H' ? 'High' : 'Low'} ${esc(p.t.slice(11))}</text>`).join('')}<text x="55" y="218">00:00</text><text x="340" y="218">12:00</text><text x="625" y="218">24:00</text></svg></figure>`;
    }).join('');
  }
  function eventsHTML(events, unit) {
    return '<div class="forecast-hours"><table><caption>High and low times</caption><thead><tr><th>Local date and time</th><th>Tide</th><th>Height '+unit+'</th></tr></thead><tbody>'+events.map(p => `<tr><td>${esc(p.t)}</td><td>${p.type === 'H' ? 'High' : 'Low'}</td><td>${num(p.v, 2)}</td></tr>`).join('')+'</tbody></table></div>';
  }
  function tidesHTML(data) {
    const source = data.model ? '<h3>Modelled sea-level estimate</h3><p>No NOAA prediction station lies within 100 km. Open-Meteo heights use mean sea level (MSL), not MLLW. Highs and lows are approximate hourly model extrema. This estimate is not suitable for navigation.</p>' : `<h3>NOAA: ${esc(data.station.name)}</h3><p>Station ${esc(data.station.id)} · ${num(data.station.distance, 1)} km from this location · heights above MLLW. Times use station local time (LST/LDT). The nearest station may use a different inlet or waterway.</p>`;
    const reference = !data.model && data.curveStation.id !== data.station.id ? `<p>Six-minute curve: reference station ${esc(data.curveStation.name)} (${esc(data.curveStation.id)}). Its times and heights differ from the nearest station above.</p>` : '';
    const now=wallNow(data.zone), upcoming=['H','L'].map(type=>data.events.find(p=>p.type===type&&p.t>now));
    const at=data.curve.findIndex(p=>p.t>=now), delta=at>0?data.curve[at].v-data.curve[at-1].v:null;
    const direction=delta===null?'Tide outlook':Math.abs(delta)<.005?'Near the turn':delta>0?'Water on the rise.':'Water on the ebb.';
    const overview=`<section class="forecast-hero tide-overview"><span class="eyebrow">A LITTLE RHYTHM TO YOUR DAY</span><h3>${direction}</h3><div class="forecast-metrics">${upcoming.map((p,i)=>`<div><small>NEXT ${i?'LOW ↓':'HIGH ↑'}</small><strong>${p?num(p.v,1)+' <em>'+data.unit+'</em>':'—'}</strong><span>${p?esc(p.t):'No prediction available'}</span></div>`).join('')}<div><small>SUNRISE</small><strong>${timeLabel(data.sun.daily.sunrise[0],data.zone)}</strong><span>Sunset ${timeLabel(data.sun.daily.sunset[0],data.zone)}</span></div></div><small class="forecast-scene-note">${data.model?'Model estimate · MSL':'NOAA prediction · MLLW'} · ${esc(data.zone)} · Illustrative coastal scene</small></section>`;
    return overview + '<div class="tide-source-note">'+source + `<p>${sunText(data.sun)}</p></div>` + reference + curveHTML(data.curve, data.curveEvents, data.unit) + (!data.model && data.curveStation.id !== data.station.id ? '<h3>Nearest station: '+esc(data.station.name)+'</h3>' : '') + eventsHTML(data.events, data.unit);
  }
  async function loadCard(card) {
    let unit='us';try{if(localStorage.getItem('castward.units')==='metric')unit='metric';}catch{}
    const place = {lat:Number(card.dataset.lat), lon:Number(card.dataset.lon)}, weather = card.querySelector('[data-card-weather]');
    weather.textContent = 'Load forecast…';
    const jobs = [forecast(place, unit, 1).then(d => { weather.innerHTML = today(d, unit) + '<small>Updated '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+' · Open-Meteo forecast</small>'; }).catch(() => { weather.textContent = 'Weather is unavailable. Open the full tool to try again.'; })];
    const target = card.querySelector('[data-card-tides]');
    if (target) {
      target.textContent = 'Load tides…';
      jobs.push(tides(place,unit).then(d => {
        const now = wallNow(d.zone), next = ['H', 'L'].map(type => d.events.find(p => p.type === type && p.t > now));
        target.innerHTML = '<p>'+next.map((p, i) => p ? `Next ${i ? 'low' : 'high'}: ${esc(p.t)} (${num(p.v, 1)} ${d.unit})` : `Next ${i ? 'low' : 'high'} unavailable`).join(' · ')+'</p><small>'+ (d.model ? 'Modelled estimate · MSL · approximate times' : 'NOAA '+esc(d.station.name)+' · MLLW · '+num(d.station.distance, 1)+' km away')+' · '+esc(d.zone)+'</small>';
      }).catch(() => { target.textContent = 'Tides are unavailable. Open the full tool to try again.'; }));
    }
    await Promise.allSettled(jobs);
    if (!card.dataset.refresh) { card.dataset.refresh='true'; setInterval(() => { if (!document.hidden) loadCard(card); },900000); }
  }
  function initTool(tool) {
    const status = tool.querySelector('[data-conditions-status]'), output = tool.querySelector('[data-conditions-output]'), results = tool.querySelector('[data-place-results]');
    const units = tool.querySelector('#conditions-units');
    let place, revision = 0, searchRevision = 0;
    const read=(key)=>{try{const list=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(list)?list.filter(p=>coords(p.lat,p.lon)&&typeof p.name==='string').slice(0,6):[];}catch{return [];}};
    const write=(key,list)=>{try{localStorage.setItem(key,JSON.stringify(list.slice(0,6)));}catch{}};
    const same=(a,b)=>a.lat===b.lat&&a.lon===b.lon;
    const recentKey='castward.places',savedKey='castward.saved-places';
    function placeButtons(){const target=tool.querySelector('[data-places]');target.replaceChildren();for(const [label,key] of [['Saved',savedKey],['Recent',recentKey]]){const list=read(key).filter(p=>key!==recentKey||!read(savedKey).some(s=>same(s,p)));if(!list.length)continue;const caption=document.createElement('span');caption.textContent=label;target.append(caption);list.forEach(p=>{const b=document.createElement('button');b.type='button';b.textContent=p.name;b.onclick=()=>show(p);target.append(b);});} }
    try{units.value=localStorage.getItem('castward.units')==='metric'?'metric':'us';}catch{}
    placeButtons();
    tool.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>show(b.dataset.example==='keys'?{lat:24.55,lon:-81.8,name:'Key West, Florida'}:{lat:45.68,lon:-111.04,name:'Bozeman, Montana'}));
    setInterval(()=>{if(place&&!document.hidden)show(place,true);},900000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&place&&Date.now()-Number(tool.dataset.updated||0)>900000)show(place,true);});
    async function show(next, refresh=false) {
      place = next;
      const run = ++revision, unit = units.value;
      const query = new URLSearchParams({lat:place.lat, lon:place.lon, name:place.name});
      history.replaceState(null, '', location.pathname+'?'+query);
      tool.querySelector('[data-other-tool]').href = '/tools/'+(tool.dataset.conditionsTool === 'weather' ? 'tides' : 'weather')+'/?'+query;
      if(!refresh)output.innerHTML='<div class="forecast-skeleton" aria-hidden="true"><i></i><i></i><i></i></div>'; output.setAttribute('aria-busy','true'); status.textContent = 'Load forecast for '+place.name+'…';
      write(recentKey,[next,...read(recentKey).filter(p=>!same(p,next))]);placeButtons();
      try {
        if (tool.dataset.conditionsTool === 'weather') {
          const data = await forecast(next, unit);
          if (run !== revision) return;
          output.innerHTML = weatherHTML(data, unit, next.name);
          bindHours(output.querySelector('[data-hour-chart]'),data,unit);
          output.querySelectorAll('[data-forecast-day]').forEach(b=>b.onclick=()=>{const day=Number(b.dataset.forecastDay);output.querySelectorAll('[data-forecast-day]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));output.querySelector('[data-hour-day]').textContent=dayLabel(data.daily.time[day],data.timezone)+' · '+data.timezone;output.querySelector('[data-hour-chart]').innerHTML=hourlyHTML(data,unit,day);bindHours(output.querySelector('[data-hour-chart]'),data,unit,day);});
          const save=output.querySelector('[data-save-place]');const saved=()=>read(savedKey).some(p=>same(p,next));const updateSave=()=>{save.textContent=saved()?'♥ Saved place':'♡ Save place';save.setAttribute('aria-pressed',String(saved()));};updateSave();save.onclick=()=>{write(savedKey,saved()?read(savedKey).filter(p=>!same(p,next)):[next,...read(savedKey)]);updateSave();placeButtons();};
          status.textContent = 'Updated '+timeLabel(Date.now()/1000,data.timezone)+' · Local time · Refreshes every 15 minutes';output.removeAttribute('aria-busy');tool.dataset.updated=Date.now();
          try {
            const m = await marine(next);
            if (run === revision) output.querySelector('[data-marine-output]').innerHTML = marineHTML(m, unit);
          } catch (_) { if (run === revision) output.querySelector('[data-marine-output]').textContent = 'Marine data are unavailable here. Marine forecasts cover coastal and open water.'; }
        } else {
          const data = await tides(next, unit);
          if (run !== revision) return;
          output.innerHTML = '<h2>'+esc(next.name)+'</h2>'+tidesHTML(data);
          status.textContent = 'Updated '+timeLabel(Date.now()/1000,data.zone)+' · Local time · Refreshes every 15 minutes';output.removeAttribute('aria-busy');tool.dataset.updated=Date.now();
        }
      } catch (error) {
        if (run !== revision) return;
        output.removeAttribute('aria-busy');if(!refresh)output.replaceChildren();status.textContent = (refresh?'Refresh failed. The previous forecast may be out of date. ':'')+error.message;
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'btn outline'; retry.textContent = 'Try again'; retry.onclick = () => show(place); output.append(retry);
      }
    }
    tool.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); const run = ++searchRevision; results.replaceChildren();
      status.textContent = 'Search places…';
      try {
        const data = await json('https://geocoding-api.open-meteo.com/v1/search', {name:tool.querySelector('#place-search').value.trim(), count:8, language:'en', format:'json'});
        if (run !== searchRevision) return;
        status.textContent = data.results?.length ? 'Choose a place.' : 'No places found. Try a nearby town.';
        for (const p of data.results || []) {
          const button = document.createElement('button'); button.type = 'button';
          const name = [p.name, p.admin1, p.country].filter(Boolean).join(', '); button.textContent = name;
          button.onclick = () => { ++searchRevision; results.replaceChildren(); show({lat:p.latitude, lon:p.longitude, name}); };
          results.append(button);
        }
      } catch (_) { if (run === searchRevision) status.textContent = 'Place search is unavailable. Please try again.'; }
    });
    tool.querySelector('[data-locate]').addEventListener('click', () => {
      if (!navigator.geolocation) { status.textContent = 'This browser has no location service.'; return; }
      status.textContent = 'Wait for location permission…';
      navigator.geolocation.getCurrentPosition(p => show({lat:p.coords.latitude, lon:p.coords.longitude, name:'My location'}), () => { status.textContent = 'Location is unavailable or permission was refused. Search for a place.'; }, {timeout:12000, maximumAge:300000});
    });
    units.addEventListener('change', () => {try{localStorage.setItem('castward.units',units.value);}catch{} if (place) show(place); });
    const params = new URLSearchParams(location.search);
    if (coords(params.get('lat'), params.get('lon'))) show({lat:Number(params.get('lat')), lon:Number(params.get('lon')), name:(params.get('name') || 'Selected location').slice(0, 160)});
    else show(read(savedKey)[0] || read(recentKey)[0] || {lat:24.55,lon:-81.8,name:'Key West, Florida'});
  }
  const api = {coords, distance, nearestStation, trend, extremes, curveHTML, esc, forecast, tides, loadCard, stations, localDate, wallNow, outlook, moon, score:outlook, hourlyHTML};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CastwardConditions = api;
  if (typeof document !== 'undefined') document.querySelectorAll('[data-conditions-tool]').forEach(initTool);
})(typeof window !== 'undefined' ? window : globalThis);
