"""Close mobile visual/input findings; retain the first failed public record."""
from pathlib import Path
R=Path(__file__).resolve().parent.parent;S=R/'site';M=R/'mobile'
def once(s,a,b):
 assert s.count(a)==1,(a[:80],s.count(a))
 return s.replace(a,b)
s=(S/'app.js').read_text()
# Temporary input cleanup must not cancel an intentionally engaged heading hold.
s=once(s,"helm:AtlasMobile.holdChannel(v=>vessel.command('helm',v))","helm:AtlasMobile.holdChannel(v=>{if(v!==0||!vessel.headingHold)vessel.command('helm',v);})")
s=once(s,"runtime:T.REVISION,multiplayer:false","runtime:T.REVISION,headingHold:vessel.headingHold,pauseReason:manualNotice,multiplayer:false")
s=once(s,"$('paused-banner').hidden=!s.paused;","$('paused-banner').hidden=!s.paused;document.body.classList.toggle('voyage-paused',s.paused);$('paused-title').textContent=manualNotice.includes('interruption')?'Paused after interruption':manualNotice.includes('hidden')?'Paused in background':'Voyage paused';")
s=once(s,"if(name==='exterior'&&portrait)p=[-113,72,172];","if(name==='exterior'&&portrait)p=[-124.3,79.2,189.2];")
(S/'app.js').write_text(s)
s=(S/'mobile.js').read_text();s=once(s,"function close(returnFocus=true){document.querySelectorAll", "function close(returnFocus=true){B.clearInputs();document.querySelectorAll");(S/'mobile.js').write_text(s)
h=(S/'index.html').read_text();h=once(h,'>← Port</button>','><span aria-hidden="true">←</span><small>Port</small></button>');h=once(h,'>Starboard →</button>','><span aria-hidden="true">→</span><small>Starboard</small></button>');(S/'index.html').write_text(h)
with (S/'mobile.css').open('a') as f:f.write('''\n/* Recorded first-pass polish: no overflowed steering labels or duplicate pause notices. */
@media(max-width:680px), (max-height:600px) and (pointer:coarse){
 button.mobile-only{align-items:center;justify-content:center}
 .steering-group #port-hold,.steering-group #starboard-hold{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
 .steering-group .ends button span{font-size:21px;line-height:1}.steering-group .ends button small{font-size:10px;line-height:1.1;letter-spacing:0}
 body.voyage-paused #notice{display:none}
}
@media(orientation:landscape) and (max-height:600px) and (pointer:coarse){#paused-banner{top:auto;bottom:12px}}
''')
v=(M/'verify.py').read_text()
v=once(v,"p.wait_for_function('window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE',timeout=180000)","p.wait_for_function('window.ATLAS83_APP?.ready && window.ATLAS83_MOBILE',timeout=180000)\n   p.evaluate(\"window.__chartBoundary=[];for(const capture of [true,false])document.addEventListener('click',e=>{if(e.target.closest?.('#chart-toggle'))__chartBoundary.push({phase:capture?'before':'after',paused:ATLAS83_APP.inspect().state.paused,time:ATLAS83_APP.inspect().state.time,reason:ATLAS83_APP.inspect().pauseReason})},capture)\")")
v=once(v,"notice=p.locator('#notice').inner_text();assert 'long interruption' in notice,notice", "notice=p.evaluate('ATLAS83_APP.inspect().pauseReason');assert 'long interruption' in notice,notice")
v=once(v,"recoveries.append(notice);assert len(recoveries)<=3;tap('#resume')", "recoveries.append(notice);assert len(recoveries)<=3;tap('#pause')")
v=once(v,"tap('#chart-toggle');ck('live chart remains unpaused',not state()['paused']);motion(.25);tap('[data-close=\"chart\"]')", "tap('#m-docking' if mobile else '#docking-toggle');tap('#hold');ck('heading hold engaged',p.evaluate('ATLAS83_APP.inspect().headingHold'));tap('[data-close=\"docking\"]')\n   tap('#chart-toggle');boundary=p.evaluate('__chartBoundary');row['chartClickBoundary']=boundary;ck('chart action preserves paused state synchronously',len(boundary)==2 and boundary[0]['paused']==boundary[1]['paused'],boundary);ck('opening and closing sheets preserves heading hold',p.evaluate('ATLAS83_APP.inspect().headingHold'));motion(.25);ck('chart live with actual advancing host after any recorded interruption',not state()['paused']);tap('[data-close=\"chart\"]')")
(M/'verify.py').write_text(v)
print('MOBILE_REFINEMENT_02 applied; no model/dynamics edits or interruption-guard weakening')
