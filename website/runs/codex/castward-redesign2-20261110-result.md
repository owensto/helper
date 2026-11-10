Castward outdoor redesign — 2026-11-10

The new design is live at https://castward.app/.

- Production deploy ID: `dpl_DnCrLeCqYZmcTUKdnaxCxbg6VhjJ`.
- Production deploy URL: https://castward-k9tlgylg4-owens-projects-f5c36e9a.vercel.app.
- Rollback ID: `dpl_3Bkh4DLenS2gZtFMZDZjZTFzFGsS`.
- Rollback URL: https://castward-h9rjnthts-owens-projects-f5c36e9a.vercel.app.
- The rollback target was the production deploy at the start of this task.
- The immediate prior deploy was `dpl_H4jkhoJmG85VkveRk7ZCcV7qJSsP`. It contains this redesign before the local font change.
- Deploy command: `vercel deploy --prod --yes --scope owens-projects-f5c36e9a`.
- Deploy directory: `/Users/oven/orca/workspaces/castward/website`.
- Repository: `owensto/helper`. Branch: `castward-launch`.

The homepage starts with one full-bleed photograph, a bold condensed headline, one short line, and one quiet link. Search uses a header dialog. Four large photo stories link to the Inshore, Offshore, Rivers & streams, and Ice collections. Three featured trips precede the Castward Films strip. A simple region band links to North America and the world atlas.

The shared design uses a bone background, near-black text, deep green, thin rules, and ample space. Trips, videos, and guide pages use the same design. Guide photographs describe representative water environments. They do not claim to show the named destinations.

Five free Unsplash photographs replace the decorative card art. Each photo has three self-hosted WebP sizes: 640, 1280, and 2200 pixels. The images have slight desaturation and alt text. The hero has a responsive preload and high fetch priority. Below-the-fold photos use lazy loading. The existing reels remain below the homepage stories.

The photo catalog is `public/media/photos/credits.json`. It supplies image markup and the credits at https://castward.app/about/#photo-credits. The public JSON is https://castward.app/media/photos/credits.json. Credits name Mondakranta Saikia, Glen Rushton, Krzysztof Płocha, Yannick Apollon, and Gaddafi Rusli. Each record has its Unsplash source URL. No new AI images were used.

Barlow Condensed and DM Sans came from Google Fonts. The site serves the fonts locally. Their source record and SIL licenses are in `public/assets/fonts/`.

The checks passed:

- Production build: 1,613 routes and 796 trip profiles.
- All 26 existing planner tests.
- Static checks: one H1, descriptions, and internal links.
- Release checks: 814 structural assertions.
- Video catalog checks, including all 13 homepage films and their structured data.
- JavaScript syntax and source whitespace checks. The bundled font licenses retain their upstream whitespace.
- Comparison of 1,614 HTML files, including the alternate 404 file: identical canonicals, robots rules, and structured data.
- Identical sitemap and redirect rules.
- Live search, habitat filters, mobile menu, Escape behavior, and saved planner values at both screen widths.
- No horizontal overflow, missing visible images, or browser script errors on the tested pages.
- No automated WCAG A or AA violations on home, trips, a guide, videos, and the planner at 390 and 1440 pixels.
- Curl returned 200, the expected title, and the expected canonical for home, trips, a guide, videos, the planner, and About.

The isolated mobile Lighthouse run scored 98 for performance. LCP was 1.7 seconds. FCP was 1.0 seconds. Total blocking time was 150 milliseconds. Layout shift was zero. These figures come from a simulated mobile lab run.

Final production screenshots are in `runs/castward-redesign2/after/`. They include the full homepage and its first viewport at 390 and 1440 pixels. They also include full-page trips, guide, and videos captures at both widths.

Evidence files are in `runs/castward-redesign2/`: `browser-checks.json`, `live-checks.json`, `metadata-check.json`, `accessibility.json`, and `lighthouse-mobile.json`. The browser check script is `verify_browser.py`.

The pre-existing `.gitignore` edit and unrelated untracked files remain outside this commit.
