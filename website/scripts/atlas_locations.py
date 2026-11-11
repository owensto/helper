"""Persist location identity before either the full or compact browser catalog is written."""
import json


def enrich(data, root):
    locations = json.loads((root/'src/atlas-locations.json').read_text())['locations']
    for destination in data['destinations']:
        location = locations.get(destination['id'])
        destination['coordinates'] = [location['lon'], location['lat']] if location else None
        destination['locationPrecision'] = location['precision'] if location else 'unresolved'
        destination['locationSource'] = location['source'] if location else None
