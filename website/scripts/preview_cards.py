"""Apply the image and first-row contract to every static discovery card."""
import re
from collections import Counter
from html.parser import HTMLParser
from photography import preview_photo, photo
from preview_images import PREVIEWS, available, placeholder

CARD_CLASSES = {'world-card', 'type-card', 'country-card', 'habitat-card', 'article-card', 'field-fish-card'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
SIZES = '(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw'

class Cards(HTMLParser):
    def __init__(self, body):
        super().__init__(convert_charrefs=False)
        self.offsets = [0]
        for line in body.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.stack, self.active, self.cards = [], [], []
        self.feed(body)

    def position(self):
        line, column = self.getpos()
        return self.offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = CARD_CLASSES.intersection(attrs.get('class', '').split())
        if classes:
            self.active.append({'start': self.position(), 'depth': len(self.stack), 'kind': sorted(classes)[0], 'href': attrs.get('href'), 'image': False})
        for card in self.active:
            if tag == 'a' and not card['href']:
                card['href'] = attrs.get('href')
            if tag == 'img':
                card['image'] = True
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag not in self.stack:
            return
        depth = len(self.stack) - 1 - self.stack[::-1].index(tag)
        while self.active and self.active[-1]['depth'] >= depth:
            card = self.active.pop()
            card['end'] = self.position() + len(tag) + 3
            self.cards.append(card)
        self.stack = self.stack[:depth]

def install(pages):
    # Content previews use a relevant scene already present on their destination page.
    destination_pictures = {}
    for path, page in pages.items():
        pictures = re.findall(r'<picture\b.*?</picture>', page['body'], re.S)
        if pictures:
            destination_pictures[path] = next((p for p in pictures if '/media/trips/' in p or '/media/previews/' in p), pictures[0])
    for page in pages.values():
        body = page['body']
        if not any(kind in body for kind in CARD_CLASSES):
            continue
        cards = sorted(Cards(body).cards, key=lambda c: c['start'])
        counts, changes = Counter(), []
        for card in cards:
            markup = body[card['start']:card['end']]
            eager = counts[card['kind']] < 3
            counts[card['kind']] += 1
            if not card['image']:
                route = card['href']
                if available(PREVIEWS.get(route)):
                    scene = preview_photo(route, SIZES, eager)
                else:
                    scene = destination_pictures.get(route, photo('mountain-river', SIZES, eager))
                scene = re.sub(r'sizes="[^"]*"', f'sizes="{SIZES}"', scene)
                at = markup.index('>') + 1
                markup = markup[:at] + '<span class="preview-media">' + scene + '</span>' + markup[at:]
            markup = markup.replace('>', ' data-preview-card>', 1)
            # A 640-pixel card source avoids downloading a hero-size image on phones.
            # The complete 1200/1600 srcsets remain available for larger layouts.
            mobile_sources = []
            avif = re.search(r'<source[^>]*type="image/avif"[^>]*srcset="([^"]+)"', markup)
            webp = re.search(r'<img[^>]*srcset="([^"]+)"', markup)
            for ext, source in [('avif', avif), ('webp', webp)]:
                if source:
                    url = source.group(1).split(',')[0].strip().split()[0]
                    mobile_sources.append(f'<source media="(max-width: 700px)" type="image/{ext}" srcset="{url}" sizes="calc(100vw - 32px)">')
            markup = re.sub(r'(<picture\b[^>]*>)', lambda match: match.group() + ''.join(mobile_sources), markup, count=1)
            image_source = re.search(r'<img[^>]*src="([^"]+)"', markup)
            poster = placeholder(image_source.group(1)) if image_source else ''
            poster_style = f' style="background-image:url({poster})"' if poster else ''
            markup = markup.replace('<picture ', '<picture data-preview-media' + poster_style + ' ', 1)
            def loading(match):
                image = re.sub(r'\s(?:loading|fetchpriority)="[^"]*"', '', match.group())
                return image[:-1] + (' loading="eager" fetchpriority="high">' if eager else ' loading="lazy">')
            markup = re.sub(r'<img\b[^>]*>', loading, markup, count=1)
            changes.append((card['start'], card['end'], markup))
        for start, end, markup in reversed(changes):
            body = body[:start] + markup + body[end:]
        page['body'] = body
