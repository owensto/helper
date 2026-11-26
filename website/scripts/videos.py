"""One video catalog feeds the library, destination sections and structured data."""
import json
from urllib.parse import urlsplit
from html import escape as E

def section(rows, origin, note="Short animated fishing stories. Find the guide behind each film."):
    cards=[];schema=[]
    for v in rows:
        slug=v['slug'];base='/media/videos/'+slug
        cards.append(f'''<article class="reel-card" id="{E(slug)}"><video controls playsinline preload="none" loading="lazy" width="720" height="1280" poster="{base}.jpg" aria-label="{E(v['title'],quote=True)}"><source data-src="{base}.mp4" type="video/mp4"><track kind="captions" src="{base}.vtt" srclang="en" label="English" default></video><h3>{E(v['title'])}</h3><p>{E(v['caption'])}</p><a href="{E(v['page_url'],quote=True)}">Read the trip guide ↗</a><noscript><p><a href="{base}.mp4">Play this film</a></p></noscript></article>''')
        if origin:
            schema.append({'@context':'https://schema.org','@type':'VideoObject','name':v['title'],'description':v['caption'],'thumbnailUrl':origin+base+'.jpg','contentUrl':origin+base+'.mp4','embedUrl':origin+'/videos/#'+slug,'uploadDate':v['upload_date'],'duration':'PT16S','inLanguage':'en','isFamilyFriendly':True})
    return '<section class="wrap section watch-section" data-seo-skip aria-label="Watch"><div class="section-head"><div><span class="eyebrow">ON THE WATER</span><h2>Watch</h2><p>' + E(note) + '</p></div><a href="/videos/">All films ↗</a></div><div class="reel-grid">'+''.join(cards)+'</div></section><script type="application/ld+json">'+json.dumps(schema).replace('</','<\\/')+'</script><script src="/assets/videos.js" defer></script>'

import re

def _paragraphs(body):
    # One description paragraph is long: give the sources and the caveats their own lines.
    out=[]
    for p in body:
        parts=re.split(r'\s+(?=(?:Sources?|Caveats?):\s)',p)
        out+=[x.strip() for x in parts if x.strip()]
    return out

def _label(page):
    # Species pages are added later in the build, so the label comes from the path. The static test checks every link.
    fixed={'/species/':'Fish species and local names','/trip-types/':'Fishing trip styles','/trip-types/ice-fishing/':'Ice fishing trips','/glossary/':'World fishing glossary','/guides/fishing-gear-you-already-own/':'Fishing gear you already own','/guides/first-offshore-fishing-charter-checklist/':'First offshore charter checklist'}
    if page in fixed:return fixed[page]
    name=' '.join(w.capitalize() if w in ('atlantic','pacific') else w for w in page.strip('/').split('/')[-1].split('-'))
    return ('More on '+name) if page.startswith('/species/') else name.capitalize()

def shorts_hub(rows, pages, origin):
    """The most watched Shorts: the cover, the sourced facts of each one and the page that goes deeper."""
    cards=[];schema=[]
    for n,v in enumerate(rows):
        vid=E(v['id'],quote=True);watch='https://www.youtube.com/shorts/'+vid
        page=v['page'];label=_label(page)
        text=''.join(('<p class="short-note">' if re.match(r'(Sources?|Caveats?):',p) else '<p>')+E(p)+'</p>' for p in _paragraphs(v['body']))
        cards.append(f'''<article class="short-fact" id="s-{vid}"><a class="short-cover" href="{watch}" rel="noopener" aria-label="Watch on YouTube: {E(v['title'],quote=True)}"><img src="/media/shorts/{vid}.jpg" alt="" width="360" height="640" loading="{'eager' if n<2 else 'lazy'}" decoding="async"><span>▶ Watch · {v['seconds']} s</span></a><div class="short-text"><h2>{E(v['title'])}</h2>{text}<p class="short-next"><a class="btn" href="{E(page,quote=True)}">{E(label)} ↗</a><a class="link" href="{watch}" rel="noopener">Watch on YouTube ↗</a></p></div></article>''')
        if origin:
            schema.append({'@context':'https://schema.org','@type':'VideoObject','name':v['title'],'description':' '.join(v['body'])[:480],'thumbnailUrl':origin+'/media/shorts/'+v['id']+'.jpg','contentUrl':'https://www.youtube.com/shorts/'+v['id'],'embedUrl':'https://www.youtube-nocookie.com/embed/'+v['id'],'uploadDate':v['published'],'duration':'PT%dS'%v['seconds'],'inLanguage':'en','isFamilyFriendly':True})
    return '<section class="wrap section shorts-facts" aria-label="The facts behind each Short">'+''.join(cards)+'</section><script type="application/ld+json">'+json.dumps(schema).replace('</','<\\/')+'</script>'

