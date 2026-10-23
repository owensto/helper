"""Retest unchanged public fleet; preserve original interaction assertions.
The prior response matcher used basename alone. Capture full redirect paths,
all index-like responses and native hosting notices; never substitute responses.
"""
from pathlib import Path
import hashlib, os, py_compile
R = Path(__file__).resolve().parent
p = R / 'verify.py'
s = p.read_text()
assert hashlib.sha256(p.read_bytes()).hexdigest() == '8f8281cf19f2859fe15be3fbb5558a41be074ac6004efba8329d69d2d5238b8a', 'ORIGINAL_EXECUTED_VERIFIER_MISMATCH'
s = s.replace('import os,json,time,hashlib,traceback', 'import os,json,time,hashlib,traceback\nfrom urllib.parse import urlsplit')
start = s.index('   def received(response):')
end = s.index("   p.on('response',received)", start)
s = s[:start] + '''   row['responses']=[];row['hostingNotices']=[];row['networkFailures']=[]
   p.on('requestfailed',lambda req:row['networkFailures'].append({'url':req.url,'failure':req.failure}))
   base=urlsplit(URL);basepath=base.path.rsplit('/',1)[0]+'/'
   def received(response):
    chain=[];req=response.request
    while req:
     chain.append(req.url);req=req.redirected_from
    found=None
    for u in chain:
     parsed=urlsplit(u)
     if parsed.netloc!=base.netloc:continue
     for rel in expected:
      if parsed.path==basepath+rel:found=rel;break
     if found:break
    # Retain unrelated index.html responses so the old basename-only failure is explainable.
    index_like=any(urlsplit(u).path.endswith('/index.html') for u in chain)
    main_document=response.request.is_navigation_request() and response.frame==p.main_frame
    if not found and not index_like and not main_document:return
    entry={'url':response.url,'redirectChain':chain,'resource':found,'mainDocument':main_document,'status':response.status,'classification':'external' if not found else 'pending'}
    row['responses'].append(entry)
    if response.status!=200:
     if found and response.status>=400:row['appErrors'].append(entry.copy())
     return
    try:
     b=response.body();got=hashlib.sha256(b).hexdigest();entry['sha256']=got;entry['bytes']=len(b)
     if main_document or index_like:
      rel=name+'-response-'+str(len(row['responses']))+'.html';(OUT/rel).write_bytes(b);entry['bodyFile']=rel
     if not found:return
     if got==expected[found]:
      row['bindings'][found]=got;entry['classification']='exact-app-bytes'
     elif found=='index.html' and main_document and b'Open the page' in b:
      entry['classification']='unacknowledged-hosting-notice'
     else:
      entry['classification']='unexpected-app-bytes';row['appErrors'].append(entry.copy())
    except Exception as e:
     entry['bodyReadError']=str(e)
     if found:row['appErrors'].append(entry.copy())
''' + s[end:]
start=s.index('   def ready():');end=s.index('   def resume():',start)
s=s[:start]+'''   def ready():
    for attempt in range(2):
     if not p.get_by_text('Open the page',exact=True).count():break
     current=p.url;notice=p.get_by_text('Open the page',exact=True)
     assert notice.is_visible(),'HOST_NOTICE_NOT_VISIBLE'
     candidates=[e for e in row['responses'] if e['mainDocument'] and e['url']==current and e.get('classification') in ['unacknowledged-hosting-notice','external']]
     assert candidates,'HOST_NOTICE_HAS_NO_CAPTURED_DOCUMENT'
     for e in candidates:
      assert 'bodyFile' in e and b'Open the page' in (OUT/e['bodyFile']).read_bytes(),'HOST_NOTICE_BODY_MISMATCH'
     row['hostingNotices'].append({'url':current,'label':notice.inner_text(),'href':notice.get_attribute('href'),'documentHashes':[e['sha256'] for e in candidates]})
     with p.expect_navigation(wait_until='domcontentloaded',timeout=120000):notice.click()
     for e in candidates:e['classification']='native-clicked-hosting-notice'
    p.wait_for_function('(window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE) || (document.getElementById("retry") && !document.getElementById("retry").hidden)',timeout=180000)
    assert p.evaluate('!!(window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE)'),p.locator('#loading').inner_text()
    documents=[e for e in row['responses'] if e['mainDocument'] and e['url']==p.url and e.get('sha256')]
    assert documents and documents[-1]['sha256']==expected['index.html'],'ACTIVE_DOCUMENT_BYTES_MISMATCH'
''' + s[end:]
a="ck('no page/resource errors',not row['pageErrors'] and not row['appErrors'])"
assert s.count(a)==1
s=s.replace(a,"ck('no unacknowledged hosting documents',not any(e.get('classification')=='unacknowledged-hosting-notice' for e in row['responses']))\n    "+a)
s=s.replace("report={'url':URL,'public':PUBLIC", "report={'responseVerification':'full requested origin/path plus native notice evidence; original interactions retained','publicSHA':'8d7df3837046bdbf3b04bf4c4fca245a37aba2a5','url':URL,'public':PUBLIC")
out=Path(os.environ.get('REVIEW_DIR','/tmp/fleet-review'));out.mkdir(parents=True,exist_ok=True)
(out/'executed-verifier.py').write_text(s)
compile(s,str(p),'exec')
exec(compile(s,str(p),'exec'),{'__file__':str(p),'__name__':'__main__'})
