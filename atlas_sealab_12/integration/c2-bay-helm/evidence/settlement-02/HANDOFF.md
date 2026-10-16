# CORE Settlement-02 / one mechanical station assessment

Baseline runtime f641b5f2eaf2305e9c86b851843304260a811078; final verification f560ee69dc9bd766bd024c7571f866230445a790/run38871214545. Public a2d4eecc12e7b4db14c7f94a6f6fc5088a4061ff remains unchanged. Existing owner branch atlas/core-c2-bay-helm-20261016. Local workdir /mnt/data/core-c2-bay-helm-20261016 is a reconstructed verified snapshot, not an original Mac checkout.

## Reproduced discrepancy, not a relabeled old runtime failure

Independent finding PR1/6211240695 applies to the final f560 records too. Final desktop returned-down frame87: value4.539987344409541e-5,target0,transitioning:true,receiverAccepted:true; JSON SHA2568802ae4c23b88701431bb0e733d33cb67fd2dc9db48380f3b811c93e67ef2b05. Final phone frame89: value4.5399892011139476e-5,target0,transitioning:true,receiverAccepted:true; JSON SHA256070307a3660e6ff1b30adfd41429f1c0a6152f2063d57c64472d224bd3a456ce. Both original archives and every376 manifest entry independently rehashed before reading. The earlier ef2 phone frame90 has different runtime identifiers and is not substituted for these final snapshots.

The old <=.01 receiver rule and >1e-5 telemetry rule disagree with 'any transition invalid'. The old exponential updater also never deliberately seats the bolster at an exact endpoint. Its roughly68mm body failure is a separate matter.

## Chosen semantics: actual endstop, not an expanded permission tolerance

`core-bay-bolster-endstop/1` preserves the old exponential fitting rate4/s and motion trajectory until the remaining normalized travel is <=1e-5 after a positive fittingDt. The existing updater then sets the actual fitting value to the exact requested0 or1 stop before setting both physical pivot angles. dt0/read paths never snap. This intentionally changes real evaluated geometry at the stop; it does not rename a still-moving pose as stable.

Maximum measured pivot radius over every original vertex of all8 actual descendants is0.2381472613364333m. The endpoint jump is bounded by2r sin((85deg*1e-5)/2)=3.5329857426565315e-6m. That is an authored numerical/mechanical endstop convention for this simulator, not engineering accuracy or a relaxed contact threshold.

Only exact value=target=0 AND both evaluated original pivot angles exactly0 with matching rest translation/unit scale/X-Y rotation/registered parents permits limited seated occupancy. Command departure invalidates before movement. Every nonzero residual remains transition/unavailable even below1e-5 if not actually seated by the updater. Exact1 is settled-UP but unavailable. Nonfinite, sparse, malformed or inconsistent source state is invalid. Small numerical matrix-composition tolerance1e-12 is not a positional contact allowance. Frozen physics does not freeze fittings.

`bolster-state.js` owns this single advance/classify/read definition. Generated adapter validity and telemetry use the same committed result. Matrix evaluation is refreshed before source decisions; no added RAF, timestep, physics or human solver. Current H4 87-probe gates, source patches, rig/profile/clip bytes, steering, time rebasing and main vessel physics stay unchanged. Full gameplay remains unavailable.

## Evidence and limits

The new candidate has its own source SHA, manifest and full file-table fingerprint. Reconstructed f641/f560 site tables are retained separately. Generated deltas are app.js (one existing fitting update line), c2 adapter/observer/bootstrap/policy, entry/manifest, plus the shared state module and a read-only test trace. No public live file or atlas_humans/** is changed.

Pure tests cover exact thresholds, invalid inputs, monotonic motion, both endpoints and no-snap reads. Actual-host tests record normal owner fitting updates during physics pause, command departure, both approaches, measured snap events, residual threshold neighborhoods, real pivot corruption rejection/restoration, identity and recovery. Full prior diagnostic regression runs on the new candidate as a separate gate. Trace density/performance are reported, not assumed from unit tests. All failed attempts remain evidence; success of an assessment means the measurement completed, not that a station is feasible.

ONE feasibility assessment reads actual original triangles and current down/up captures. It measures fixed versus articulated sources, exact support-center separations, all8 hinge descendant radii, the captured avatar envelope, and re-queries the existing node138 interior witness. Analytic hierarchy invariance plus an18-angle numerical sweep establish that no existing bolster angle moves138. This rules out the same captured H4 pose across the existing hinge degree of freedom, not all imaginable poses, human sizes or new station designs. No new H4/H5 pose solve, blind lift or source exclusion occurs. AABB sizes are descriptive, not clearance evidence.

The decision is exact unresolved design inputs unless joint body/support/reach feasibility is actually demonstrated. No new geometry is implicitly selected. Physical thickness of28 incomplete original triangle sets remains unknown;0m diagnostic sheet barriers are not volumetric solids. Only the existing finite node139 selected H4 cushion witness has the -3..+5mm diagnostic normal interval; no node138/deep garment exception.

## Owner boundaries / stop

ACK H4 source10ed9c2f8d0c392828f238e686bcc689517d34f9/profile2d8f1b640ac9ffad745e889984b264d55531b72d7f0496e611be4ca1ca824902, conditional PR1/6209504553 LIMITED_CONTACT_REVIEW only. H6 final417a3f8 remains61/61 clearance FAIL/max68.095mm, six fit alternatives failed. H5 region/sliding and H7 bytes are not adopted. No HUMANS edits, fitting task or duplicate worker. Yacht unavailable, MP off, no M6/assets transfer, services, credentials, permissions, purchases/accounts or public/default/full-body activation. Publish one bounded result and stop.
