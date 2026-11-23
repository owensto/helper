"""An extra day cannot be advertised as a complete visitor licence."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from licenses import cheapest

records = json.loads((ROOT / 'src/licenses.json').read_text())['jurisdictions']
by_id = {r['id']: r for r in records}
for key, expected in [('us-georgia', 10), ('us-idaho', 22.75), ('us-nevada', 15)]:
    assert cheapest(by_id[key])['price'] == expected, key
assert cheapest({'options': [{'who': 'non-resident', 'price': 7, 'supplementOnly': True}]}) is None
assert len(by_id['us-idaho']['options']) == 4
print('Visitor starting prices exclude additional-day supplements.')
