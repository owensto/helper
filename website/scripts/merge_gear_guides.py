#!/usr/bin/env python3
"""Merge a reviewed research/gear-guides-*.json into src/guides.json and src/shopping-lists.json."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
new = json.loads(Path(sys.argv[1]).read_text())
guides = json.loads((ROOT / 'src/guides.json').read_text())
guides['sources'].update(new['sources'])
slugs = {a['slug'] for a in new['articles']}
guides['articles'] = [a for a in guides['articles'] if a['slug'] not in slugs] + new['articles']
(ROOT / 'src/guides.json').write_text(json.dumps(guides, indent=2, ensure_ascii=False) + '\n')
lists = json.loads((ROOT / 'src/shopping-lists.json').read_text())
order = {'Budget': 0, 'Mid-range': 1, 'Premium': 2}
for entry in new['shoppingLists'].values():
    entry['items'].sort(key=lambda i: order.get(i.get('tier'), 1))
lists.update(new['shoppingLists'])
(ROOT / 'src/shopping-lists.json').write_text(json.dumps(lists, indent=2, ensure_ascii=False) + '\n')
print('merged', sorted(slugs))
