"""Add optional searches only for named tackle in eligible fishing page prose.
No species-to-generic-kit fallback, no guessed models, prices or product IDs.
"""
import re
from html import escape, unescape
from html.parser import HTMLParser
from urllib.parse import urlencode

TERMS = [
 ('spinning reel','Spinning reel'),('spinning rod','Spinning rod'),
 ('fly rod','Fly rod'),('fly reel','Fly reel'),('fly line','Fly fishing line'),
 ('baitcasting reel','Baitcasting reel'),('baitcasting rod','Baitcasting rod'),
 ('fluorocarbon leader','Fluorocarbon fishing leader'),('wire leader','Wire fishing leader'),
 ('braided line','Braided fishing line'),('monofilament line','Monofilament fishing line'),
 ('circle hook','Fishing circle hooks'),('barbless hook','Barbless fishing hooks'),
 ('jig head','Fishing jig heads'),('jighead','Fishing jig heads'),
 ('spinnerbait','Fishing spinnerbaits'),('crankbait','Fishing crankbaits'),
 ('jerkbait','Fishing jerkbaits'),('swimbait','Fishing swimbaits'),
 ('inline spinner','Fishing inline spinners'),('soft plastic worm','Soft plastic fishing worms'),
 ('landing net','Fishing landing net'),('long-nose pliers','Fishing long-nose pliers'),
 ('polarized sunglasses','Polarized fishing sunglasses'),('wading boot','Wading boots'),
 ('waders','Fishing waders'),('dry bag','Waterproof dry bag'),
 ('bobber','Fishing bobbers'),('slip float','Fishing slip floats'),
 ('ice auger','Ice fishing auger'),('ice cleat','Ice cleats'),
 ('ice rod','Ice fishing rod'),('tackle box','Fishing tackle box'),
 ('fish finder','Fishing fish finder'),('fishfinder','Fishing fish finder'),
 ('spinning outfit','Spinning rod and reel combo'),('fly outfit','Fly fishing rod and reel combo'),
 ('popping cork','Fishing popping cork'),('bucktail jig','Bucktail fishing jigs'),
]

class Prose(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.parts=[]
 def handle_starttag(self,tag,attrs):
  if tag not in ('img','br','hr','input','meta','link','source','wbr'):self.stack.append(tag)
 def handle_endtag(self,tag):
  if tag in self.stack:self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]
 def handle_data(self,data):
  if any(t in self.stack for t in ['p','li']) and not any(t in self.stack for t in ['script','style','nav','aside','a','footer']):self.parts.append(data)

def selected(path,body):
 if not re.match(r'^/(species|environments|trip-types|styles|waters|techniques|gear|guides)/[^/]+/$',path):return []
 if 'amazon.com/' in body:return []
 parser=Prose();parser.feed(body);text=' '.join(parser.parts)
 items=[]
 for term,name in TERMS:
  matches=list(re.finditer(r'(?<!\w)'+re.escape(term)+r's?(?!\w)',text,re.I))
  match=next((m for m in matches if not re.search(r'do not|don.t|avoid|mistake|skiff-only|without approval',text[max(0,m.start()-100):m.end()+100],re.I)),None)
  if match and name not in [x['name'] for x in items]:
   items.append({'name':name,'query':name,'evidence':text[max(0,match.start()-75):match.end()+100]})
  if len(items)==4:break
 return items

def install(pages, tag):
 count=0
 for path,page in pages.items():
  if page.get('redirectTo') or page.get('noindex'):continue
  items=selected(path,page['body'])
  if not items:continue
  links=''.join('<li><a href="https://www.amazon.com/s?'+escape(urlencode({'k':x['query'],'tag':tag}),quote=True)+'" target="_blank" rel="sponsored nofollow noopener noreferrer">'+escape(x['name'])+' — search Amazon</a></li>' for x in items)
  block='<section class="wrap prose-block" data-affiliate-items=""><h2>Find the gear mentioned here</h2><p>We earn a commission from qualifying purchases through these links. <a href="/affiliate-disclosure/">Affiliate disclosure</a>.</p><ul>'+links+'</ul><p>These are searches, not tested product selections. Check local rules, sizes and the complete rod, reel, line and lure setup before buying. Ask what your guide supplies and use suitable gear you already own.</p></section>'
  page['body']+=block
  page['affiliateItems']=items
  count+=1
 return count
