from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
class Parser(HTMLParser):
    def __init__(self):super().__init__();self.h1=0;self.links=[];self.desc=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='h1':self.h1+=1
        if tag=='a':self.links.append(a.get('href',''))
        if tag=='meta' and a.get('name')=='description' and a.get('content'):self.desc=True
manifest=json.loads((DIST/'route-manifest.json').read_text());fail=[]
for route in manifest:
    target=DIST/(route.strip('/')+'/index.html' if route!='/' else 'index.html')
    p=Parser();p.feed(target.read_text())
    if p.h1!=1:fail.append(f'{route}: expected one H1, got {p.h1}')
    if not p.desc:fail.append(f'{route}: missing description')
    for href in p.links:
        if href.startswith('/') and not href.startswith('//'):
            path=urlsplit(href).path
            if path not in manifest and not (DIST/path.lstrip('/')).exists():fail.append(f'{route}: broken local link {href}')
assert not fail,'\n'.join(fail)
(ROOT/'tests/static-results.json').write_text(json.dumps({'passed':True,'routes_checked':len(manifest),'checks':['one H1 per route','nonempty descriptions','internal links resolve']},indent=2))
print(f'{len(manifest)} static routes pass: H1s, descriptions and internal links')
