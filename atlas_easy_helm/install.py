#!/usr/bin/env python3
"""Build an isolated review site from exact public Beaufort13; never patch in place.
Usage: python install.py --base /path/to/public13/site --out /path/to/new-review
No credentials, network, dependency installation, physics changes or deployment.
"""
from __future__ import annotations
import argparse, hashlib, json, shutil
from pathlib import Path

HERE=Path(__file__).resolve().parent
FILES=('policy.js','easy-helm.js','easy-helm.css','beaufort13-adapter.js')

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def build(base: Path, out: Path) -> dict:
    base=base.resolve();out=out.resolve()
    if not base.is_dir():
        raise ValueError('Base must be the extracted public Beaufort13 site directory.')
    if out.exists() or base==out or base in out.parents or out in base.parents:
        raise ValueError('Output must be a new, separate directory, outside the base directory.')
    pins=json.loads((HERE/'base-pins.json').read_text())
    for name,expected in pins['files'].items():
        p=base/name
        if not p.is_file() or digest(p)!=expected:
            raise ValueError('Base mismatch: '+name+'. Do not use this adapter on CORE14 or another build.')
    original={str(p.relative_to(base)):digest(p) for p in base.rglob('*') if p.is_file()}
    text=(base/'index.html').read_text()
    if 'easy-helm/' in text or text.count('</head>')!=1:
        raise ValueError('Unexpected or already modified entry document.')
    for name in FILES:
        if not (HERE/name).is_file():raise ValueError('Missing add-on file: '+name)
    shutil.copytree(base,out)
    (out/'easy-helm').mkdir()
    for name in FILES:shutil.copy2(HERE/name,out/'easy-helm'/name)
    tags='\n<link rel="stylesheet" href="easy-helm/easy-helm.css">\n'+''.join(
        f'<script defer src="easy-helm/{name}"></script>\n' for name in ('policy.js','easy-helm.js','beaufort13-adapter.js'))
    (out/'index.html').write_text(text.replace('</head>',tags+'</head>'))
    unchanged=[name for name,h in original.items() if name!='index.html' and digest(out/name)==h]
    if len(unchanged)!=len(original)-1:raise RuntimeError('Unexpected owner-asset change.')
    report={'status':'UNPUBLISHED_REVIEW','baseCommit':pins['commit'],'baseFiles':len(original),
            'unchangedOwnerFiles':len(unchanged),'changedOwnerFiles':['index.html'],
            'entryDelta':'Add four additive stylesheet/script references only',
            'physicsModified':False,'waterModified':False,'captainModified':False,
            'browserVerified':False,'touchVerified':False,'providerPlaybackVerified':False,
            'addedFiles':{name:digest(HERE/name) for name in FILES}}
    (out/'easy-helm-review.json').write_text(json.dumps(report,indent=2)+'\n')
    return report

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--base',type=Path,required=True);ap.add_argument('--out',type=Path,required=True)
    args=ap.parse_args()
    try:print(json.dumps(build(args.base,args.out),indent=2))
    except (ValueError,OSError,RuntimeError) as exc:ap.exit(1,str(exc)+'\n')
