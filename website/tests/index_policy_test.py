"""Adversarial content gates plus generated SEO and sitemap integrity."""
import copy
import json
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from index_policy import evaluate, description_key, sitemap_entries, write_sitemaps, words
WORLD = json.loads((ROOT/'src/world.json').read_text())
SPECIES = {s['id']: s for s in json.loads((ROOT/'src/species-catalog.json').read_text())['species']}

class Meta(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.canonical=[]; self.robots=[]; self.links=[]; self.feed(text)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a['href'])
        if tag=='meta' and a.get('name')=='robots': self.robots.append(a['content'])
        if tag=='a': self.links.append(a.get('href'))

class PolicyTests(unittest.TestCase):
    def fixture(self):
        return copy.deepcopy(next(t for t in WORLD['trips'] if t['id']=='na-us-oh-001'))

    def test_each_required_gate_fails_closed(self):
        trip=self.fixture()
        self.assertTrue(evaluate(trip,SPECIES)['eligible'])
        for field,value in [('speciesEvidence',trip['speciesEvidence'][:1]),('season',''),('canonicalPath',''),('canonicalPath','//other.test/x/'),('localDescription',{'paragraphs':['Short local note.']})]:
            bad=copy.deepcopy(trip);bad[field]=value
            self.assertFalse(evaluate(bad,SPECIES)['eligible'],field)
        self.assertFalse(evaluate(trip,SPECIES,duplicate=True)['eligible'])

    def test_species_aliases_groups_and_unverified_urls_do_not_pass(self):
        trip=self.fixture();one=trip['speciesEvidence'][0]
        for targets in [[one,one],[dict(one,speciesId='rockfish'),one],
                        [dict(t,status='unverified') for t in trip['speciesEvidence']],
                        [dict(t,sourceUrls=['javascript:void(0)']) for t in trip['speciesEvidence']]]:
            bad=copy.deepcopy(trip);bad['speciesEvidence']=targets
            self.assertFalse(evaluate(bad,SPECIES)['eligible'])

    def test_length_boundary_and_place_swap_duplicates(self):
        trip=self.fixture()
        for count,expected in [(119,False),(120,True)]:
            trip['localDescription']={'paragraphs':['word '*count]}
            self.assertEqual(evaluate(trip,SPECIES)['eligible'],expected)
        trip=self.fixture();other=copy.deepcopy(trip)
        other['place']='Other Water'
        other['localDescription']['paragraphs']=[s.replace(trip['place'],other['place']) for s in trip['localDescription']['paragraphs']]
        self.assertEqual(description_key(trip),description_key(other))

    def test_sitemap_threshold_escaping_and_redirect_exclusion(self):
        for count,split in [(1000,False),(1001,True)]:
            pages={f'/water-{i}/':{'noindex':False} for i in range(count)}
            pages['/alias/']={'noindex':False,'redirectTo':'/water-0/'}
            pages['/private/']={'noindex':True}
            with tempfile.TemporaryDirectory() as folder:
                write_sitemaps(Path(folder),pages,'https://castward.app','2026-11-10')
                root=ET.parse(Path(folder)/'sitemap.xml').getroot()
                self.assertEqual(root.tag.endswith('sitemapindex'),split)
                self.assertEqual(len(sitemap_entries(folder)),count)
                for child in Path(folder).glob('sitemap-*.xml'):
                    self.assertLessEqual(len(ET.parse(child).getroot()),1000)

    def test_rendered_pages_manifest_and_all_sitemap_urls_agree(self):
        manifest=json.loads((ROOT/'dist/route-manifest.json').read_text())
        audit={x['id']:x for x in json.loads((ROOT/'dist/index-audit.json').read_text())}
        urls=sitemap_entries(ROOT/'dist');origin='https://castward.app'
        for t in WORLD['trips']:
            path=t['canonicalPath'];m=manifest[path]
            self.assertEqual(t['indexEligible'],audit[t['id']]['eligible'],t['id'])
            self.assertEqual(m['noindex'],not t['indexEligible'],t['id'])
            self.assertEqual(origin+path in urls,t['indexEligible'],t['id'])
            raw=(ROOT/'dist'/path.strip('/')/'index.html').read_text();meta=Meta(raw)
            self.assertEqual(meta.canonical,[origin+path],t['id'])
            self.assertEqual(meta.robots,['noindex,follow' if m['noindex'] else 'index,follow'],t['id'])
            if t.get('localDescription'):
                self.assertIn('id="local-water-description"',raw)
                self.assertTrue(set(t['localDescription']['sourceUrls']) <= set(meta.links))
            if t['indexEligible']:
                for e in t['speciesEvidence']:
                    if e['speciesId'] in t['indexAssessment']['verifiedSpeciesIds']:
                        self.assertTrue(set(e['sourceUrls']) & set(meta.links),t['id'])
        for url in urls:
            path=url.removeprefix(origin);m=manifest[path]
            self.assertFalse(m['noindex'] or m.get('redirectTo'),path)
            raw=(ROOT/'dist'/(path.strip('/')+'/index.html' if path!='/' else 'index.html')).read_text()
            self.assertEqual(Meta(raw).canonical,[url])
        for path in ['/species/','/glossary/','/trip-types/','/privacy/','/terms/','/cookies/','/disclaimer/','/affiliate-disclosure/','/accessibility/']:
            self.assertIn(origin+path,urls)
        for path,m in manifest.items():
            if m.get('redirectTo'):
                self.assertNotIn(origin+path,urls)
                self.assertFalse(manifest[m['redirectTo']].get('redirectTo'))

if __name__=='__main__': unittest.main()
