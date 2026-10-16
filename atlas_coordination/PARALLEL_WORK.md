# ATLAS — Parallel development control packet

Prepared October 15, 2026 (America/Chicago).

**Execution status: PREPARED, NOT LAUNCHED.** No additional ChatGPT conversations or subagents were started by creating this packet. No application code was changed. GitHub issues are disabled in this repository, so use the associated draft pull request as the coordination/handoff discussion. This document is not a running scheduler.

## 1. Scope and current evidence

Project: the ATLAS boat simulator in `owensto/helper`, not unrelated products or every fleet model in this repository.

Observed repository history:
- Sea Lab 11 publication: `a9c6d3472ddeb491ebcadbc129a7486631faeae7`.
- Subsequent online-verification commit: `ddcbf408df153cfdeb55e30ba4a04ced30feb9e8`.
- Sea Lab 12 geographic-assets preparation: `ca5bbb6f26b6b8801ca0b3c001a2757bcd3d7ec3`.
- At inspection, `atlas_sealab_12/` contained `fetch_region12.py`; `.github/workflows/atlas-sealab-12-geodata.yml` prepares external assets. This does not establish a complete runnable Sea Lab 12 application.

These are inspected repository records, not tests rerun by this coordination chat. They are not permission to fork a stale release over the original builder's ongoing work. The original development chat must identify its current source, uncommitted changes and safe integration baseline.

Priorities from Owen: realistic boat operations; simpler UI; coherent water/boat motion; useful depth and visible shallows; accessible weather/map controls; better engine and environmental sound; interactive boat equipment. Optional exaggerated collision/ejection/explosion effects are separate from realism and default OFF. Accounts and multiplayer remain future work.

## 2. Team: five roles, only three code writers

| Role | Owner | Responsibility |
|---|---|---|
| Product coordination | This coordination chat | Work-package boundaries, roadmap and review. No automatic monitoring or separate product-code edits. |
| CORE / execution lead | Existing boat-development chat | Physics, propulsion/ignition/shifting, controls semantics, hull pose, water surface/depth, weather state, boat/water rendering, collision outcomes, main runtime, integration and release. Preserves its current work and dispatches the three prescribed workers when tool access permits. |
| HELM-UI | New worker | Dashboard, touch/keyboard bindings through the command API, collapsible map/settings and discoverable interaction prompts. |
| AUDIO | New worker | Engine/start/idle/load/shutdown audio, wind/water/collision sound, mixing, speaker presentation and radio-provider assessment. |
| QA | New worker | Independent baseline/candidate tests, reproducible defects, screenshots and performance comparison. No application-code fixes or deployment. |

**Do not split physics, boat controls and water/boat graphics between independent owners.** The renderer, depth indication, boat pose and physical surface must agree. UI and audio consume the same authoritative state rather than creating separate simulations.

Do not spawn a duplicate CORE builder or a second execution coordinator. Initial limit: CORE + HELM-UI + AUDIO writing code, plus one QA worker. No recursive agent spawning or unbounded improvement loops. Serialize expensive browser/GPU test runs when hardware is shared.

## 3. Safe start and approved baseline

Before dispatching code changes, CORE posts this handoff in the coordination PR:

```text
Repository:
Source branch and exact commit:
Uncommitted work / reserved paths:
Application source directory and entry point:
Build / test / preview commands:
Verified preview URL (or UNAVAILABLE):
Existing snapshot / command / event APIs:
Proposed minimal adapter, if needed:
Exact HELM-UI write allowlist:
Exact AUDIO write allowlist:
QA report / test-artifact location:
```

CORE then records `BASELINE_APPROVED` with an immutable source commit and exact ownership. The observed Sea Lab 12 preparation commit is not automatically that baseline. This coordination branch holds documentation only; workers must not mistake it for a new product release.

If source is monolithic or generated, CORE alone edits the source generator, main HTML/bootstrap and generated bundle. Extract or expose only the smallest reusable seam; do not perform a wholesale architecture rewrite merely to parallelize. UI/audio workers may create isolated components with fixtures after their allowlists and contract are approved, but cannot independently modify the monolith.

While the handoff is being prepared, the three new workers may run read-only audits against an explicitly identified snapshot. No one has to wait to inspect UI, audio or test coverage, but implementation must use the approved baseline rather than guessing the current source.

## 4. Shared interface requirements — proposed, not implemented

Reuse existing equivalent interfaces when available. CORE owns their schema/version, units, axes, timestep and compatibility.

