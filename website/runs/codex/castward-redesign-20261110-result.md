# Castward redesign — 2026-11-10

The redesign is live at https://castward.app.

- Project: `owens-projects-f5c36e9a/castward`.
- Production deployment: `dpl_3Bkh4DLenS2gZtFMZDZjZTFzFGsS`.
- Deployment URL: https://castward-h9rjnthts-owens-projects-f5c36e9a.vercel.app.
- Previous production deployment, before this redesign: `dpl_FqtVAYzH3JCYbpvtowxm9FHQc7sx`.
- Rollback URL: https://castward-qwuu4c9qc-owens-projects-f5c36e9a.vercel.app.
- Repository: `owensto/helper`. Branch: `castward-launch`. No change to `main`.

## Design

Libre Caslon Display headings and DM Sans text use a navy, bone, and warm accent palette. The hero retains its heading, description, and search. A horizontal strip uses the existing films and posters. Films start muted and loop. A pause button stops them. Reduced motion prevents automatic playback. Offscreen films pause.

The header retains all navigation items. The mobile menu supports Escape and closes after a link selection. Trip cards use decorative water illustrations, one metadata line, and a clear research status. Filters use quiet rounded controls. Guide pages use a narrow reading column, a sticky gear-list link, and films near the top. The footer is smaller.

## Checks

- Production build succeeded with `VERCEL_ENV=production SITE_URL=https://castward.app python3 scripts/build_vercel.py`.
- Deployment used `vercel deploy --prod --yes --scope owens-projects-f5c36e9a`.
- All 26 planner tests passed.
- The video test passed. It now accounts for three additional hero players without duplicate structured data.
- All 10 Vercel configuration tests passed.
- Browser checks passed for search, the mobile menu, Escape, saved gear status, reduced motion, automatic playback, and pause.
- No JavaScript errors occurred in those browser checks.
- Automated WCAG A/AA checks found no violations on five pages at 390px and 1440px.
- A local mobile Lighthouse run scored 84 performance, 100 accessibility, 100 best practices, and 100 SEO.
- That run measured 1.8 seconds for the largest contentful paint and 0.002 cumulative layout shift. Scores can vary by device and network.
- An equal-origin comparison against the original source found no metadata changes across 1,614 HTML files, including the duplicate 404 file.
- Canonicals, robots rules, structured data, sitemap entries, and redirects match the original production build.
- Curl checks returned HTTP 200, the expected title, and the correct canonical for all five key URLs.
- No horizontal overflow occurred on those pages at either width.

## Evidence

Before screenshots: `../castward-redesign/before/`.
After screenshots from production: `../castward-redesign/after/`.

Both folders contain `/`, `/trips/`, `/plan/`, the Lake Fork guide, and `/videos/` at 390px and 1440px.

Other evidence is in `../castward-redesign/`: `live-checks.json`, `metadata-check.json`, `accessibility.json`, `planner-tests.txt`, and `lighthouse-mobile.json`.

The existing `.gitignore` edit and unrelated untracked files were left outside this commit.
