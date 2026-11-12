# Castward world map

The Python build inlines `world.svg` in the `/play/` page. The browser loads no map library and makes no map request.

The land data comes from Natural Earth (public domain) through [world-atlas](https://github.com/topojson/world-atlas). The SVG uses the Equal Earth projection, a graticule, and a coast glow.

The exact source URLs are:

- https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json
- https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js
- https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js
- https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js

The source files are local. Run `node scripts/generate_game_map.cjs` to refresh the SVG and projection metadata. This command does not need an npm install or network access. The library copyright headers remain in `scripts/vendor/`.

`scripts/game_career.py` projects each stop's longitude and latitude with the same Equal Earth coefficients, scale, and translation. The tests compare the Python points with the d3-geo reference points in `projection.json`.

The browser separates pins in screen pixels. A leader line retains each geographic anchor. On narrow maps, a region cluster opens the region's destinations. The destination selector remains available at every width.
