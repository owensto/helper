"""Forecast pages and lightweight trip entry points share the atlas location contract."""
import hashlib
import json
from html import escape as E
from urllib.parse import urlencode

SAFETY = 'Tide and weather data are forecasts. Check official marine forecasts before you go.'


def asset(root, name):
    digest = hashlib.sha256((root/'public/assets'/name).read_bytes()).hexdigest()[:12]
    return '/assets/' + name + '?v=' + digest


def install(pages, root, add, trips, data):
    for tool in ('weather', 'tides'):
        title = tool.title()
        body = f'''<section class="wrap conditions-tool" data-conditions-tool="{tool}">
<span class="eyebrow">CASTWARD / FIELD TOOLS</span><h1>{"Know your water." if tool == "weather" else "Follow the tide."}</h1>
<p>{'Seven days of weather. Check the wind, rain and pressure before you choose your day.' if tool == 'weather' else 'Three days of tides. Find a nearby NOAA station or view a modelled sea-level estimate.'}</p>
<form class="conditions-search"><label for="place-search">Find a place</label><div class="conditions-controls"><input id="place-search" name="place" type="search" minlength="2" maxlength="100" required placeholder="City or coastal town" autocomplete="off"><button class="btn" type="submit">Search</button><button class="btn outline" type="button" data-locate>Use my location</button></div></form>
<div data-place-results aria-label="Place results"></div><div class="conditions-places" data-places></div>
<div class="conditions-controls"><label for="conditions-units">Units</label><select id="conditions-units"><option value="us">°F / mph / ft</option><option value="metric">°C / km/h / m</option></select><a data-other-tool href="/tools/{'tides' if tool == 'weather' else 'weather'}/">{'Tides' if tool == 'weather' else 'Weather'} ↗</a></div>
<p data-conditions-status role="status">Search for a place to see the forecast.</p><div data-conditions-output><div class="forecast-welcome"><span class="eyebrow">THE NEXT GOOD DAY STARTS HERE</span><h2>A little weather sense.<br>More time on the water.</h2><p>Choose your water above, or start with a favorite below.</p><div class="conditions-controls"><button type="button" data-example="keys">Key West ↗</button><button type="button" data-example="bozeman">Bozeman ↗</button></div><small>Illustrative coastal scene</small></div></div>
<p class="conditions-safety">{SAFETY}</p><p class="conditions-source">Data: <a href="https://open-meteo.com/">Open-Meteo</a> (CC BY 4.0), <a href="https://www.geonames.org/">GeoNames</a> and <a href="https://tidesandcurrents.noaa.gov/">NOAA CO-OPS</a>.</p>
<noscript><p>These tools need JavaScript to fetch current forecasts.</p></noscript></section>'''
        add('/tools/'+tool+'/', title+' | Castward', title+' forecasts for your next fishing trip.', body, 'tool')
        pages['/tools/'+tool+'/']['atlasAssets'] = '<script src="'+asset(root, 'conditions.js')+'" defer></script>'

    locations = json.loads((root/'src/atlas-locations.json').read_text())['locations']
    profiles = [(t['id'], t.get('canonicalPath', '/trips/'+t['id']+'/'), t.get('water') in ('Saltwater', 'Brackish')) for t in trips]
    profiles += [(d['id'], '/destinations/'+d['id']+'/', d['id'] in ('yakutat', 'florida-keys')) for d in data['destinations'] if not d.get('tripProfile')]
    for key, path, salt in profiles:
        loc = locations.get(key)
        if not loc or path not in pages or pages[path].get('redirectTo'):
            continue
        lat, lon = loc.get('lat'), loc.get('lon')
        if not isinstance(lat, (float, int)) or not isinstance(lon, (float, int)) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            continue
        name = loc.get('label', key)
        query = E(urlencode({'lat': lat, 'lon': lon, 'name': name}), quote=True)
        card = f'''<section class="wrap conditions-card" data-conditions-card data-lat="{lat}" data-lon="{lon}" data-salt="{str(salt).lower()}" data-name="{E(name, quote=True)}"><span class="eyebrow">BEFORE YOU GO</span><h2>Conditions</h2><p>{E(name)} · Approximate area reference</p><div data-card-weather><p>Today’s forecast loads when this card comes into view.</p></div>{'<div data-card-tides></div>' if salt else ''}<div class="conditions-controls"><a href="/tools/weather/?{query}">Full weather forecast ↗</a><a href="/tools/tides/?{query}">Tides ↗</a></div><p class="conditions-safety">{SAFETY}</p></section>'''
        # Place the small card after the page introduction, before the long guide.
        marker = '<div class="guide-layout'
        offset = pages[path]['body'].find(marker)
        if offset < 0:
            marker = '<section class="section'
            offset = pages[path]['body'].find(marker)
        body = pages[path]['body']
        pages[path]['body'] = body[:offset] + card + body[offset:] if offset >= 0 else body + card