- **Read-only snapshot:** simulation tick/time; vessel pose and velocity; engine state/RPM/load; requested and applied gear; throttle, steering and trim; valid/unknown depth and clearance; environment/weather; feature settings.
- **Command interface:** ignition, throttle, steering, gear request, trim, supported interactions and environment/settings requests. UI sends intent; only CORE mutates simulation state.
- **Event interface:** engine transitions, shifts, collisions/grounding and interactions, with ordering/event IDs suitable for avoiding duplicate one-shot audio/effects.
- **Water/depth contract:** one authoritative surface/time model and depth/clearance meaning for dynamics, rendering, instruments and map. Unknown depth remains unknown. Graphics quality must not change physical water height or boat motion.
- **Settings:** graphics quality, realistic mechanical consequences and exaggerated collision/ejection/explosion Easter eggs are independent. Exaggerated effects default OFF. Weather UI requests a change to CORE's environment instead of inventing separate wind/wave state.

UI must not directly modify renderer objects or physics variables. Audio must not create its own engine/throttle model. Numeric values and units must be explicit, not assumed. A missing interface triggers a narrow request to CORE, not an opportunistic cross-owner edit.

## 5. Bounded worker tickets

### UI-01 — Primary driving HUD and collapsible controls

State: **NOT STARTED**. Logical owner: **HELM-UI**. Branch suggestion after baseline approval: `atlas/helm-ui-01`.

First audit: identify the primary driving actions, current clutter, duplicated bindings, obscured viewport and touch-layout problems. Then implement one focused pass on the driving HUD and map/settings shell in the exact approved files. Use the shared command/state API. CORE owns the physical 3D ignition switch, boat behavior and application wiring; UI owns its on-screen representation/bindings.

Acceptance: ignition/gear/throttle/steering are discoverable; equivalent inputs dispatch equivalent commands; settings/map can collapse and restore; the view remains usable on desktop and phone; no hidden arbitrary speed blocker is reintroduced into gear selection; UI does not change simulation state directly. Use fixtures only as clearly labeled development scaffolding, never as real instrument output.

Out of scope: physics changes, a second map/depth engine, radio internals, wholesale redesign, backend/accounts/multiplayer and deployment.

### AUDIO-01 — Engine sound lifecycle

State: **NOT STARTED**. Logical owner: **AUDIO**. Branch suggestion after baseline approval: `atlas/audio-01`.

First audit: inventory existing audio, available assets and state/event signals. Implement one bounded engine start -> idle -> throttle/load -> shutdown pass, with a usable mute/volume path and clean lifecycle/resource handling. Consume the approved snapshot/events. Keep audio code inside the exact allowlist; send integration needs to CORE.

Acceptance: audible state follows the actual engine, rapid start/stop does not stack duplicate sound sources, mute/unmute works, pause/resume behavior is explicit, asset origins/licenses are recorded, and before/after audio evidence is supplied where the tools allow. Mark subjective realism as subjective; do not call synthesized placeholders real recordings or claim 100% realism.

Radio is a separate feasibility note in this pass: verify current official YouTube/Spotify integration and browser playback constraints before promising capabilities. Do not rip media, bypass provider controls or assume every provider can be routed into a spatial Web Audio speaker. No paid service signup, new credentials or additional spend.

Out of scope: UI redesign, physics/engine-model changes, optional damage effects and deployment.

### QA-01 — Baseline and integration regression report

State: **NOT STARTED**. Logical owner: **QA**. Read-only application checkout; reports/artifacts only in an approved location.

First capture baseline evidence for the exact source/URL supplied by CORE. Test the integration candidate against that same baseline. Do not fix bugs in worker-owned code, alter product settings persistently outside the test, or deploy.

Proposed viewport coverage: desktop 1600x1000, phone 430x932, small phone 390x844, landscape 844x390. These are test targets, not claims of completed testing.

Regression set: ignition consistency; forward/neutral/reverse requests without the old arbitrary speed blocker; equivalent throttle/steering inputs; visible water and boat-pose agreement; depth validity and grounding; weather controls; map toggle; UI hide/restore; audio transitions/mute; graphics-quality switching; optional exaggerated effects OFF by default; existing save/load and test-lab functions where present. Mark unavailable features NOT IMPLEMENTED rather than inventing results.

Acceptance: reproducible PASS/FAIL/NOT RUN findings, exact build/URL, steps and evidence; performance measured against the same device/settings baseline; no new unexplained runtime errors; actual screenshots rather than generated illustrations. QA proposes severity and integration readiness; CORE owns fixes and release.

## 6. Coordination and integration protocol

