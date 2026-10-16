"""Public verifier v2: preserve every v1 gate, recognize normal CDN redirects.
The app, assets and network responses are never rewritten or substituted.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
source=(ROOT/'verify_public.py').read_text()
old="""        if not r.url.startswith(PREFIX):return
        name=urlsplit(r.url).path.removeprefix(urlsplit(PREFIX).path)
        if name not in EXPECTED:return
        item={'path':name,'status':r.status,'url':r.url}"""
new="""        # Binary assets may legitimately redirect to another CDN host. Match
        # the response's own request chain back to the immutable source URL.
        req=r.request;name=None
        while req:
            if req.url.startswith(PREFIX):
                candidate=urlsplit(req.url).path.removeprefix(urlsplit(PREFIX).path)
                if candidate in EXPECTED:name=candidate;break
            req=req.redirected_from
        if name is None:return
        item={'path':name,'status':r.status,'url':r.url}"""
assert source.count(old)==1
source=source.replace(old,new)
source=source.replace("ATLAS_D_SIM.inspect().frameCount > 4", "ATLAS_D_SIM.inspect().frameCount > 12")
old="          'deterministicTestStepUsed':False,'physicalHardwareBenchmark':False}"
new="          'deterministicTestStepUsed':False,'physicalHardwareBenchmark':False,\n          'pixelRatio':after.get('pixelRatio'),'detail':after.get('detail'),'softwareRendering':after.get('softwareRendering')}"
assert source.count(old)==1
source=source.replace(old,new)
exec(compile(source,str(ROOT/'verify_public.py'),'exec'),{'__name__':'__main__','__file__':str(ROOT/'verify_public.py')})
