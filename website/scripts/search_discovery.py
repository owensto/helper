"""Shared entity metadata and a small, curated text guide to useful site pages."""
import json
from html import escape
from pathlib import Path


def metadata(path, page, origin):
    if not origin:
        return ''
    organization = {'@type':'Organization','@id':origin+'/#organization','name':'Castward','url':origin+'/',
        'sameAs':['https://www.youtube.com/@castwardapp','https://www.instagram.com/castwardapp/','https://www.pinterest.com/castward/']}
    website = {'@type':'WebSite','@id':origin+'/#website','name':'Castward','url':origin+'/',
        'publisher':{'@id':origin+'/#organization'},'potentialAction':{'@type':'SearchAction','target':{'@type':'EntryPoint','urlTemplate':origin+'/search/?q={search_term_string}'},'query-input':'required name=search_term_string'}}
    crumbs = [{'@type':'ListItem','position':1,'name':'Home','item':origin+'/'}]
    if path != '/':
        crumbs.append({'@type':'ListItem','position':2,'name':page['title'].removesuffix(' | Castward'),'item':origin+path})
    graph=[organization,website,{'@type':'BreadcrumbList','itemListElement':crumbs}]
    return '<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':graph}).replace('</','<\\/')+'</script>'


def feeds(dist, pages, root, origin):
    if not origin:
        return
    guides=json.loads((root/'src/guides.json').read_text())['articles']
    selected=['/','/about/','/guides/','/fishing-licenses/','/guides/florida-visitor-fishing-license-planner/',
              '/destinations/florida-keys/','/destinations/bozeman/','/destinations/yakutat/','/environments/','/fishing-lingo/','/tools/weather/','/tools/tides/','/atlas/','/plan/','/search/']
    selected += ['/guides/'+g['slug']+'/' for g in guides]
    selected += ['/fishing-licenses/'+s+'/' for s in ['us-florida','us-alaska','us-california','us-minnesota','us-montana']]
    selected=list(dict.fromkeys(p for p in selected if p in pages and not pages[p].get('noindex') and not pages[p].get('redirectTo')))[:50]
    lines=['# Castward','','> Fishing trip guides, water guides, gear comparisons, and planning tools.','','Castward publishes destination and preparation information. Confirm current rules with the cited fisheries authority.','', '## Useful pages','']
    lines += [f'- [{pages[p]["title"].removesuffix(" | Castward")}]({origin+p}): {pages[p]["desc"]}' for p in selected]
    (dist/'llms.txt').write_text('\n'.join(lines)+'\n')
    full=lines+['','## Guide answers','']
    for g in guides:
        full += ['### '+g['title'],origin+'/guides/'+g['slug']+'/', 'Updated '+g.get('updated','2026-11-10'),g.get('quickAnswer',g['description']),'']
    (dist/'llms-full.txt').write_text('\n'.join(full)+'\n')


def compact_titles(pages, dist):
    import re
    changes=[]
    for path,page in pages.items():
        old=page['title']
        title=old
        if path.startswith('/species/') and path.endswith('-group/'):
            sibling=path.replace('-group/', '/')
            if sibling in pages and pages[sibling]['title'].split(' fishing')[0] == old.split(' fishing')[0]:
                title=old.split(' fishing')[0] + ' group: fishing and local names | Castward'
        if path == '/north-america/united-states/regions/alaska/':
            title='Alaska regional fishing trips | Castward'
        if len(title)>60:
            title=re.sub(r'\s*[|—–-]\s*Castward$', '', title)
        if len(title)>60:
            title=title.replace(': species, season and trip plan', ': trip guide')
            title=title.replace(' fishing, local names and destinations', ' fishing and local names')
        if title != old:
            page['title']=title
            page['modified']=max(page.get('modified','2026-11-10'),'2026-11-12')
            changes.append({'url':path,'old':old,'new':title})
    (dist.parent/'test-results/title-changes.json').write_text(json.dumps(changes,indent=2)+'\n')