1. One named owner, one bounded task, one branch and isolated working directory/worktree. Different chat tabs are not filesystem isolation.
2. CORE allocates exact files before writes. No direct pushes to `main`, force pushes, shared-work resets, dependency/lockfile changes or workflow/deployment edits by specialists.
3. Dispatch/claim and handoff happen in this PR discussion, not through assumptions about project memory. A task is RUNNING only after a real launch/claim with an actual session identifier when available. Prepared prompts do not count.
4. Each worker posts its own report comment or coordinator-approved per-worker report. Do not have all agents race to edit one status file. Read the latest relevant handoff at each task boundary. If connector writes are unavailable, return a handoff for the execution lead to post; do not claim it was posted.
5. CORE reviews and merges UI/audio into one integration candidate, reruns affected tests and obtains QA evidence. Passing an isolated branch is not proof that the merged application works.
6. CORE is the only application integrator/deployer. Preserve the previous working release. No auto-merge or auto-deploy from this documentation setup or a worker's completion report. Verify the exact final preview URL before claiming publication.

Required handoff:

```text
Task and actual worker/session:
State: NOT STARTED | RUNNING | BLOCKED | READY FOR REVIEW | ACCEPTED
Baseline SHA / result SHA or patch:
Branch / workspace:
Exact changed files:
Commands run and real results:
Screenshot / audio / test evidence:
Requested contract changes:
Known limitations and checks NOT RUN:
Next single action:
```

## 7. Launch prompts

### Preferred: paste into the existing builder in a subagent-enabled Work/Codex environment

```text
Continue as CORE and the sole application integrator for the ATLAS boat simulator. Preserve your existing in-flight work; do not start a replacement implementation.

Read atlas_coordination/PARALLEL_WORK.md from branch atlas/parallel-coordination-20261015 in owensto/helper and its associated coordination PR. Execute its first bounded work cycle, not the entire roadmap.

First actually launch three subagents for HELM-UI, AUDIO and read-only QA audits of the current identified snapshot. Do not launch another CORE or coordinator. Record real worker IDs/statuses. While those audits run, post your current source/commit, uncommitted reservations, entry point, test commands, minimal state/command/event contract and exact worker file allowlists. Preserve Sea Lab 12 work already underway.

After the source baseline and contract are recorded, permit HELM-UI to implement UI-01 and AUDIO to implement AUDIO-01 in separate worktrees/checkouts based on that baseline. QA stays read-only on product code. Maximum three code writers including you; no recursive spawning and no automatic deployment.

Gather concrete patches, tests and handoffs, integrate only reviewed work, and report the actual results. If this environment has no subagent launcher, explicitly report NOT LAUNCHED and return the three standalone briefs; do not present plans, branches or prompts as running agents.
```

### Standalone new ChatGPT conversation fallback

Create three conversations inside the existing Atlas D project and give each this instruction with the corresponding role/ticket substituted:

```text
You are the ATLAS <HELM-UI / AUDIO / QA> specialist, assigned only <UI-01 / AUDIO-01 / QA-01>. Read the coordination packet at atlas_coordination/PARALLEL_WORK.md on branch atlas/parallel-coordination-20261015 in GitHub repository owensto/helper and its coordination PR. The original boat chat owns CORE, shared interfaces, integration and deployment.

Begin with a read-only audit of the identified current build. Before any code edits, obtain the approved baseline, exact file allowlist and contract from the execution lead. Work only in an isolated checkout/branch, do not change shared files or deploy, and return the packet's required evidence-backed handoff. Missing tool access or source is a stated blocker, not permission to fabricate results. Do not assume other chats see your status automatically.
```

## 8. Platform facts checked against official documentation

- ChatGPT Work exposes subagent delegation to eligible accounts; current Codex clients support explicit subagent requests. Subagents are not automatically new full ChatGPT Pro sidebar conversations, and this packet does not establish which model/entitlement a specific worker uses.
- Codex is available with ChatGPT plans including Pro; usage limits and available execution surfaces depend on the plan, rollout and workspace settings. Parallel agents consume additional usage; no unlimited-concurrency guarantee is assumed.
- Codex worktrees isolate checkouts. In the documented desktop workflow, choose Worktree in the new chat composer and select the source branch before submitting the task.
- Project conversations can be branched, but shared project context is not a live task queue, code lock or automatic handoff system.

Official sources checked October 15, 2026:
- https://developers.openai.com/codex/agent-configuration/subagents
- https://developers.openai.com/codex/environments/git-worktrees
- https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- https://help.openai.com/en/articles/10169521-projects-in-chatgpt
