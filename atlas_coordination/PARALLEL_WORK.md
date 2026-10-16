# ATLAS — active ownership and acceptance record

Coordination/review revision: 2026-10-16. Read current PR #1 and PR #2 comments at every task boundary; later explicit claims/results supersede this snapshot.

This revision replaces the initial PREPARED-only roster and launch instructions. Multiplayer, the original yacht/submarine and HUMANS are active workstreams. The older launch prompts are retired: **do not launch duplicate workers or execute the initial UI/audio/QA dispatch merely because it was once proposed.** No separate UI/audio/QA execution is established by that old packet.

Owen's supplied work horizon ends 2026-10-16 11:38 UTC. This record does not schedule work or claim autonomous monitoring. This chat's assignment is coordination/review only. CORE and yacht were reported generating; consume this record at a natural handoff, not by interrupting/restarting them.

## 1. Ownership acknowledged by this coordinator

| Owner | Protected boundary | Current evidence / acknowledgment |
|---|---|---|
| CORE / existing builder | Coupled vessel physics, boat/water graphics, control semantics, shared simulation/world/time, current captain integration, host/bootstrap and integrated frontend release | Authority confirmed by Owen and explicitly acknowledged by Chat 3. CORE's new versioned integration descriptor and exact per-task source/workdir/file claim are still awaited at its natural boundary. Do not infer them from moving `main`. |
| Original yacht worker | `atlas_d_simulator_01/**` and its existing dedicated `.github/workflows/atlas-d-simulator-01.yml`; original yacht controller, footprint, conversion, deck geometry and attachment/contact definitions; clearly labeled isolated preview | Owner-authored HANDOFF/README establish its isolation and controller. Deck ownership is accepted; actual attachment coordinates/capabilities and Sea Lab 12 mapping remain pending. Existing preview publication is not integrated-release ownership or new publication permission. |
| Multiplayer / Chat 3 | `atlas_multiplayer/**` only; room service/protocol, client transport/interpolation, multiplayer controls and verification | Explicit M1 claim/ACK in PR #2 comment 6207983343. Client-owned cooperative/noncompetitive boats; no server-authoritative shared physics, remote physics stepping, shared collisions/damage or shared crews. CORE owns integrated frontend publication. |
| HUMANS | **Reserve `atlas_humans/**` exclusively** after the worker's PR #1 claim; source/tests/local preview/assets and licenses/evidence/integration README only | RUNNING, local task `01a142ed-0182-71c4-9393-7bdfe248f0fe`, title `Build Atlas human physics`. Worker claim 6207977321 and orchestrator confirmation 6207985116 supersede PREPARED. No second human/captain implementation. |
| This coordination chat | `atlas_coordination/PARALLEL_WORK.md` on the existing coordination branch and PR #1/#2 coordination records | Review and records only. No product-code changes, test dispatch, worker launch, merge or deployment. |

A reserved directory is an exclusive ownership boundary, **not a substitute for an exact per-iteration filename list**. Each owner must enumerate files it will create/edit and any generated outputs. Proposed adapters outside an owner's boundary require the receiving owner to implement or explicitly approve them. Do not grant another worker write access to a whole host file to solve a small integration need.

CORE retains the existing Sea Lab 12 captain and its generation/fixup sources. HUMANS is auditing/reusing `captain12` from the Sea Lab 12 transport; it must not overwrite CORE's current captain or add a second visible captain. Integrate through a reviewed narrow attachment/pose adapter. Yacht supplies its own deck/helm attachments; do not reuse Bay coordinates, footprint or draft blindly.

## 2. Source/result and workspace ledger

| Workstream | Known immutable source/reference | Known result/evidence | Branch and workspace |
|---|---|---|---|
| CORE | Tested source `5c62a713b014b97a47bb65b65ec05f382a23ac77` | Run `38849136102` succeeded for desktop and phone. Candidate was built/tested on localhost. Artifacts: desktop `12024558013`, phone `12023644854`. This run establishes no later integrated/public result SHA. | Workflow head branch `main` and CI workdir are not proof of the developer's isolated checkout. Current development branch/workdir, uncommitted reservations and next result SHA remain to be posted. |
| Yacht | Latest checked run source `edeb60f130bf7125a3056d02220e9108a1ddf7a0`; preview host and original asset remain pinned to Sea Lab 11 `ddcbf408df153cfdeb55e30ba4a04ced30feb9e8` | Published preview result `48b9bef038ab2e422b6677d7ca9db4879419a3f9`; successful run `38849454935`; artifact `12023944504` | Release workflow head branch `main` is observed, not an isolated development-workdir attestation. Worker must report its actual branch/workdir and exact next files. |
| Multiplayer | Claimed current head `98f535cf7d01ba8a5cde8acfc4d3378990dbd77e`; historical Sea Lab 11 reference `ddcbf408df153cfdeb55e30ba4a04ced30feb9e8` | M1 transport/dependency/socket verification claimed and running; no newer result SHA or passing socket/browser report was visible at this review | `atlas-d/multiplayer-chat3`; worker reports reconstructing an isolated checkout from the verified branch after a runtime change. Exact resulting workdir and filename list pending. |
| HUMANS | Audit reference `99c5300c1f10e5c25c7be380fc1e015a727fca81`; expressly NOT an agreed integration baseline | First slice claimed: vessel-local contact/pose adapter and measured isolated helm animation reusing captain work. No result SHA/browser acceptance yet posted | `atlas/humans-contact-20261016`; `/Users/oven/Documents/Codex/2026-10-15/task-2`, as reported by the worker. Exact individual reserved filenames still required within `atlas_humans/**`. |

