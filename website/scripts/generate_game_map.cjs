/* Refresh the checked-in map. The Python build needs no network or Node packages.
 * Sources: jsDelivr world-atlas@2.0.2, topojson-client@3.1.0,
 * d3-geo@3.1.1 and d3-array@3.2.4. Natural Earth land is public domain.
 */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
for (const name of ['d3-array-3.2.4.min.cjs', 'd3-geo-3.1.1.min.js', 'topojson-client-3.1.0.min.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'vendor', name), 'utf8'), context);
}
const {d3, topojson} = context;
const topology = JSON.parse(fs.readFileSync(path.join(root, 'src/maps/land-110m.json'), 'utf8'));
const projection = d3.geoEqualEarth().fitExtent([[24, 24], [936, 476]], {type:'Sphere'});
const draw = d3.geoPath(projection).digits(2);
const land = draw(topojson.feature(topology, topology.objects.land));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 500" aria-hidden="true" class="world-geography">
<defs>
 <path id="map-land-shape" d="${land}"/>
 <radialGradient id="map-ocean"><stop stop-color="#28594f"/><stop offset="1" stop-color="#102e2b"/></radialGradient>
 <linearGradient id="map-land" x2=".2" y2="1"><stop stop-color="#78917a"/><stop offset="1" stop-color="#3c6656"/></linearGradient>
 <filter id="map-coast-glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.5"/></filter>
</defs>
<path class="map-sphere" d="${draw({type:'Sphere'})}" fill="url(#map-ocean)" stroke="#9eb69a" stroke-opacity=".18"/>
<path d="${draw(d3.geoGraticule10())}" fill="none" stroke="#b3cdb6" stroke-width=".6" stroke-opacity=".14"/>
<use href="#map-land-shape" fill="none" stroke="#b4d5a4" stroke-width="3" opacity=".22" filter="url(#map-coast-glow)"/>
<use class="map-land" href="#map-land-shape" fill="url(#map-land)" stroke="#b7c4a0" stroke-opacity=".6" stroke-width=".55" stroke-linejoin="round"/>
</svg>`;
fs.writeFileSync(path.join(root, 'src/maps/world.svg'), svg);
fs.writeFileSync(path.join(root, 'src/maps/projection.json'), JSON.stringify({name:'Equal Earth',scale:projection.scale(),translate:projection.translate(),width:960,height:500,checks:[[-111,45],[10,63],[168,-45]].map(point=>({point,xy:projection(point)}))}, null, 2)+'\n');
console.log('Generated Equal Earth land, graticule and projection metadata.');
