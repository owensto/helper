"""Short gear pages for the links named in the long Castward videos: /g/<slug>/ and the /g/ kit index."""
import json
from html import escape as E
from urllib.parse import urlencode

TAG = 'mediaatlas08-20'


def _buy(item):
    href = 'https://www.amazon.com/s?' + urlencode({'k': item['search_query'], 'tag': TAG})
    return ('<a class="btn" href="' + E(href, quote=True) + '" target="_blank" rel="sponsored nofollow noopener noreferrer" '
            'data-outbound="shopping" aria-label="See options on Amazon: ' + E(item['name'], quote=True) + '">See options on Amazon ↗</a>')


def install(pages, root, add, intro, bread):
    items = json.loads((root / 'src/gear-links.json').read_text())
    note = ('<p class="note">Castward earns a small commission on qualifying Amazon purchases, at no extra cost to you. '
            '<a href="/affiliate-disclosure/">How links work</a>.</p>')
    kits = {}
    for x in items:
        kits.setdefault(x['kit'], []).append(x)
    for x in items:
        body = (bread(x['name'], ('/g/', 'Gear from the videos'))
                + intro('FROM THE VIDEO: ' + E(x['kit'].upper()), E(x['name']), E(x['why']))
                + '<section class="wrap section"><p>' + _buy(x) + '</p>' + note
                + '<p><a href="/g/">The full kit from the videos ↗</a> · <a href="/videos/">Castward videos ↗</a></p></section>')
        add('/g/' + x['slug'] + '/', x['name'] + ' | Castward gear', x['why'][:155], body, noindex=True)
    rows = ''
    for kit, xs in kits.items():
        rows += '<h2>' + E(kit) + '</h2><ul class="gear-kit">' + ''.join(
            '<li><a href="/g/' + E(x['slug'], quote=True) + '/"><b>' + E(x['name']) + '</b></a> — ' + E(x['why']) + '</li>' for x in xs) + '</ul>'
    add('/g/', 'Gear from the Castward videos | Castward',
        'The rod, line, lures and tools named in the Castward long videos, with a short note on why each one is in the kit.',
        bread('Gear from the videos') + intro('GEAR FROM THE VIDEOS', 'The kit from the videos.',
                                              'Every item named in our long videos, with why it is in the kit.')
        + '<section class="wrap section">' + rows + note + '</section>', noindex=True)