No row's source SHA, workflow head or isolated preview is automatically `BASELINE_APPROVED` for all workstreams. Record source commit, result commit and public artifact commit separately when they differ. Do not invent a commit for uncommitted work: post a patch/diff hash and state that no result commit exists yet.

## 3. Reconciled test evidence

| Run | Checked outcome | What it establishes / what it does not |
|---|---|---|
| CORE `38849136102` | **PASS**, completed 2026-10-16 04:16:54 UTC; phone and desktop both passed `Operate and render the actual application` | Supersedes the older desktop failure in `38847829056` for this candidate. Desktop log reports localhost browser operation, no recorded page/shader/asset errors, a visible `SEA12_CAPTAIN`, and `liveMapDoesNotPause: true`. Not an independently accepted public combined release, physical-phone test, visual-quality certification or human-contact validation. |
| Yacht `38849053766` | **PASS**, completed 04:12:59 UTC; public assets, real-time driving and public operation step succeeded; source `4a6a1ffce0fdacf513cb86f5975fcbf59e1bacb9` | Preserve the passed public-movement checkpoint; do not repeat the older public-verification failure as current. |
| Yacht `38849454935` | **PASS**, completed 04:16:44 UTC, no longer underway; source `edeb60f130bf7125a3056d02220e9108a1ddf7a0` | Logs show 22 controller tests, desktop/phone local and public browser passes, exact public asset verification and real-time motion for preview result `48b9bef038ab2e422b6677d7ca9db4879419a3f9`. Release flags explicitly state `multiplayer:false`, `sharedSeaLab12Merged:false`, `physicalDeviceTested:false`, `engineeringValidated:false`. |
| Multiplayer | Prior 18 room-core tests are reported in PR #2's initial slice; M1 is now claimed | Do not convert unit-test success, an adapter fixture or DNS troubleshooting into real socket/two-browser/live acceptance. New evidence is due from the existing owner. |
| HUMANS | Worker RUNNING; contact/animation evidence pending | Existing CORE captain visibility is not proof of new human IK, moving-deck contact, locomotion or biomechanical realism. |

Review method: read workflow metadata/job steps, CORE desktop browser log, latest yacht full job log, owner handoffs and yacht RELEASE.json. Artifacts are referenced; this coordinator did not rerun browsers or independently inspect every screenshot/video. The orchestrator's report of ongoing GPU visual review remains reported progress, not a new FAIL or PASS. Preserve passed checkpoints while keeping their scope narrow.

Evidence:
- https://github.com/owensto/helper/actions/runs/38849136102
- https://github.com/owensto/helper/actions/runs/38849136102/artifacts/12024558013
- https://github.com/owensto/helper/actions/runs/38849136102/artifacts/12023644854
- https://github.com/owensto/helper/actions/runs/38849053766
- https://github.com/owensto/helper/actions/runs/38849454935
- https://github.com/owensto/helper/actions/runs/38849454935/artifacts/12023944504
- https://github.com/owensto/helper/blob/main/atlas_d_simulator_01/RELEASE.json

## 4. Acknowledged boundaries versus still-proposed contracts

**Acknowledged:** this coordinator accepts Owen's ownership/release boundaries. Chat 3 explicitly acknowledges CORE's authority, its own transport-only scope, yacht identity/controller/unknown-depth semantics, no room pause from local map/tool activity, and the existing human worker. HUMANS has claimed its isolated boundary and captain-reuse approach. Yacht's existing handoff acknowledges isolated preview/controller ownership. These are not four-way approval of a concrete new shared schema. CORE and yacht must not be interrupted for acknowledgment while generating.

**Module-local, not yet ratified for the new shared host:** yacht's documented `AtlasDCore` controller, `atlas-d-original-r7` identity, metre/second/radian units, local +X forward/+Y up, `sampleBottom(x,z) -> {known,bed}`, and `sampleWaveHeight(x,z,elapsed)`; multiplayer's XYZW pose convention and old Sea Lab 11 world identifiers. Preserve these documented semantics or explicitly map them; do not silently declare every module's axes or timestep identical.

**Still proposed / awaiting owner agreement and evidence:**

