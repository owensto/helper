# Castward — Fishing Atlas

**Live website: https://castward.higgsfield.app**

The managed deployment succeeded. On November 9, 2026, signed-out HTTP checks returned the actual Castward content at the homepage, trip catalog, North America page, Texas page, planner, JavaScript asset, sitemap and release endpoint. These checks stayed on the Castward host rather than redirecting to login. The initial provider login gate no longer appeared in those checks. See [deployment status](DEPLOYMENT.md).

This is the isolated `castward-launch` branch of `owensto/helper`, containing the plan and portable website source. It is **not** a separate `owensto/castward` repository. Do not merge this clean project branch into the unrelated helper main branch. The helper main branch was not modified for this delivery.

## Start here

- [Build and distribution plan](PLAN.md)
- [Complete North America playbook](docs/Fishing-Atlas-North-America-Playbook.md)
- [507-experience production backlog](docs/Fishing-Atlas-North-America-Backlog.csv)
- [Structured production plan](docs/Fishing-Atlas-North-America-Plan.json)
- [Portable website source](website/)
- [Import and verification receipt](import-status.json)
- [Deployment status and remaining integrations](DEPLOYMENT.md)

The completed import brought in 100 source files and four planning/data files from the owner-provided archives after checking their SHA-256 hashes. Planner and static-route tests passed in GitHub Actions: https://github.com/owensto/helper/actions/runs/42711701222

## Scope

The worldwide catalog has 796 trip profiles, including 550 in the broader North America collection. The detailed U.S./Canada/Mexico production plan covers 507 experiences: 357 U.S., 100 Canada, 50 Mexico. These counts overlap; do not add them together.

Content depth is 38 source-checked guides, 279 source-linked briefs, and 479 research-pending frameworks. These are not 796 fully expert-vetted articles. Research-pending pages remain noindex.

## Hosting and source ownership

The current live website is on Higgsfield's connected hosting, not Vercel. Its managed deployment source is separate from this portable source/handoff branch. A push here does not automatically update that hosted deployment. The portable source includes Vercel configuration for a future owner-connected deployment; use `website` as the project root.

The branch also contains a self-contained review copy in `live/index.html`; the primary live URL is the Castward URL above.

Bookings, payments/escrow, operator inventory, email collection, exact-model affiliate recommendations, and affiliate tracking are not connected. Saved plans are browser-local. Frigatebird/Orca integration has not been installed.

## Clone

```bash
git clone --branch castward-launch --single-branch https://github.com/owensto/helper.git castward
```

See `website/README.md` for build commands. The historical detailed playbook remains under `docs`; `PLAN.md` and `DEPLOYMENT.md` distinguish intended work from current delivery.