def shorts_strip(rows):
    """Home strip for visitors from the YouTube channel: four covers that open the facts on /videos/."""
    cards=''.join(f'''<a class="short-tile" href="/videos/#s-{E(v['id'],quote=True)}"><img src="/media/shorts/{E(v['id'],quote=True)}.jpg" alt="" width="360" height="640" loading="lazy" decoding="async"><b>{E(v['title'])}</b></a>''' for v in rows[:4])
    return '<section class="wrap section shorts-strip" data-seo-skip aria-label="As seen on YouTube"><div class="section-head"><div><span class="eyebrow">AS SEEN ON YOUTUBE</span><h2>Saw a Castward Short? Get the facts.</h2></div><a href="/videos/">All Shorts ↗</a></div><div class="short-tiles">'+cards+'</div></section>'

def install(pages, root, origin, add):
    videos=json.loads((root/'src/videos.json').read_text())
    hub=json.loads((root/'src/shorts-hub.json').read_text())
    add('/videos/','Fishing Videos: The Facts Behind Each Short | Castward','The most watched Castward fishing Shorts with the facts and sources behind each one: goliath grouper, bone gorges, rope lures, pike, catfish and more.', '<div class="wrap page-intro"><span class="eyebrow">AS SEEN ON YOUTUBE</span><h1>The facts behind each Short.</h1><p>You saw the short version. Here is what each one is built on, with the sources, and a page to go deeper.</p><p class="short-jump"><a class="btn" href="https://www.youtube.com/@castwardapp" rel="noopener">Castward on YouTube ↗</a><a class="link" href="/near-me/">Find a place to fish near you ↗</a></p></div>'+shorts_hub(hub, pages, origin)+section(videos, origin))
    pages['/']['body']+=shorts_strip(hub)+section(videos, origin)
    by_path={}
    for v in videos:by_path.setdefault(urlsplit(v['page_url']).path,[]).append(v)
    for path,rows in by_path.items():
        if path not in pages:raise ValueError('Missing video guide: '+path)
        body=pages[path]['body']
        marker='<section class="section article-section">'
        if marker in body: body=body.replace(marker,section(rows, origin)+marker,1)
        else: body=body.replace('<section class="section"',section(rows, origin)+'<section class="section"',1)
        pages[path]['body']=body

def install_shorts(pages, root):
    # Published Shorts link back to these exact species pages.
    for short in json.loads((root/'src/shorts.json').read_text()):
        path=urlsplit(short['page_url']).path
        if path not in pages:raise ValueError('Missing Short guide: '+path)
        if short.get('updated'):
            pages[path]['modified'] = max(pages[path].get('modified', ''), short['updated'])
        video_id=E(short['id'],quote=True)
        video_open = '<details><summary>Play this fishing story</summary>' if short.get('collapsed') else ''
        video_close = '</details>' if short.get('collapsed') else ''
        pages[path]['body']+=f'''<section class="wrap section" data-seo-skip aria-label="Watch"><h2>{E(short['title'])}</h2>{video_open}<p>An animated fishing story from Castward.</p><iframe width="315" height="560" style="max-width:100%;border:0" loading="lazy" src="https://www.youtube-nocookie.com/embed/{video_id}" title="{E(short['title'],quote=True)}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe><p><a href="https://www.youtube.com/shorts/{video_id}">Watch this Short on YouTube</a></p>{video_close}</section>'''
