"""Build retrieval records from final public pages and install the lazy chat entry point."""
import json
from conditions import asset


def install(pages, root, trips, data, habitats, articles):
    by_path = {t.get('canonicalPath', '/trips/'+t['id']+'/'): t for t in trips}
    by_path.update({'/environments/'+h['id']+'/': h for h in habitats})
    by_path.update({'/destinations/'+d['id']+'/': d for d in data['destinations'] if not d.get('tripProfile')})
    by_id = {t['id']: t for t in trips}
    by_id.update({d['id']: d for d in data['destinations'] if not d.get('tripProfile')})
    authored = json.loads((root/'src/guides.json').read_text())['articles']
    for guide in [*articles, *authored]:
        slug = guide.get('slug', guide.get('id'))
        by_path['/guides/'+slug+'/'] = by_id.get(guide.get('destination'), {})
    index = []
    for path, page in pages.items():
        if page.get('redirectTo') or not (path in by_path or (path.startswith('/guides/') and path != '/guides/') or path.startswith('/shopping-lists/')):
            continue
        record = by_path.get(path, {})
        index.append({'title': page['title'], 'url': path, 'place': record.get('place', record.get('name', '')),
                      'country': record.get('country', ''), 'habitats': record.get('habitats', [record['name']] if path.startswith('/environments/') else []),
                      'species': record.get('fish', record.get('species', [])), 'summary': page['desc'][:600], 'season': record.get('season', '')[:600]})
        if 'id="shopping-list"' in page['body']:
            index[-1]['shoppingUrl'] = path+'#shopping-list'
    payload = json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n'
    (root/'dist/assets/chat-index.json').write_text(payload)
    (root/'api/_chat-index.json').write_text(payload)
    entry = '<link rel="stylesheet" href="'+asset(root, 'conditions.css')+'"><link rel="stylesheet" href="'+asset(root, 'chat.css')+'"><script src="'+asset(root, 'tools-boot.js')+'" data-conditions-src="'+asset(root, 'conditions.js')+'" data-chat-src="'+asset(root, 'chat.js')+'" defer></script>'
    button = '<button class="chat-launch" type="button" data-chat-launch aria-haspopup="dialog" aria-controls="castward-chat">Plan with Castward</button><span class="chat-load-status" role="status"></span>'
    for page in pages.values():
        page['atlasAssets'] = page.get('atlasAssets', '') + entry
        page['body'] += button
