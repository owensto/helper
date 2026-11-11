# Castward legal and motion release — November 10, 2026

The release is live at [Castward](https://castward.app/).

- Added six detailed pages: [Privacy](https://castward.app/privacy/), [Terms](https://castward.app/terms/), [Cookies](https://castward.app/cookies/), [Fishing safety](https://castward.app/disclaimer/), [Affiliate disclosure](https://castward.app/affiliate-disclosure/), and [Accessibility](https://castward.app/accessibility/).
- Each page has a contents list, section anchors, and the requested update date.
- The policies name Castward. They contain no legal-entity placeholders or mailing address.
- The [contact form](https://castward.app/contact/) retains its existing Resend delivery. The public address is contact@castward.app.
- Added hero layers, water crossfades, a horizontal trip band, atlas routes, count animations, card effects, trip chips, and faster controls.
- Added list sorting, consent focus return, and asset hashes for browser cache updates.
- Mobile keeps native scroll. Reduced motion disables the optional effects.

| Mobile Lighthouse | Performance | Accessibility | LCP | Blocking time | Layout shift |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Home](https://castward.app/) | 99 | 100 | 1.7 s | 70 ms | 0 |
| [Lake Fork trip](https://castward.app/north-america/united-states/texas/lake-fork-lake-and-reservoir-bass/) | 100 | 100 | 0.9 s | 40 ms | 0 |

These are mobile lab results. Both performance scores exceed 90.

The build, 33 JavaScript tests, 10 Vercel checks, and 21 guide checks passed. Static checks passed for 1,670 routes. Browser checks passed consent, cookie deletion, Global Privacy Control, reduced motion, keyboard controls, filters, and sort. The tested pages had no script errors or horizontal overflow.

The guide job exited before the rebase. Guide commit `69d8367e` remains in this release. The new guide content and source records remain intact.

- [Production deployment](https://castward-b377sjmdj-owens-projects-f5c36e9a.vercel.app): `dpl_8reLq9RVEBrvDdmZaHDyE9sy74DT`.
- [Code commit](https://github.com/owensto/helper/commit/41cff465). Push target: `owensto/helper`, `castward-launch` only.
- [Desktop scroll video](/Users/oven/orca/workspaces/seo-reports/runs/castward-legal-motion/home-scroll-1440.webm).
- [Phone scroll video](/Users/oven/orca/workspaces/seo-reports/runs/castward-legal-motion/home-scroll-390.webm).
- [Validation record](/Users/oven/orca/workspaces/seo-reports/runs/castward-legal-motion/validation.json).

The cookie table matches the two local-storage keys and both observed Google cookies. The counts come from the catalog: 801 planner destinations, 3 species guides, and 118 country or jurisdiction collections.
