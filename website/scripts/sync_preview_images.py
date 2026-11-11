"""Import a resumable preview image run: python3 scripts/sync_preview_images.py RUN_DIR."""
import json
import fcntl
import shutil
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def sync(source):
    target = ROOT/'public/media/previews'
    target.mkdir(parents=True, exist_ok=True)
    with (source/'manifest.jsonl').open() as handle:
        fcntl.flock(handle, fcntl.LOCK_SH)
        records = {r['slug']:r for r in map(json.loads, handle.read().splitlines())}
        fcntl.flock(handle, fcntl.LOCK_UN)
    assignments = json.loads((source/'assignments.json').read_text())
    trips = json.loads((ROOT/'public/media/trips/manifest.json').read_text())
    routes, missing = {}, []
    for route, item in assignments.items():
        slug = item['slug']
        if item['directory'] == 'trips':
            detail = trips.get(slug)
        else:
            detail = records.get(slug)
            if detail:
                for width in (640, 1200, 1600):
                    for ext in ('avif', 'webp'):
                        name = f'{slug}-{width}.{ext}'
                        src, dest = source/'web'/name, target/name
                        if not dest.exists() or not src.samefile(dest):
                            shutil.copy2(src, dest)
        if not detail:
            missing.append(route)
            continue
        routes[route] = {**item, 'alt':detail['alt'], 'width':detail['width'], 'height':detail['height'], 'ai_generated':True}
    catalog = {'version':1, 'generator':'GPT Image through Codex subscription',
               'digitalSourceType':'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
               'note':'AI illustrations show representative landscape character. They are not verified destination photographs.',
               'routes':routes, 'images':{slug:{**record, 'file':f'/media/previews/{slug}-1600.webp'} for slug,record in records.items()}}
    (target/'manifest.json').write_text(json.dumps(catalog, indent=2, ensure_ascii=False)+'\n')
    print(json.dumps({'routes':len(routes),'images':len(records),'pending':len(missing)}))
    return missing

if __name__ == '__main__':
    missing = sync(Path(sys.argv[1]))
    if '--require-complete' in sys.argv and missing:
        raise SystemExit('Incomplete image coverage: '+str(len(missing)))
