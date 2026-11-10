#!/usr/bin/env python3
"""Import completed trip scenes. Re-run with the image run directory as argument."""
import json
import re
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def sync(source):
    target = ROOT / 'public/media/trips'
    target.mkdir(parents=True, exist_ok=True)
    manifest = target / 'manifest.json'
    images = json.loads(manifest.read_text()) if manifest.exists() else {}
    trips = {t['id'] for t in json.loads((ROOT / 'src/world.json').read_text())['trips']}
    for line in (source / 'manifest.jsonl').read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        slug = row['slug']
        if not re.fullmatch(r'[a-z0-9-]+', slug) or slug not in trips:
            raise ValueError('Unknown trip: ' + slug)
        files = [source / 'web' / f'{slug}-{width}.{ext}' for width in (640, 1200, 1600) for ext in ('avif', 'webp')]
        if not all(p.is_file() for p in files):
            print('Incomplete scene skipped: ' + slug)
            continue
        # Original PNG dimensions preserve the exact resized aspect ratio without dependencies.
        with (source / row['file']).open('rb') as handle:
            header = handle.read(24)
        if header[:8] != b'\x89PNG\r\n\x1a\n':
            raise ValueError('Expected PNG original: ' + slug)
        width, height = struct.unpack('>II', header[16:24])
        for path in files:
            if not (target / path.name).exists() or path.read_bytes() != (target / path.name).read_bytes():
                shutil.copy2(path, target / path.name)
        images[slug] = {'alt': row['alt'], 'width': 1600, 'height': round(1600 * height / width), 'ai_generated': True}
    manifest.write_text(json.dumps(images, indent=2, ensure_ascii=False, sort_keys=True) + '\n')
    print(f'Wired {len(images)} trip scenes')

if __name__ == '__main__':
    sync(Path(sys.argv[1]))
