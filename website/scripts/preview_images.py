"""One route-to-scene contract for collection cards, detail pages and trip reuse."""
import json
from html import escape as E
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / 'public/media/previews/manifest.json'
CATALOG = json.loads(MANIFEST_PATH.read_text()) if MANIFEST_PATH.exists() else {'routes': {}, 'images': {}}
PREVIEWS = CATALOG['routes']
TRIP_PREVIEWS = {}
for route, record in PREVIEWS.items():
    if record.get('sourceTrip') and record['directory'] == 'previews':
        TRIP_PREVIEWS.setdefault(record['sourceTrip'], record)

def available(record):
    return record and (ROOT / 'public' / image_url(record, 640)).is_file()

def image_url(record, width=640, extension='webp'):
    return f'media/{record["directory"]}/{record["slug"]}-{width}.{extension}'

def picture(record, sizes='100vw', eager=False):
    def srcset(ext):
        return ', '.join('/'+image_url(record, width, ext)+f' {width}w' for width in (640, 1200, 1600))
    loading = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<picture class="scene-picture"><source type="image/avif" srcset="{srcset("avif")}" sizes="{sizes}">'
            f'<img src="/{image_url(record, 640)}" srcset="{srcset("webp")}" sizes="{sizes}" '
            f'width="1600" height="{record.get("height", 1067)}" alt="{E(record["alt"], quote=True)}" {loading} decoding="async"></picture>')
