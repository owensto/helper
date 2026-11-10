Castward motion and original scenes — 2026-11-10

The update is live at https://castward.app/.

- Production deployment: `dpl_BsBnxWT7EmYKJxNcC7RfKHveTEJr`.
- Production URL: https://castward-8gihfdemq-owens-projects-f5c36e9a.vercel.app.
- Rollback deployment: `dpl_DnCrLeCqYZmcTUKdnaxCxbg6VhjJ`.
- Rollback URL: https://castward-k9tlgylg4-owens-projects-f5c36e9a.vercel.app.
- The rollback target contains the photo-first design from the start of this task.
- Deploy command: `vercel deploy --prod --yes --scope owens-projects-f5c36e9a`.
- Deploy directory: `/Users/oven/orca/workspaces/castward/website`.
- Repository: `owensto/helper`. Branch: `castward-launch`.

The layout keeps the photo-first design. The hero has a slow photo zoom, masked headline reveals, a scroll cue, and a motion pause button. Desktop water stories have image reveals, parallax, numbered labels, and split title reveals. A canvas draws quiet ripple rings over the water images on hover.

The desktop film strip pins during scroll. One centered film plays muted. Previous, next, and autoplay controls also work from the keyboard. Phones use native horizontal scroll. The site also has magnetic buttons, card image zoom, caption movement, link underlines, a subtle desktop cursor, and a smaller sticky header.

The mobile menu fills the screen. It contains keyboard focus and disables the page behind it. Escape closes the menu. View Transitions animate supported page changes. Other browsers use normal navigation with a short entry effect. The site has a low-opacity grain layer, blur-up image loads, and a new 404 scene.

Reduced motion disables non-essential effects, smooth scroll, pinning, and autoplay. Mobile devices omit the desktop motion libraries, canvas ripples, cursor, and parallax. Their text reveals use CSS. Videos retain native controls.

The site serves exact dependency versions locally: GSAP 3.13.0, ScrollTrigger 3.13.0, and Lenis 1.3.11. Added JavaScript totals about 54.6 KB with gzip. Mobile loads about 3.9 KB of that total. Optional libraries load after the page load event. The hero has a responsive image preload and a font preload.

The image DONE file existed at the first check. The source was `/Users/oven/orca/workspaces/seo-reports/runs/castward-images/`. The shared image helper now reads its copied manifest. Hero, water stories, trip cards, guide scenes, collection images, and the social image use original GPT Image scenes. The hero has a portrait mobile source. All scene alt text comes from the manifest. About identifies these scenes as AI-generated illustrations. About no longer lists credits for the replaced stock photographs. The old stock files remain as unused historical assets.

Validation passed:

- Production build: 1,613 routes and 796 trip profiles.
- All 26 existing planner tests.
- Static route checks and 814 release assertions.
- Video catalog checks. The parser now distinguishes video sources from picture sources.
- All 1,614 HTML files retain their canonical URLs, robots rules, and structured data.
- The sitemap and redirect configuration are unchanged.
- Live search, habitat filters, saved planner values, and mobile menu Escape behavior.
- Live checks at 1440 and 390 pixels: no horizontal overflow, missing visible images, or script errors.
- One film plays at a time. Reduced motion removes ScrollTrigger effects and pauses autoplay.
- Automated WCAG A and AA checks found no violations on home, trips, the planner, a guide, and films at both widths.
- Curl returned 200 for the checked public routes, sitemap, and robots file. The unknown route returned 404.
- JavaScript syntax and source whitespace checks.

The final mobile Lighthouse score was 100. LCP was 1.6 s. Layout shift was 0.006. Total blocking time was 30 ms.

The mobile performance result is in `runs/castward-motion/lighthouse-live-mobile.json`. This is a simulated mobile lab result, not a field guarantee.

Both production Playwright recordings are 15 seconds:

- `runs/castward-motion/home-scroll-1440.webm`
- `runs/castward-motion/home-scroll-390.webm`

Production screenshots are in `runs/castward-motion/screenshots/`. Additional captures show the pinned films, mobile menu, and 404. The browser and motion scripts are in the same evidence directory. JSON files record the live checks, metadata comparison, curl results, and accessibility checks.

The pre-existing `.gitignore` edit and unrelated untracked files remain outside the commit.

Dependency references: https://gsap.com/docs/v3/Plugins/ScrollTrigger/ and https://github.com/darkroomengineering/lenis .
