"""Check the catalog contract through every rendered video surface."""
import json, unittest
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
class Media(HTMLParser):
    def __init__(self,text):
        super().__init__();self.videos=[];self.sources=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        if tag=='video':self.videos.append(dict(attrs))
        if tag=='source' and dict(attrs).get('type')=='video/mp4':self.sources.append(dict(attrs))
class VideoTests(unittest.TestCase):
    def test_catalog_and_rendered_surfaces(self):
        catalog=json.loads((ROOT/'src/videos.json').read_text())
        guides=json.loads((ROOT/'src/guides.json').read_text())
        trips=json.loads((ROOT/'src/world.json').read_text())['trips']
        curated={t['canonicalPath']:guides['trips'][t['id']]['reel']['slug'] for t in trips if t['id'] in guides['trips']}
        curated.update({'/guides/'+g['slug']+'/':g['reel']['slug'] for g in guides['articles']})
        self.assertEqual(len(catalog),13)
        self.assertEqual(len({x['slug'] for x in catalog}),13)
        paths={urlsplit(v['page_url']).path for v in catalog} | set(curated)
        for path,expected in [('/',13),('/videos/',13)]+[(path,1 if path in curated else sum(urlsplit(v['page_url']).path==path for v in catalog)) for path in paths]:
            text=(ROOT/'dist'/path.strip('/')/'index.html').read_text()
            parsed=Media(text)
            self.assertEqual(len(parsed.videos),expected,path)
            if path in curated:
                self.assertEqual(parsed.sources[0]['data-src'],'/media/videos/'+curated[path]+'.mp4',path)
            self.assertEqual(text.count('"@type": "VideoObject"'),expected if '<link rel="canonical"' in text else 0,path)
            for video in parsed.videos:
                self.assertEqual(video['preload'],'none')
                self.assertIn('controls',video)
                self.assertEqual((video['width'],video['height']),('720','1280'))
                self.assertTrue((ROOT/'dist'/video['poster'].lstrip('/')).is_file())
            for source in parsed.sources:
                self.assertNotIn('src',source)
                self.assertTrue((ROOT/'dist'/source['data-src'].lstrip('/')).is_file())
        sitemap=ROOT/'dist/sitemap.xml'
        if sitemap.exists():self.assertIn('/videos/</loc>',sitemap.read_text())
if __name__=='__main__':unittest.main()
