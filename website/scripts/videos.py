"""One video catalog feeds the library, destination sections and structured data."""
import json
from urllib.parse import urlsplit
from html import escape as E

def install(pages, root, origin, add):
    videos=json.loads((root/'src/videos.json').read_text())
    def section(rows):
        cards=[];schema=[]
        for v in rows:
            slug=v['slug'];base='/media/videos/'+slug
            cards.append(f'''<article class="reel-card" id="{E(slug)}"><video controls playsinline preload="none" loading="lazy" width="720" height="1280" poster="{base}.jpg" aria-label="{E(v['title'],quote=True)}"><source data-src="{base}.mp4" type="video/mp4"><track kind="captions" src="{base}.vtt" srclang="en" label="English" default></video><h3>{E(v['title'])}</h3><p>{E(v['caption'])}</p><a href="{E(v['page_url'],quote=True)}">Explore this guide ↗</a><noscript><p><a href="{base}.mp4">Play this film</a></p></noscript></article>''')
            if origin:
                schema.append({'@context':'https://schema.org','@type':'VideoObject','name':v['title'],'description':v['caption'],'thumbnailUrl':origin+base+'.jpg','contentUrl':origin+base+'.mp4','embedUrl':origin+'/videos/#'+slug,'uploadDate':v['upload_date'],'duration':'PT16S','inLanguage':'en','isFamilyFriendly':True})
        return '<section class="wrap section watch-section" aria-label="Watch"><div class="section-head"><div><span class="eyebrow">ON THE WATER</span><h2>Watch</h2><p>Short animated fishing stories. Find the guide behind each film.</p></div><a href="/videos/">All films ↗</a></div><div class="reel-grid">'+''.join(cards)+'</div></section><script type="application/ld+json">'+json.dumps(schema).replace('</','<\\/')+'</script><script src="/assets/videos.js" defer></script>'
    add('/videos/','Fishing videos | Castward','Original animated fishing films and four fishing comedies, with linked destination guides.', '<div class="wrap page-intro"><span class="eyebrow">CASTWARD FILMS</span><h1>A moment on the water.</h1><p>Fishing stories, small surprises, and a few tall tales.</p></div>'+section(videos))
    hero_rows=[videos[i] for i in [6,1,3]]
    reel_strip='<div class="hero-films"><div class="hero-film-label"><span>Castward films</span><a href="/videos/">Watch all films ↗</a></div><div class="hero-reels" tabindex="0" role="region" aria-label="Castward films">'
    for v in hero_rows:
        base='/media/videos/'+v['slug']
        reel_strip+=f'<div class="hero-reel"><video controls muted loop playsinline preload="none" poster="{base}.jpg" width="720" height="1280" aria-label="{E(v["title"],quote=True)}"><source data-src="{base}.mp4" type="video/mp4"><track kind="captions" src="{base}.vtt" srclang="en" label="English" default></video><span>{E(v["title"])}</span></div>'
    reel_strip+='</div><button class="hero-motion" type="button" aria-pressed="false">Play films</button></div>'
    pages['/']['body']=pages['/']['body'].replace('</section>',reel_strip+'</section>',1)
    pages['/']['body']+=section(videos)
    by_path={}
    for v in videos:by_path.setdefault(urlsplit(v['page_url']).path,[]).append(v)
    for path,rows in by_path.items():
        if path not in pages:raise ValueError('Missing video guide: '+path)
        body=pages[path]['body']
        marker='<section class="section article-section">'
        if marker in body: body=body.replace(marker,section(rows)+marker,1)
        else: body=body.replace('<section class="section"',section(rows)+'<section class="section"',1)
        pages[path]['body']=body
