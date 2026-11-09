# Castward — Fishing Atlas

This is the isolated `castward-launch` branch of `owensto/helper`. It contains the Castward plan and portable website source; it is not a separate `owensto/castward` repository. Do not merge this clean project branch into the unrelated helper main branch.

## Start here

- [Build and distribution plan](PLAN.md)
- [Complete North America playbook](docs/Fishing-Atlas-North-America-Playbook.md)
- [507-experience production backlog](docs/Fishing-Atlas-North-America-Backlog.csv)
- [Structured production plan](docs/Fishing-Atlas-North-America-Plan.json)
- [Portable website source](website/)
- [Import and verification receipt](import-status.json)

The import workflow populates the source and detailed planning documents from the existing owner-provided archives after checking their SHA-256 hashes. Check its result before treating those paths as populated.

## Scope

The existing worldwide catalog has 796 trip profiles, including 550 in the broader North America collection. The detailed U.S./Canada/Mexico production plan covers 507 experiences: 357 U.S., 100 Canada, 50 Mexico. These counts overlap; do not add them together.

Content depth is 38 source-checked guides, 279 source-linked briefs, and 479 research-pending frameworks. These are not 796 fully expert-vetted articles.

## Hosting

A separate managed deployment exists at https://castward.higgsfield.app. The provider reports a successful deployment, but anonymous tests have encountered the provider's login page. Do not claim that URL is an anonymously accessible, search-ready production site until independently verified.

This branch also builds a self-contained public review version under `live/index.html`. It is not a Vercel deployment. GitHub is the source/handoff location; changing this branch does not automatically update the managed Higgsfield deployment.

Bookings, payments/escrow, operator inventory, email collection, exact-model affiliate recommendations, and affiliate tracking are not connected. Saved plans are browser-local. Frigatebird/Orca integration has not been installed.

## Clone

```bash
git clone --branch castward-launch --single-branch https://github.com/owensto/helper.git castward
```

See `website/README.md` for the portable site's build commands and deployment configuration.
