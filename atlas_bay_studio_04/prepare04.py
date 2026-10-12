from pathlib import Path
import os,json,hashlib
R=Path(os.environ.get('FLEET_ROOT',Path(__file__).resolve().parent));S=R/'site'
p=S/'index.html';s=p.read_text().replace('BAY STUDIO / 03','BAY STUDIO / 04').replace('ATLAS Bay 25 — Studio 03','ATLAS Bay 25 — Studio 04')
s=s.replace('Compare previous Bay','Compare Studio 03')
s=s.replace('<h2>Five assets.', '<p><strong>Studio 04 is a close-up refinement of the approved Studio 03 Bay.</strong> The hull and original hardtop meshes are preserved. Tailored seating, demonstration-only instruments, console fittings and service details are added. Explorer and the other four assets remain unchanged. This Bay is not yet integrated into Explorer.</p><h2>Five assets.')
s=s.replace('Studio 03 refines Bay 25 only.','Studio 04 refines Bay 25 only.').replace('The revised fishing boat has a rebuilt hull and cockpit, integrated rigid top, wraparound windshield and matched seating. Use Compare previous Bay to compare geometry from the same camera.','This pass retains the approved hull and fixed top. Compare Studio 03 holds camera, lighting, and animation position; the displays contain illustrative artwork, not navigation data.')
p.write_text(s)
p=S/'viewer.js';s=p.read_text().replace("sub:'Studio 03 · fishing tender'","sub:'Studio 04 · tailored detail'").replace('Rebuilt hull. Integrated hardtop. Wraparound glass. The first dedicated one-by-one refinement.','Approved hull. Tailored bolsters. Refined helm and hardware. The same fishing-first Bay, closer up.')
s=s.replace("views:['Hero','Profile','Bow','Stern','Helm','Casting deck','T-top']","views:['Hero','Profile','Bow','Stern','Helm','Seating','Casting deck','T-top','Deck hardware','Outboard']")
s=s.replace("'T-top':[[-.1,2.17,0],[3.9,2.8,3],[.6,.9,1.5]]","'T-top':[[-.25,2.30,0],[3.25,1.1,2.3],[-.8,-.10,1.4]],'Seating':[[-1.65,1.03,0],[1.9,1.4,1.7],[-1.3,.43,.85]],'Deck hardware':[[1.55,.81,0],[3,1.1,2.7],[-.4,1.4,1.0]],'Outboard':[[-3.8,.45,0],[2.6,1.95,2.3],[-1.4,.65,1.1]]")
s=s.replace("'Helm':[[-.80,1.25,0],[3.5,2.6,2.9],[-1,.55,1.3]]","'Helm':[[-.68,1.2,0],[1.75,1.5,1.72],[-1.4,.46,.75]]")
s=s.replace("previousBay?'Show refined Bay':'Compare previous Bay'","previousBay?'Show Studio 04':'Compare Studio 03'")
s=s.replace("(id==='bay'&&!previousBay?'#35556D':'#405A6D')","(id==='bay'?'#35556D':'#405A6D')")
# Dataset drives one camera/pose for comparison; caption indicates version instead of misleading.
s=s.replace("$('#subtitle').textContent=a.sub;","$('#subtitle').textContent=(id==='bay'&&previousBay)?'Studio 03 · comparison':a.sub;")
s=s.replace("'Fishing bay','Stern','Bow','Helm','Casting deck','T-top'","'Fishing bay','Stern','Bow','Helm','Seating','Casting deck','T-top','Deck hardware','Outboard'")
p.write_text(s)
(S/'README_STUDIO04.txt').write_text('Bay 25 Studio 04: retained Studio 03 hull/top; tailored seating, instruments, and close-up detailing. New Bay is standalone; Explorer still carries Fleet 02. Compare Studio 03 uses the same camera, palette, lighting and pose. Original instrumentation graphics are demonstration artwork only. No construction or operational qualification.\n')