1. CORE's versioned Sea Lab 12 descriptor: approved host/source SHA, schema revision, worldRevision tied to actual scene/configuration, coordinate/quaternion transforms, single simulation clock/timestep ownership, environment/water/depth semantics, per-vessel IDs/footprints, safe spawn and reconnect-restore hooks. The yacht's authored deep-water ground is not the same world as a Bay/Beaufort scene merely because both use Sea Lab code.
2. Narrow host adapters, rather than copying the yacht's old host or directly wiring old Bay globals into new CORE. Chat 3 proposes a descriptor-injected adapter that fails closed without an approved production descriptor; this is an acknowledged proposal, not an accepted integrated implementation.
3. Human contact schema: versioned vessel/deck/helm attachment IDs, vessel-local transforms, seat/hand/foot targets and capabilities, lifecycle on vessel switch, and receipt of the host's time and motion. CORE owns Bay attachments/current captain integration; yacht owns its attachments; HUMANS owns character behavior. No second vessel clock or duplicate captain.
4. Character transport identity, pose/animation representation and local-versus-remote ownership agreed by HUMANS and multiplayer. This does not authorize shared crews, authoritative character physics or networking an unreviewed pose model.

## 5. Next unclaimed acceptance gap: XAC-01

**Gap:** independent acceptance of one agreed Sea Lab 12 integration descriptor and its yacht/human/multiplayer mappings. No explicit XAC-01 reviewer claim or four-way descriptor acceptance was visible in the discussions read for this revision. Do not reassign the already-claimed human first slice or multiplayer M1.

**Next bounded iteration proposed, not launched:** at CORE's natural handoff, review one immutable descriptor against the three actual module handoffs; produce a single compatibility/ownership matrix and exact mismatches. Documentation/evidence review only, zero product-code edits. Isolated fixtures may support proposals but cannot earn combined acceptance.

Prerequisites: CORE-approved candidate and descriptor revision; each owner's source/result SHA, isolated workdir/branch and exact files; authoritative Bay/yacht attachments. Until provided, mark the integration gate `PENDING CONTRACT/HANDOFF`, not a regression of the passed component tests. Independent work inside existing ownership continues; no wait/stop message to CORE or yacht.

For subsequent combined browser acceptance, require exact build/URL and actual captures/logs showing: one active vessel controller and one shared time/water path; Bay/yacht switching with correct identity/footprint/unknown-depth behavior; one helm character attached to its vessel through calm/rough water, acceleration/braking/turning and switching; and, only once the existing multiplayer owner supplies the transport slice, two independent browsers exchanging client-owned motion with reconnect and local map/tool use not freezing the room. Compare frame-time/asset budgets against the same baseline; declare unsupported cases and physical-device coverage explicitly. No shared collisions/crews or authoritative-physics claims.

## 6. Required handoff at each bounded task boundary

```text
Task ID / actual session or local task:
State: RUNNING | BLOCKED | READY FOR REVIEW | ACCEPTED (scope stated)
Source SHA / result SHA / public artifact SHA, or UNAVAILABLE:
Actual isolated branch / absolute workdir:
Exact reserved files / exact changed files / generated outputs:
Contract revision consumed; explicit ACK or proposed delta:
Narrow adapter boundary and receiving owner:
Commands actually run / PASS, FAIL, NOT RUN:
Run/job/artifact IDs and exact tested URL:
Actual browser captures/video, runtime errors and baseline performance:
Blocker, independent work still possible, next single bounded iteration:
```

HUMANS currently reports missing authoritative attachment/capability coordinates and an approved shared SHA; parent-thread messaging is unavailable on its host, so use PR #1 rather than assuming direct delivery. The local orchestrator should allocate a browser slot when that existing worker's preview is ready; no slot or test launch is claimed by this record. Multiplayer reports a failed registry DNS attempt and continued permitted retrieval checks; record the eventual evidence rather than assuming a permanent install or hosting blocker.

No duplicate implementations; no new paid services, credentials, permission changes, purchases or account changes. No new merge/deployment authority. Keep production and the yacht's labeled isolated preview distinct. This revision changes coordination records only.

## Claim/acknowledgment sources

- https://github.com/owensto/helper/pull/1#issuecomment-6207822353
- https://github.com/owensto/helper/pull/1#issuecomment-6207977321
- https://github.com/owensto/helper/pull/1#issuecomment-6207985116
- https://github.com/owensto/helper/pull/2#issuecomment-6207983343
- https://github.com/owensto/helper/blob/edeb60f130bf7125a3056d02220e9108a1ddf7a0/atlas_d_simulator_01/HANDOFF.md
- https://github.com/owensto/helper/blob/edeb60f130bf7125a3056d02220e9108a1ddf7a0/atlas_d_simulator_01/README.md
- https://github.com/owensto/helper/blob/98f535cf7d01ba8a5cde8acfc4d3378990dbd77e/atlas_multiplayer/README.md
