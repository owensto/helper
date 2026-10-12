from pathlib import Path
import os,shutil
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent));S=R/'site'
v=(S/'viewer.js').read_text()
v=v.replace("function env(){","function env(){if(window.BAY_QUALITY){BAY_QUALITY.sync();dirty=true;return;}")
v=v.replace("Studio 05 · fishing + draft study","Studio 06 · coastal finish")
v=v.replace("['6 top rod holders','Single outboard','Draft not rated']","['300 hp-class study','6 top rod holders','GPS housing']")
v=v.replace("One outboard. Six top holders. The approved hull, plus a separately labeled shallow-bottom study.","The approved Bay silhouette. Refinished surfaces, a GPS antenna housing and coastal light. Engine installation and draft remain unqualified.")
v=v.replace('Compare Studio 04','Compare Studio 05').replace('Show Studio 05','Show Studio 06').replace('Studio 04 · comparison','Studio 05 · comparison')
v=v.replace("'Rod rack','Underbody']","'Rod rack','GPS','Underbody']")
v=v.replace("'Underbody':[[-.6,.0,0]","'GPS':[[.16,2.70,-.18],[.55,.4,.6],[-1.0,.9,.9]],'Hero':[[-.4,1.12,0],[8.7,3.5,2.75],[-1.05,.51,1.55]],'Underbody':[[-.6,.0,0]")
v=v.replace("'Rod rack','Underbody'].includes(n)","'Rod rack','GPS','Underbody'].includes(n)")
v=v.replace("id==='bay'?'#35556D':'#405A6D'","id==='bay'?(previousBay?'#35556D':'#486778'):'#405A6D'")
v=v.replace("renderer.shadowMap.needsUpdate=true;dirty=true;}","renderer.shadowMap.needsUpdate=true;window.BAY_QUALITY?.sync();dirty=true;}")
v=v.replace("if(dirty||playing){renderer.render(scene,camera)","if(dirty||playing){window.BAY_QUALITY?.sync();renderer.render(scene,camera)")
v=v.replace("topRodHolders:id==='bay'?(previousBay?4:6):null","topRodHolders:id==='bay'?6:null")
(S/'viewer.js').write_text(v)
h=(S/'index.html').read_text().replace('BAY STUDIO / 05','BAY STUDIO / 06')
h=h.replace('</head>','<script defer src="quality06.js"></script></head>')
h=h.replace('<h2>','<p><strong>Studio 06:</strong> a visual-quality pass on the standalone Bay. Six T-top holders remain, plus a low-profile GPS/GNSS antenna housing. The engine marking represents a 300 hp-class design preference, not a horsepower rating or manufacturer replica. 450 hp requires a separate installation study. The shallow-hull draft panel remains hypothetical.</p><h2>',1)
(S/'index.html').write_text(h);shutil.copy2(R/'quality06.js',S/'quality06.js')
css='''\n.identity{max-width:225px;text-shadow:0 1px 10px rgba(235,246,250,.9)}\n.identity h1{font-weight:400;letter-spacing:.025em}.presentation{gap:6px}.presentation button{backdrop-filter:blur(18px)}\n@media(max-width:899px){.identity{max-width:155px}.identity #caption,.identity .keyline,#tags{display:none}.presentation{top:130px;right:12px;flex-wrap:wrap;max-width:200px}.presentation button{font-size:10px}}\n'''
with (S/'style.css').open('a') as f:f.write(css)
