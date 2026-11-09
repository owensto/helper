"""Authored trip briefs. Each row preserves its specific evidence and a planning decision.
No combinatorial location/species/month expansion is performed.
"""
import re, unicodedata
SOURCES={}; ROWS=[]
def slug(x): return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',x).encode('ascii','ignore').decode().lower()).strip('-')
def source(key,country,region,url,title,ref,status='search-excerpt-inspected',kind='first-party-operator'):
    SOURCES[key]={'id':key,'country':country,'region':region,'url':url,'title':title,'webReference':ref,'status':status,'type':kind,'accessed':'2026-09-13','scopeNote':('Relevant search-result text was inspected; the complete destination page was not independently reviewed. ' if status=='search-excerpt-inspected' else 'The relevant source page text was inspected. ')+'This source supports the attributed location/program statement, not current availability or every editorial equipment recommendation.'}
def trip(src,place,fish,kind,angle,fact,decision,months=None,season='',territory=None):
    assert src in SOURCES,src
    ROWS.append(dict(source=src,place=place,fish=fish.split(';') if fish else ['Local targets to confirm'],kind=kind,angle=angle,fact=fact,decision=decision,months=months or [],season=season,territory=territory))
def records(src,text):
    """Explicit authored rows, never a geographic cross product."""
    for line in text.strip().splitlines():
        if line.strip() and not line.lstrip().startswith('#'):
            parts=line.split('|'); assert len(parts)==6,(src,line)
            trip(src,*parts)
