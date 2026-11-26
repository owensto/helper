"""Refresh src/shorts-hub.json: the most watched Castward Shorts with the sourced text of each one.

Usage: python3 scripts/shorts_hub_sync.py <remote-video-metadata.json> [count]
The metadata file is the daily YouTube Data API capture (items[].snippet/statistics/contentDetails).
The text is our own published video description; hashtags, promo lines and bare links are removed.
Thumbnails are our own Shorts covers, stored under public/media/shorts/<id>.jpg (360x640).
"""
import json, re, subprocess, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHANNEL = 'UCEtJVfHhqE694_Z3uJ84eIw'
# Page that goes deeper on the topic of a Short. Fallback: the page in src/shorts.json, then the species index.
TARGETS = {
    'zvV-qFSWzK4': '/species/atlantic-goliath-grouper/', 'kAArGC2Kyh8': '/species/atlantic-goliath-grouper/',
    'hWF7EJ2uk2o': '/species/northern-pike/', 'Uzm61U1RpxQ': '/species/northern-pike/',
    'XuWOF14S0TA': '/species/pacific-halibut/', 'Kf3aF6NhkWw': '/species/blue-catfish/',
    'BCm7UIVsYOk': '/trip-types/ice-fishing/', 'MK6Sf0grL6I': '/species/largemouth-bass/',
    'OoBf5szkpt4': '/species/largemouth-bass/', 'S2HVPZ-NJDw': '/species/largemouth-bass/',
    '6uL53RH8KKA': '/species/', 'NTI0unGFjMk': '/trip-types/', '2qFmezbcd0w': '/guides/fishing-gear-you-already-own/',
}

def clean(text):
    out = []
    for line in text.replace('\r', '').split('\n'):
        line = line.strip()
        if not line or line.startswith('Full guide') or re.fullmatch(r'https?://\S+', line):
            continue
        line = re.sub(r'(\s*#[A-Za-z0-9_]+)+\s*$', '', line).strip()
        if line:
            out.append(line)
    return out

def seconds(iso):
    m = re.fullmatch(r'PT(?:(\d+)M)?(?:(\d+)S)?', iso)
    return int(m.group(1) or 0) * 60 + int(m.group(2) or 0)

def main():
    meta = json.loads(Path(sys.argv[1]).read_text())
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 24
    mapped = {s['id']: s['page_url'].replace('https://castward.app', '').split('?')[0] for s in json.loads((ROOT / 'src/shorts.json').read_text())}
    items = [i for i in meta['items'] if i['snippet']['channelId'] == CHANNEL and i['status']['privacyStatus'] == 'public']
    items.sort(key=lambda i: -int(i['statistics'].get('viewCount', 0)))
    rows = []
    thumbs = ROOT / 'public/media/shorts'; thumbs.mkdir(parents=True, exist_ok=True)
    for i in items:
        if len(rows) == count:
            break
        body = clean(i['snippet']['description'])
        if sum(len(p) for p in body) < 300:
            continue  # too thin to answer the title
        vid = i['id']
        jpg = thumbs / (vid + '.jpg')
        if not jpg.exists():
            raw = thumbs / (vid + '.src.jpg')
            try:
                urllib.request.urlretrieve(f'https://i.ytimg.com/vi/{vid}/oar2.jpg', raw)
            except Exception:
                continue
            subprocess.run(['sips', '-z', '640', '360', '-s', 'format', 'jpeg', '-s', 'formatOptions', '72', str(raw), '--out', str(jpg)], check=True, capture_output=True)
            raw.unlink()
        title = re.sub(r'[^\x20-\x7e -ɏ‘’“”–—…]+', '', i['snippet']['title']).strip()
        rows.append({'id': vid, 'title': title, 'published': i['snippet']['publishedAt'], 'seconds': seconds(i['contentDetails']['duration']), 'page': TARGETS.get(vid) or mapped.get(vid) or '/species/', 'body': body})
    (ROOT / 'src/shorts-hub.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n')
    print(len(rows), 'Shorts written')

if __name__ == '__main__':
    main()
