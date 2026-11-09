/* Sources, scope labels and a reference-performance dashboard for the actual app. */
(()=>{'use strict';const P=window.BayPerformance,D=P.data,$=s=>document.querySelector(s);
const n=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'—';let B,last=-1,notified=false;
const wait=()=>{if(!window.BAYPLAY?.ready){setTimeout(wait,100);return}init()};wait();
function init(){B=window.BAYPLAY;
 const button=document.createElement('button');button.id='performance-open';button.textContent='Performance & source';button.className='quiet';$('.camera-row').append(button);
 const section=document.createElement('section');section.id='performance-band';section.innerHTML=`
 <div class="perf-heading"><label for="performance-mode">PERFORMANCE MODE</label><select id="performance-mode"><option value="reference">Measured F300 reference</option><option value="experimental">Experimental coastal handling</option><option value="450" disabled>450 hp — no matched dataset</option></select><button id="perf-details">Data & tests ↗</button></div>
 <p class="reference-attribution">Sportsman Masters 247 · Yamaha F300XSB2 · <b>Not ATLAS-tested</b></p>
 <div class="perf-stats"><div><strong id="perf-mph">—</strong><small>SIM SPEED / MPH</small></div><div><strong id="perf-flow">—</strong><small>CURVE RATE / US GPH</small></div><div><strong id="perf-balance">35.00</strong><small>REFERENCE FUEL / US GAL</small></div><div><strong id="perf-range">—</strong><small>SCENARIO RANGE / NMI</small></div></div>
 <div id="perf-status" role="status">REFERENCE READY</div><small id="perf-footnote">RPM curve from a different boat. Transients, turns and seas remain modeled.</small>
 `;$('#drive-panel').insertBefore(section,$('.drive-inputs'));
 const dialog=document.createElement('dialog');dialog.id='performancedialog';dialog.innerHTML=`
 <button class="close" id="performance-close" aria-label="Close performance">×</button><p class="eyebrow">PERFORMANCE LAB / 03 · MEASURED REFERENCE</p>
 <h2>Real sea-trial points.<br>Clearly bounded simulation.</h2>
 <p><b>${D.title}</b><br>Tested 28 June 2023 · 4,591 lb total test weight · 2 people · 35 US gal aboard.</p>
 <div class="perf-callout">You are driving the ATLAS visual model with a <b>different boat’s published steady-speed curve</b>. No measured ATLAS hull/engine performance exists in this release.</div>
 <div class="test-buttons"><button data-run-rpm="3500">Run 3,500 RPM</button><button data-run-rpm="5800">Run 5,800 RPM</button><button id="run-acceleration">Timed 0–30 mph</button><button id="exit-reference">Return to basin</button></div>
 <p id="trial-result">Tests reset to a fictional straight lane. RPM/speed/fuel targets are published data; the transition between speeds is modeled. A completed run pauses the app for review.</p>
 <div class="table-scroll"><table class="perf-table"><thead><tr><th>RPM</th><th>mph</th><th>kn*</th><th>US gal/h</th><th>MPG†</th></tr></thead><tbody>${D.rows.map(r=>`<tr data-rpm="${r.rpm}"><td>${r.rpm.toLocaleString()}</td><td>${r.mph.toFixed(1)}</td><td>${(r.mph*P.C.mphToMps*P.C.mpsToKn).toFixed(2)}</td><td>${r.gph.toFixed(1)}</td><td>${r.publishedMpg.toFixed(2)}</td></tr>`).join('')}</tbody></table></div>
 <p class="fineprint">*Knots are converted from published mph. †MPG is reproduced as published; rounding means it may differ slightly from mph ÷ GPH. Lookup uses linear interpolation of mph and GPH between the 11 rows. No fuel extrapolation below 1,000 or above 5,800 RPM.</p>
 <h3>Range / fuel scenario</h3><div class="fuel-settings"><label>Scenario fuel, US gal<input id="perf-fuel-input" type="number" min="0" max="65" step=".1" value="35"></label><label>Hold-back, US gal<input id="perf-reserve-input" type="number" min="0" max="65" step=".1" value="6.5"></label><button id="apply-fuel">Reset fuel scenario</button></div>
 <p class="fineprint">65 US gal is the reference boat’s capacity, not an ATLAS tank specification. The 6.5 gal hold-back is an editable software assumption, not a passage-planning recommendation. Range = (scenario balance − hold-back) ÷ curve GPH × reference knots. It is a one-way constant-condition estimate, not safe round-trip range. Fuel changes adjust this bookkeeping scenario only; they do not recalculate the tested hull weight or its performance curve.</p>
 <p id="perf-fuel-error" role="alert" style="color:#9b3327"></p><p id="fuel-coverage">Idle, neutral and reverse fuel were not published. Their unmetered duration is shown, not filled with fabricated consumption.</p>
 <h3>What is actually measured?</h3><p><b>Published:</b> steady forward RPM/speed/fuel points, 3.50 s time to plane and 7.70 s 0–30 mph.<br><b>Derived:</b> interpolated values, unit conversions and constant-speed range.<br><b>Fitted, not independently validated:</b> one acceleration-response parameter matching the 7.70 s endpoint. No full acceleration trace or objective planing criterion was published.<br><b>Uncalibrated:</b> throttle-to-RPM mapping, startup, low-speed behavior, steering, reverse, trim, coasting, waves, contacts and depth.</p>
 <p><b>Reference mode</b> locks out added wind/current and trim effects to avoid double-counting unknown test conditions. The bulletin records 10–15 mph wind, not a calm-water trial; this app reproduces its tabulated averages, not the original weather. Select <b>Experimental coastal handling</b> to use the old free trim/current/wave response without measured-performance labels.</p>
 <details><summary>Reference rig and source conditions</summary><p>300 hp · 4.2 L · estimated engine weight 611 lb · gear ratio 1.75:1. Saltwater Series II 15¼ × 18 in propeller. Test air/water 89°F / 85°F, sea-level elevation. ${D.equipment} This describes the reference rig, not an installed or approved ATLAS specification.</p></details>
 <p><a href="${D.sourceUrl}" target="_blank" rel="noopener">Yamaha original bulletin ↗</a> · <a href="${D.crosscheckUrl}" target="_blank" rel="noopener">Boat-maker cross-check ↗</a> · <a href="performance_data.json" target="_blank">Dataset / assumptions</a> · <a href="sea_trial_reference.csv" download>CSV</a></p>
 <p class="fineprint">The publisher describes these results as approximate and dependent on weight, setup, conditions and operator. 450 hp and sub-foot ATLAS draft are not inferred from this 300 hp dataset.</p>`;document.body.append(dialog);
 button.onclick=()=>{update(true);dialog.showModal()};$('#perf-details').onclick=button.onclick;$('#performance-close').onclick=()=>dialog.close();
 $('#performance-mode').onchange=e=>{B.setPerformanceMode(e.target.value);update(true)};
 document.querySelectorAll('[data-run-rpm]').forEach(b=>b.onclick=()=>{dialog.close();notified=false;B.startReferenceTest(Number(b.dataset.runRpm),'steady');update(true)});
 $('#run-acceleration').onclick=()=>{dialog.close();notified=false;B.startReferenceTest(5800,'acceleration');update(true)};
 $('#exit-reference').onclick=()=>{dialog.close();B.reset();update(true)};
 $('#apply-fuel').onclick=()=>{const a=Number($('#perf-fuel-input').value),r=Number($('#perf-reserve-input').value);if(!$('#perf-fuel-input').value.trim()||!$('#perf-reserve-input').value.trim()||!Number.isFinite(a)||!Number.isFinite(r)||a<0||a>65||r<0||r>a){$('#perf-fuel-error').textContent='Enter finite values: fuel 0–65 gal and hold-back no greater than fuel.';return}$('#perf-fuel-error').textContent='';B.state.fuelStartGal=a;B.state.fuelRemainingGal=a;B.state.reserveGal=r;B.state.referenceBurnGal=0;B.state.unmeteredSeconds=0;update(true)};
 window.BAYPERF_UI={update,drawEngine};update(true);
}
function update(force=false){if(!B)return;if(!force&&performance.now()-last<180)return;last=performance.now();const s=B.state,p=s.performance(),ref=p.mode==='reference',r=p.lookup;
 $('#performance-mode').value=p.mode;$('#trim').disabled=ref;$('#conditions').disabled=ref;$('#conditions').value=s.environment;
 const trial=s.referenceTrial,active=!!trial&&!trial.complete;
 ['#throttle','#steering','#left','#right','#center','#engine','#stop',...['[data-gear="-1"]','[data-gear="0"]','[data-gear="1"]']].forEach(k=>$(k).disabled=active);
 $('#perf-mph').textContent=n(s.speedOverGround/P.C.mphToMps);$('#perf-flow').textContent=ref?n(r?.gph):'—';
 $('#perf-balance').textContent=ref?(p.balanceIsUpperBound?'≤ ':'')+n(p.fuelRemainingGal,2):'—';
 $('#perf-range').textContent=ref?(p.range&&p.balanceIsUpperBound?'≤ ':'')+n(p.range?.nauticalMiles):'—';$('#perf-status').textContent=p.status;$('#perf-status').dataset.match=p.settled?'true':'false';
 $('#perf-footnote').textContent=!ref?'Experimental handling. Speed, RPM and fuel performance are not source-calibrated.':r?`Target ${n(r.mph)} mph / ${n(r.kn)} kn · ${r.measuredRow?'published row':'interpolated'} · ${n(p.unmeteredSeconds,0)} s unmetered${p.balanceIsUpperBound?' · balance/range upper bounds':''}`:'No published fuel rate for startup, idle, neutral or reverse. Unmeasured fuel is not invented.';
 $('#fuel-coverage').textContent=`Integrated forward curve estimate: ${n(p.curveFuelUsedGal,3)} US gal. Unmetered running time: ${n(p.unmeteredSeconds,1)} s. ${p.balanceIsUpperBound?'Balance and scenario range are upper bounds because unmetered burn is excluded.':'All integrated fuel remains a reference-curve estimate, not measured consumption.'}`;
 if(trial){const line=`${trial.kind==='acceleration'?'0–30 fit check':'Reference lane'} · ${trial.phase} · ${n(trial.time,1)} simulation seconds${trial.zeroTo30===null?'':` · 0–30: ${n(trial.zeroTo30,2)} s (fitted to 7.70 s)`}`;$('#trial-result').textContent=line;$('#challenge').textContent=line;if(trial.complete&&!notified){notified=true;B.pauseTrial();}}
 else{$('#trial-result').textContent='Runs reset to a fictional straight lane and pause on completion. 0–30 is a fitted endpoint exercise, not an independent test.';notified=false;}
 document.querySelectorAll('.perf-table [data-rpm]').forEach(tr=>tr.classList.toggle('current',r&&Math.abs(Number(tr.dataset.rpm)-s.rpm)<30));
}
function drawEngine(e){if(!B||B.state.performanceMode!=='reference')return;const s=B.state,p=s.performance(),r=p.lookup;
 e.fillStyle='#112b35';e.fillRect(0,0,512,320);e.fillStyle='#93c9bd';e.font='bold 16px sans-serif';e.fillText('F300 REFERENCE / NOT ATLAS-TESTED',18,28);
 e.fillStyle='#e4eee5';e.font='bold 45px sans-serif';e.fillText(Math.round(s.rpm)+'',18,88);e.font='18px sans-serif';e.fillText('RPM',173,88);e.fillText(n(s.speedOverGround/P.C.mphToMps)+' mph',305,87);
 e.strokeStyle='#487079';e.beginPath();e.moveTo(18,106);e.lineTo(492,106);e.stroke();e.fillStyle='#91b6b9';e.font='14px sans-serif';e.fillText('CURVE FUEL / US GAL PER HOUR',18,133);e.fillStyle='#edf3e9';e.font='bold 34px sans-serif';e.fillText(n(r?.gph),18,174);
 e.fillStyle='#91b6b9';e.font='14px sans-serif';e.fillText('SCENARIO RANGE / NMI',275,133);e.fillStyle='#edf3e9';e.font='bold 34px sans-serif';e.fillText((p.range&&p.balanceIsUpperBound?'≤ ':'')+n(p.range?.nauticalMiles),275,174);
 e.font='15px sans-serif';e.fillStyle='#b6c9c1';e.fillText('FUEL BALANCE '+(p.balanceIsUpperBound?'≤ ':'')+n(p.fuelRemainingGal,2)+' gal',18,215);e.fillText('HOLD-BACK '+n(s.reserveGal)+' gal',275,215);
 e.font='13px sans-serif';e.fillStyle=p.settled?'#9bd3ba':'#e5bd86';e.fillText(p.status,18,254);e.fillStyle='#95b3b5';e.font='12px sans-serif';e.fillText('SPORTSMAN MASTERS 247 · TEST 28 JUN 2023',18,284);e.fillText('IDLE/REVERSE UNMETERED · RANGE IS A SCENARIO',18,306);
}
})();
