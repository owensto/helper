"""Regression checks for evidence scope and the species/glossary read paths."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
load = lambda name: json.loads((ROOT / 'src' / name).read_text())
SPECIES = load('species-catalog.json')['species']
DESTINATIONS = load('destination-species.json')['destinations']
TERMS = load('glossary.json')['terms']
DATA = load('compiled-data.json')
TRIPS = load('world.json')['trips']


class SpeciesGlossaryTests(unittest.TestCase):
    def test_all_destinations_have_explicit_evidence_status(self):
        self.assertEqual(len(DESTINATIONS), 801)
        research = {d['id']: d for d in DESTINATIONS}
        self.assertEqual(set(research), {d['id'] for d in DATA['destinations']})
        for d in DATA['destinations']:
            r = research[d['id']]
            self.assertEqual(d['speciesIds'], [t['speciesId'] for t in r['targets']])
            self.assertEqual(d['speciesReview']['status'], r['status'])
            self.assertTrue(r['researchSourceUrls'])
            for target in r['targets']:
                self.assertTrue(target['sourceUrls'])
            if r['status'] == 'unverified':
                self.assertEqual(d['species'], [])
                self.assertEqual(d['speciesIds'], [])

    def test_alaska_fish_are_not_lost_in_compilation(self):
        homer = next(t for t in TRIPS if t['id'] == 'na-us-ak-002')
        self.assertTrue({'black-rockfish', 'yelloweye-rockfish', 'lingcod'} <= set(homer['speciesIds']))
        html = (ROOT / 'dist' / homer['canonicalPath'].strip('/') / 'index.html').read_text()
        for sid in ['black-rockfish', 'yelloweye-rockfish', 'lingcod']:
            self.assertIn('/species/' + sid + '/', html)
        self.assertNotIn('tarpon', homer['speciesIds'])

    def test_every_species_page_lists_every_matching_destination(self):
        paths = {d['id']: d.get('guideUrl', '/destinations/' + d['id'] + '/') for d in DATA['destinations']}
        paths.update({t['id']: t['canonicalPath'] for t in TRIPS})
        self.assertGreaterEqual(sum(s['taxonType'] == 'species' for s in SPECIES), 300)
        for s in SPECIES:
            page = ROOT / 'dist/species' / s['id'] / 'index.html'
            self.assertTrue(page.exists(), s['id'])
            html = page.read_text()
            for d in DESTINATIONS:
                if any(t['speciesId'] == s['id'] for t in d['targets']):
                    self.assertIn('href="' + paths[d['id']] + '"', html, (s['id'], d['id']))

    def test_glossary_preserves_existing_anchors_and_real_sources(self):
        self.assertGreaterEqual(len(TERMS), 500)
        html = (ROOT / 'dist/glossary/index.html').read_text()
        for kind in load('trip-types.json')['types']:
            for term in kind['glossary']:
                anchor = re.sub('[^a-z0-9]+', '-', term['term'].lower()).strip('-')
                self.assertIn('id="' + anchor + '"', html)
        for text in ['rockfish', 'yelloweye', 'lingcod', 'boilie', 'barra', 'mooching', 'tip-up']:
            self.assertIn(text, html.lower())
        for term in TERMS:
            for entry in term['entries']:
                self.assertTrue(entry['definition'])
                self.assertTrue(entry['sourceUrls'])
                self.assertTrue(entry['regions'])
        self.assertIn('id="glossary-region"', html)
        self.assertIn('aria-label="Glossary A to Z"', html)

    def test_taxon_and_broad_group_are_distinct(self):
        species = {s['id']: s for s in SPECIES}
        self.assertEqual(species['black-rockfish']['scientificName'], 'Sebastes melanops')
        self.assertEqual(species['yelloweye-rockfish']['scientificName'], 'Sebastes ruberrimus')
        self.assertEqual(species['lingcod']['scientificName'], 'Ophiodon elongatus')
        self.assertEqual(species['rockfish']['taxonType'], 'group')
        self.assertIsNone(species['rockfish']['scientificName'])


if __name__ == '__main__':
    unittest.main()
