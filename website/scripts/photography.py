"""The generated scene manifest supplies responsive images and attribution."""
import json
from pathlib import Path
from html import escape as E
ROOT=Path(__file__).resolve().parents[1]
MANIFEST=json.loads((ROOT/'public/media/scenes/manifest.json').read_text())
ALIASES={'coast':'offshore','inshore':'inshore-marsh','stream':'mountain-river','ice':'ice-lake','river':'reservoir'}
def photo(key, sizes='100vw', eager=False):
    key=ALIASES.get(key,key)
    rows=[p for p in MANIFEST if p['slot']==key and p['kind']=='web' and p['file'].endswith('.webp')]
    p=rows[-1]
    def srcset(slot,ext):
        return ', '.join('/media/scenes/'+Path(x['file']).name+f' {x["width"]}w' for x in MANIFEST if x['slot']==slot and x['kind']=='web' and x['file'].endswith(ext))
    loading='loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    mobile=(f'<source media="(max-width: 600px)" type="image/avif" srcset="{srcset("hero-mobile",".avif")}" sizes="100vw"><source media="(max-width: 600px)" srcset="{srcset("hero-mobile",".webp")}" sizes="100vw">' if key=='hero' else '')
    return f'<picture class="scene-picture">{mobile}<source type="image/avif" srcset="{srcset(key,".avif")}" sizes="{sizes}"><img src="/media/scenes/{Path(p["file"]).name}" srcset="{srcset(key,".webp")}" sizes="{sizes}" width="{p["width"]}" height="{p["height"]}" alt="{E(p["alt"],quote=True)}" {loading} decoding="async"></picture>'
def water_photo(t):
    if t.get('planId')=='US-NC-002':return 'mountain-river'
    if t.get('planId')=='US-GA-002':return 'reservoir'
    if t.get('planId')=='US-FL-001':return 'tropical-flats'
    habitats=' '.join(t.get('habitats',[])).lower()
    if 'ice' in habitats:return 'ice'
    if 'offshore' in habitats:return 'coast'
    if 'surf' in habitats:return 'surf-beach'
    if t.get('water')=='Saltwater':return 'inshore'
    if 'stream' in habitats or 'river' in habitats:return 'stream'
    return 'river'
def credits():
    return '<section class="section"><div class="wrap narrow prose"><h2>Scene images</h2><p>Our scene images are AI-generated illustrations created with GPT Image. They show representative water environments, not verified views of named destinations.</p><p><a href="/media/scenes/manifest.json">Image sources and descriptions</a></p></div></section>'
