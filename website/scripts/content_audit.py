#!/usr/bin/env python3
"""Produce an editorial review queue. No network checks or silent content rewrites."""
from pathlib import Path
from datetime import date,timedelta
import json,argparse
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--today',default=date.today().isoformat());p.add_argument('--interval',type=int,default=30);a=p.parse_args()
today=date.fromisoformat(a.today);w=json.loads((ROOT/'src/world.json').read_text());interval=max(1,a.interval)
items=[]
for kind,articles in [('trip',w['trips']),('environment',w['habitats'])]:
 for x in articles:
  refs=x.get('sourceIds') or list(dict.fromkeys(e['source'] for e in x['evidence']))
  due=date.fromisoformat(x['review']['checked'])+timedelta(days=interval)
  concerns=[i['issue'] for i in w['issues'] if i['source'] in refs and i['severity']=='qualified']
  items.append({'id':x['id'],'kind':kind,'title':x['title'],'due':due.isoformat(),'priority':'due' if today>=due else 'scheduled','source_urls':[w['sources'][s]['url'] for s in refs],'review':['Claim support and source scope','Recent local changes and seasonal qualifications','Equipment compatibility and operator provision','Reader feedback and unresolved questions'],'known_qualifications':concerns,'independent_review_pending':not x['review']['independentExpertReviewed']})
out={'generated':today.isoformat(),'scope':'Reminder queue only: no sources fetched, no links tested and no articles automatically updated.','article_count':len(items),'items':items,'unpublished_briefs':w['backlog']}
(ROOT/'research/review-queue.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print('Queued',len(items),'articles. No network work or automatic editing performed.')
