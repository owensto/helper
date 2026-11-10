"""One self-hosted photo catalog supplies image markup and public credits."""
import json
from pathlib import Path
from html import escape as E
PHOTOS={p['id']:p for p in json.loads((Path(__file__).resolve().parents[1]/'public/media/photos/credits.json').read_text())}
def photo(key, sizes='100vw', eager=False):
    p=PHOTOS[key];base='/media/photos/'+key
    srcset=', '.join(f'{base}-{w}.webp {w}w' for w in p['widths'])
    loading='loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    w,h=p['aspectRatio']
    return f'<img src="{base}-1280.webp" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" alt="{E(p["alt"],quote=True)}" {loading} decoding="async">'
def water_photo(t):
    habitats=' '.join(t.get('habitats',[])).lower()
    if 'ice' in habitats:return 'ice'
    if 'offshore' in habitats:return 'coast'
    if t.get('water')=='Saltwater':return 'inshore'
    if 'stream' in habitats or 'river' in habitats:return 'stream'
    return 'river'
def credits():
    return '<section class="section"><div class="wrap narrow prose"><h2>Photography credits</h2><p>These photographs show water environments. They do not identify the destinations in linked trip guides. All photographs are from Unsplash, with slight desaturation and responsive crops.</p><ul>'+''.join(f'<li><a href="{p["sourceUrl"]}">{E(p["photographer"])}</a> — {E(p["alt"])}</li>' for p in PHOTOS.values())+'</ul><p><a href="https://unsplash.com/license">Unsplash License</a> · <a href="/media/photos/credits.json">Photo credits as JSON</a></p></div></section>'
