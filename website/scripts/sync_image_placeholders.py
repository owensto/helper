"""Create tiny inline posters before the production build. Requires Pillow locally."""
import base64
import io
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
XMP = b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/></rdf:RDF></x:xmpmeta>'
posters = {}
for directory in ('scenes','trips','previews'):
    for file in sorted((ROOT/'public/media'/directory).glob('*-640.webp')):
        with Image.open(file) as image:
            image = image.convert('RGB')
            image.thumbnail((24,16),Image.Resampling.LANCZOS)
            data = io.BytesIO()
            image.save(data,format='WEBP',quality=30,xmp=XMP)
        key = '/media/'+directory+'/'+file.name.rsplit('-',1)[0]
        posters[key] = 'data:image/webp;base64,'+base64.b64encode(data.getvalue()).decode()
target = ROOT/'public/media/previews/placeholders.json'
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(posters,separators=(',',':'))+'\n')
print(json.dumps({'inlinePosters':len(posters),'bytes':target.stat().st_size}))
