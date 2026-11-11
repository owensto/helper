"""One content contract for trip eligibility, rendered metadata and sitemaps."""
from collections import Counter
from html import escape, unescape
from pathlib import Path
from urllib.parse import urlsplit
import json
import re
import xml.etree.ElementTree as ET

NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
VERIFIED = {'reviewed-source', 'existing-source-linked'}


def words(text):
    return re.findall(r"\b[\w]+(?:[’'-][\w]+)*\b", unescape(re.sub('<[^>]*>', ' ', text)))


def valid_source(url):
    p = urlsplit(url)
    return p.scheme in {'http', 'https'} and bool(p.netloc)


def description(trip):
    if trip.get('localDescription'):
        return '\n\n'.join(trip['localDescription']['paragraphs'])
    # Retain original local articles. Shared preparation modules are not descriptions.
    if trip.get('contentTier') == 'detailed-guide':
        return '\n\n'.join(s['text'] for s in trip['sections'])
    return ''


def description_key(trip):
    text = description(trip).casefold()
    for label in [trip.get('place', ''), trip.get('country', ''), trip.get('state', '')]:
        if label:
            text = text.replace(label.casefold(), ' place ')
    return ' '.join(words(text))


def evaluate(trip, species, duplicate=False):
    ids = {t['speciesId'] for t in trip.get('speciesEvidence', [])
           if t.get('status') in VERIFIED
           and species.get(t['speciesId'], {}).get('taxonType') == 'species'
           and any(valid_source(u) for u in t.get('sourceUrls', []))}
    count = len(words(description(trip)))
    path = trip.get('canonicalPath', '')
    canonical = path.startswith('/') and not path.startswith('//') and path.endswith('/') and not urlsplit(path).query and not urlsplit(path).fragment
    reasons = []
    if len(ids) < 2:
        reasons.append(f'Only {len(ids)} verified individual target species with source links; at least 2 required')
    if not trip.get('season', '').strip():
        reasons.append('Season section missing')
    if count < 120:
        reasons.append(f'Water-specific description has {count} words; at least 120 required')
    if duplicate:
        reasons.append('Water-specific description duplicates another trip after place-name normalization')
    if not canonical:
        reasons.append('Canonical URL path missing or invalid')
    return {'eligible': not reasons, 'verifiedSpeciesIds': sorted(ids),
            'descriptionWords': count, 'seasonSection': bool(trip.get('season', '').strip()),
            'canonicalPath': path, 'reasons': reasons}


def compile_into(trips, root):
    species = {s['id']: s for s in json.loads((root / 'src/species-catalog.json').read_text())['species']}
    local = json.loads((root / 'src/trip-descriptions.json').read_text())['trips']
    for trip in trips:
        if trip['id'] in local:
            record = local[trip['id']]
            assert record['place'] == trip['place'], trip['id']
            assert record['sourceUrls'] and all(valid_source(u) for u in record['sourceUrls']), trip['id']
            assert set(record['sourceUrls']) <= {u for t in trip['speciesEvidence'] for u in t['sourceUrls']}, trip['id']
            trip['localDescription'] = record
    counts = Counter(description_key(t) for t in trips if description(t))
    for trip in trips:
        assessment = evaluate(trip, species, counts[description_key(trip)] > 1)
        trip['indexAssessment'] = assessment
        trip['indexEligible'] = assessment['eligible']


def install(pages, trips, origin, dist):
    audit = []
    for trip in trips:
        path = trip['canonicalPath']
        page = pages[path]
        assessment = dict(trip['indexAssessment'])
        assessment['reasons'] = list(assessment['reasons'])
        if not origin:
            assessment['reasons'].append('Production canonical origin is not configured')
        if page.get('redirectTo'):
            assessment['reasons'].append('Trip route redirects to another URL')
        # Render the description separately from shared gear modules and navigation.
        local = trip.get('localDescription')
        if local:
            module = '<section class="wrap prose-block" id="local-water-description"><h2>About this water</h2>'
            module += ''.join('<p>' + escape(p) + '</p>' for p in local['paragraphs'])
            module += '<p class="small">Fishery references: ' + ' · '.join(
                '<a href="' + escape(u, quote=True) + '">Source ' + str(i) + '</a>'
                for i, u in enumerate(local['sourceUrls'], 1)) + '</p></section>'
            marker = '<section class="wrap profile-species"'
            assert marker in page['body'], trip['id']
            page['body'] = page['body'].replace(marker, module + marker, 1)
            page['modified'] = local['reviewed']
        # The same season text is rendered by both the regular and long-guide paths.
        if not re.search(r'<h[23][^>]*>[^<]*(?:When|Season|season)', page['body']):
            assessment['reasons'].append('Season section is absent from the rendered page')
        assessment['eligible'] = not assessment['reasons']
        page['noindex'] = not assessment['eligible']
        page['indexAssessment'] = assessment
        audit.append({'id': trip['id'], 'place': trip['place'], **assessment})
    (dist / 'index-audit.json').write_text(json.dumps(audit, indent=2) + '\n')


def write_sitemaps(dist, pages, origin, reviewed, limit=1000):
    entries = [(p, x) for p, x in sorted(pages.items()) if not x['noindex'] and not x.get('redirectTo')]
    chunks = [entries[i:i + limit] for i in range(0, len(entries), limit)] or [[]]
    for i, chunk in enumerate(chunks, 1):
        tree = ET.Element('urlset', xmlns=NS)
        for path, page in chunk:
            row = ET.SubElement(tree, 'url')
            ET.SubElement(row, 'loc').text = origin + path
            ET.SubElement(row, 'lastmod').text = page.get('modified', reviewed)
        name = f'sitemap-{i}.xml' if len(chunks) > 1 else 'sitemap.xml'
        ET.ElementTree(tree).write(dist / name, encoding='utf-8', xml_declaration=True)
    if len(chunks) > 1:
        tree = ET.Element('sitemapindex', xmlns=NS)
        for i in range(1, len(chunks) + 1):
            row = ET.SubElement(tree, 'sitemap')
            ET.SubElement(row, 'loc').text = origin + f'/sitemap-{i}.xml'
        ET.ElementTree(tree).write(dist / 'sitemap.xml', encoding='utf-8', xml_declaration=True)


def sitemap_entries(dist):
    """Read either sitemap form; shared by release checks and IndexNow preparation."""
    root = ET.parse(Path(dist) / 'sitemap.xml').getroot()
    if root.tag.endswith('sitemapindex'):
        result = {}
        for loc in root.findall('{*}sitemap/{*}loc'):
            child = ET.parse(Path(dist) / urlsplit(loc.text).path.lstrip('/')).getroot()
            result.update({u.find('{*}loc').text: u.findtext('{*}lastmod') for u in child})
        return result
    return {u.find('{*}loc').text: u.findtext('{*}lastmod') for u in root}
