# Castward index release — 10 November 2026

The release is live at [Castward](https://castward.app/). The production deployment is Ready.

| Measure | Before | After |
| --- | ---: | ---: |
| Generated routes, including aliases | 2,452 | 2,452 |
| Canonical trip pages | 798 | 798 |
| Indexable trip pages | 38 | 196 |
| Trip pages with noindex | 760 | 602 |
| Sitemap URLs | 936 | 1,132 |
| Sitemap URL files | 1 | 2 |

The before counts came from the live site before this change. The earlier count of 148 sitemap URLs was no longer current.

The release adds 183 trip pages to search eligibility. It removes 25 older trip pages that fail the two-species rule.

There are 233 newly eligible URLs: 183 trip pages and 50 collection pages. The sitemap removes 37 URLs, including 12 collection pages.

These are eligibility counts. They do not prove search-engine indexing or ranking.

## Changes

- The shared gate requires two distinct, source-linked individual species, a season section, 120 words of unique local description, and a canonical URL.
- The gate accepts the existing `reviewed-source` and `existing-source-linked` evidence states. Broad fish groups and duplicate species IDs do not count.
- Added 182 local descriptions. They contain 133–181 words each and link to their fishery sources.
- No two descriptions match after place-name normalization. No pair exceeds 40% overlap across five-word sequences.
- Tanana passes with its existing local article. Its old content-tier exception no longer blocks search eligibility.
- The other eligible detailed guides retain their existing local text. Shared gear modules do not count toward the description requirement.
- Unknown season dates, access and methods remain explicit. A season section does not create a verified month range.
- The descriptions add no catches, reviews, operator availability or fixed regulation limits.

The research covers 801 destination records. The renderer has 798 trip pages and three starter destination collections.

The existing research has targets for 475 destination records. It leaves 326 records without verified targets. This release does not independently recheck every source.

## Canonicals and sitemap

The `/north-america/...` canonical paths remain unchanged. All 519 Vercel redirect rules remain unchanged.

The old North American `/trips/` aliases still redirect to their canonical pages. Existing world pages retain their own canonical `/trips/...` paths.

Only canonical, indexable pages enter the sitemap. Redirect pages are excluded even if their noindex flag is false.

- [Sitemap index](https://castward.app/sitemap.xml)
- [First child sitemap: 1,000 URLs](https://castward.app/sitemap-1.xml)
- [Second child sitemap: 132 URLs](https://castward.app/sitemap-2.xml)

The sitemap includes species, glossary, trip-type and legal pages. Preview builds retain noindex and publish no sitemap.

## Validation and release

The guide and legal jobs had finished before the initial pull. The pull retained the later atlas commits.

A second pull used rebase before deployment. No newer remote commits required a replay. The existing local `.gitignore` edit remains unchanged.

- Code commit: `2e6a4f5944b9120dede2a4f86ef4140c2a8c0147`.
- Branch: `castward-launch` only.
- [Deployment](https://castward-1ijcr7fly-owens-projects-f5c36e9a.vercel.app).
- Deployment ID: `dpl_6bG6Bu267j3xd6FDP76WmYCgZGi9`.
- Production aliases: `castward.app` and `www.castward.app`.
- Command: `vercel deploy --prod --yes --scope owens-projects-f5c36e9a`, from `website/`.

The production build, release test, 33 JavaScript tests, ten Vercel checks and five species checks pass.

The guide, atlas, image, video, static-route and publish checks pass. Five new policy tests cover missing evidence, duplicate species, groups, word limits, canonicals and sitemap limits.

Three trip pages pass desktop and phone checks. They have no script errors, horizontal overflow or accessibility failures in the new description section.

All 233 newly eligible live URLs return HTTP 200. Each has one H1, the correct canonical URL and `index,follow`.

The live route manifest, audit, robots file and three sitemap files exactly match the tested build. Sample noindex pages and legacy redirects also pass.

## IndexNow

The public key file passed verification before submission. IndexNow accepted all 233 newly eligible URLs with HTTP 200.

Submission time: `2026-11-11T02:12:19.482367+00:00`. This is 10 November in the local Central time zone.

The Google Indexing API was not used. IndexNow acceptance does not prove indexing.

## Evidence files

The task evidence is in `/Users/oven/orca/workspaces/seo-reports/runs/castward-index-unlock/`.

- `before.json`, `counts.json`, and the saved before sitemap and route manifest.
- `description-review.json`, `browser-results.json`, and six viewport screenshots.
- `test-summary.json`, the individual test logs, and `release-tests.log`.
- `live-checks.json`, `deploy.log`, and `deploy-inspect.log`.
- `newly-indexable-urls.json`, `indexnow-request.json`, and `indexnow-result.json`.
- `failed-trip-pages.json` and the public [trip audit](https://castward.app/index-audit.json).

The repo contract is `website/research/INDEX-POLICY-2026-11-10.md`.

## Trip pages that retain noindex

There are 602 failed trip pages. Of these, 430 have zero qualifying individual species and 172 have one.

Of those pages, 576 also lack a qualifying local description. Shared preparation text does not satisfy that requirement.

All trip pages have a season section and a canonical URL. Neither check causes a failure in this release.

“Words” counts only the qualifying local description. Zero does not mean that the page has no visible text.

| Canonical page | Verified species | Words | Reason |
| --- | ---: | ---: | --- |
| [Yakutat Bay and adjacent Gulf waters](https://castward.app/north-america/united-states/alaska/yakutat-bay-saltwater-bottom-fishing/) | 1 | 182 | 1 verified species; two required. |
| [Kona offshore](https://castward.app/north-america/united-states/hawaii/kona-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Oahu flats](https://castward.app/north-america/united-states/hawaii/oahu-flats-saltwater-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kauai / Nawiliwili offshore](https://castward.app/north-america/united-states/hawaii/kauai-nawiliwili-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Maui / Maalaea offshore](https://castward.app/north-america/united-states/hawaii/maui-maalaea-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kokee streams / Kauai](https://castward.app/north-america/united-states/hawaii/kokee-streams-kauai-small-stream-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Oahu shoreline](https://castward.app/north-america/united-states/hawaii/oahu-shoreline-rocky-shore-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Puget Sound](https://castward.app/north-america/united-states/washington/puget-sound-coastal-salmon/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Yakima River](https://castward.app/north-america/united-states/washington/yakima-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Olympic Peninsula / Sol Duc](https://castward.app/north-america/united-states/washington/olympic-peninsula-sol-duc-steelhead-and-anadromous-trout/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Hoh River](https://castward.app/north-america/united-states/washington/hoh-river-steelhead-and-anadromous-trout/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Skagit River](https://castward.app/north-america/united-states/washington/skagit-river-steelhead-and-anadromous-trout/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Westport offshore](https://castward.app/north-america/united-states/washington/westport-offshore-offshore-pelagic-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Spokane River](https://castward.app/north-america/united-states/washington/spokane-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Rogue River](https://castward.app/north-america/united-states/oregon/rogue-river-steelhead-and-anadromous-trout/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [McKenzie River](https://castward.app/north-america/united-states/oregon/mckenzie-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Metolius River](https://castward.app/north-america/united-states/oregon/metolius-river-spring-fed-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Newport offshore](https://castward.app/north-america/united-states/oregon/newport-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Oregon coast / Pacific City beaches](https://castward.app/north-america/united-states/oregon/oregon-coast-pacific-city-beaches-surf-and-beach-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lower Sacramento River](https://castward.app/north-america/united-states/california/lower-sacramento-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [San Diego offshore](https://castward.app/north-america/united-states/california/san-diego-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Fall River — California](https://castward.app/north-america/united-states/california/fall-river-spring-fed-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Smith River — California](https://castward.app/north-america/united-states/california/smith-river-steelhead-and-anadromous-trout/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [California Delta](https://castward.app/north-america/united-states/california/california-delta-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Shasta](https://castward.app/north-america/united-states/california/lake-shasta-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Clear Lake](https://castward.app/north-america/united-states/california/clear-lake-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Tahoe / California base](https://castward.app/north-america/united-states/california/lake-tahoe-california-base-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Truckee River](https://castward.app/north-america/united-states/california/truckee-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Eastern Sierra / Upper Owens](https://castward.app/north-america/united-states/california/eastern-sierra-upper-owens-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Mammoth Lakes basin](https://castward.app/north-america/united-states/california/mammoth-lakes-basin-alpine-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [San Francisco Bay](https://castward.app/north-america/united-states/california/san-francisco-bay-inshore-estuary-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Monterey Bay](https://castward.app/north-america/united-states/california/monterey-bay-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Southern California / Huntington Beach surf](https://castward.app/north-america/united-states/california/southern-california-huntington-beach-surf-surf-and-beach-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Pyramid Lake](https://castward.app/north-america/united-states/nevada/pyramid-lake-coldwater-lake-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Mead / Nevada base](https://castward.app/north-america/united-states/nevada/lake-mead-nevada-base-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Ruby Mountains / accessible alpine lakes](https://castward.app/north-america/united-states/nevada/ruby-mountains-accessible-alpine-lakes-alpine-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lees Ferry / Colorado River](https://castward.app/north-america/united-states/arizona/lees-ferry-colorado-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [White Mountains / Big Lake](https://castward.app/north-america/united-states/arizona/white-mountains-big-lake-coldwater-lake-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Oak Creek](https://castward.app/north-america/united-states/arizona/oak-creek-small-stream-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Rio Grande / Taos reach](https://castward.app/north-america/united-states/new-mexico/rio-grande-taos-reach-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Pecos River](https://castward.app/north-america/united-states/new-mexico/pecos-river-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Henry's Fork](https://castward.app/north-america/united-states/idaho/henry-s-fork-spring-fed-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Silver Creek](https://castward.app/north-america/united-states/idaho/silver-creek-spring-fed-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Clearwater River](https://castward.app/north-america/united-states/idaho/clearwater-river-steelhead-and-anadromous-trout/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Salmon River](https://castward.app/north-america/united-states/idaho/salmon-river-steelhead-and-anadromous-trout/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Coeur d'Alene](https://castward.app/north-america/united-states/idaho/lake-coeur-d-alene-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sawtooth Mountains / verified alpine lakes](https://castward.app/north-america/united-states/idaho/sawtooth-mountains-verified-alpine-lakes-alpine-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Missouri River / Craig](https://castward.app/north-america/united-states/montana/missouri-river-craig-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Blackfoot River](https://castward.app/north-america/united-states/montana/blackfoot-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Rock Creek / near Missoula](https://castward.app/north-america/united-states/montana/rock-creek-near-missoula-small-stream-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [North Platte / Grey Reef](https://castward.app/north-america/united-states/wyoming/north-platte-grey-reef-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [North Platte / Miracle Mile](https://castward.app/north-america/united-states/wyoming/north-platte-miracle-mile-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Wind River / Dubois](https://castward.app/north-america/united-states/wyoming/wind-river-dubois-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Yellowstone National Park / Yellowstone River](https://castward.app/north-america/united-states/wyoming/yellowstone-national-park-yellowstone-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Bighorn Mountains / mountain streams](https://castward.app/north-america/united-states/wyoming/bighorn-mountains-mountain-streams-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Rocky Mountain National Park, Colorado](https://castward.app/north-america/united-states/colorado/rocky-mountain-national-park-verified-alpine-lakes-alpine-lake-fishing/) | 0 | 156 | 0 verified species; two required. |
| [Arkansas River / Salida](https://castward.app/north-america/united-states/colorado/arkansas-river-salida-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Fryingpan River](https://castward.app/north-america/united-states/colorado/fryingpan-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Gunnison River / Gunnison Gorge](https://castward.app/north-america/united-states/colorado/gunnison-river-gunnison-gorge-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Animas River / Durango](https://castward.app/north-america/united-states/colorado/animas-river-durango-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Steamboat Lake](https://castward.app/north-america/united-states/colorado/steamboat-lake-ice-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Green River / below Flaming Gorge](https://castward.app/north-america/united-states/utah/green-river-below-flaming-gorge-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Provo River](https://castward.app/north-america/united-states/utah/provo-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Weber River](https://castward.app/north-america/united-states/utah/weber-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Strawberry Reservoir](https://castward.app/north-america/united-states/utah/strawberry-reservoir-coldwater-lake-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Black Hills / Rapid Creek](https://castward.app/north-america/united-states/south-dakota/black-hills-rapid-creek-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Niobrara River / trout reaches](https://castward.app/north-america/united-states/nebraska/niobrara-river-trout-reaches-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Harlan County Reservoir](https://castward.app/north-america/united-states/nebraska/harlan-county-reservoir-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Milford Lake](https://castward.app/north-america/united-states/kansas/milford-lake-catfish-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Wilson Lake](https://castward.app/north-america/united-states/kansas/wilson-lake-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Clinton Lake](https://castward.app/north-america/united-states/kansas/clinton-lake-panfish-and-family-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lower Mountain Fork River](https://castward.app/north-america/united-states/oklahoma/lower-mountain-fork-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Grand Lake O' the Cherokees](https://castward.app/north-america/united-states/oklahoma/grand-lake-o-the-cherokees-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Eufaula](https://castward.app/north-america/united-states/oklahoma/lake-eufaula-panfish-and-family-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Boundary Waters / verified entry route](https://castward.app/north-america/united-states/minnesota/boundary-waters-verified-entry-route-remote-lodge-and-expedition/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Root River / southeast Minnesota](https://castward.app/north-america/united-states/minnesota/root-river-southeast-minnesota-spring-fed-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Green Bay](https://castward.app/north-america/united-states/wisconsin/green-bay-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Driftless / West Fork Kickapoo](https://castward.app/north-america/united-states/wisconsin/driftless-west-fork-kickapoo-spring-fed-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Winnebago](https://castward.app/north-america/united-states/wisconsin/lake-winnebago-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Eau Claire Chain / northwest Wisconsin](https://castward.app/north-america/united-states/wisconsin/eau-claire-chain-northwest-wisconsin-large-freshwater-predators/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Chippewa Flowage](https://castward.app/north-america/united-states/wisconsin/chippewa-flowage-large-freshwater-predators/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Door County / Sturgeon Bay](https://castward.app/north-america/united-states/wisconsin/door-county-sturgeon-bay-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Michigan / Milwaukee](https://castward.app/north-america/united-states/wisconsin/lake-michigan-milwaukee-great-lakes-open-water-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Superior / Apostle Islands area](https://castward.app/north-america/united-states/wisconsin/lake-superior-apostle-islands-area-great-lakes-open-water-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Petenwell Flowage](https://castward.app/north-america/united-states/wisconsin/petenwell-flowage-ice-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Michigan / Manistee](https://castward.app/north-america/united-states/michigan/lake-michigan-manistee-great-lakes-open-water-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake St. Clair / Michigan base](https://castward.app/north-america/united-states/michigan/lake-st-clair-michigan-base-large-freshwater-predators/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Saginaw Bay](https://castward.app/north-america/united-states/michigan/saginaw-bay-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Superior / Marquette](https://castward.app/north-america/united-states/michigan/lake-superior-marquette-great-lakes-open-water-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Escanaba / Little Bay de Noc](https://castward.app/north-america/united-states/michigan/escanaba-little-bay-de-noc-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Monroe](https://castward.app/north-america/united-states/indiana/lake-monroe-panfish-and-family-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [St. Joseph River / South Bend](https://castward.app/north-america/united-states/indiana/st-joseph-river-south-bend-steelhead-and-anadromous-trout/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Mad River](https://castward.app/north-america/united-states/ohio/mad-river-small-stream-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Grand River / Lake Erie tributary](https://castward.app/north-america/united-states/ohio/grand-river-lake-erie-tributary-steelhead-and-anadromous-trout/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Moosehead Lake](https://castward.app/north-america/united-states/maine/moosehead-lake-coldwater-lake-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Penobscot Bay](https://castward.app/north-america/united-states/maine/penobscot-bay-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Rangeley Lake](https://castward.app/north-america/united-states/maine/rangeley-lake-coldwater-lake-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Grand Lake Stream](https://castward.app/north-america/united-states/maine/grand-lake-stream-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Moosehead Lake / guided winter outing](https://castward.app/north-america/united-states/maine/moosehead-lake-guided-winter-outing-ice-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Upper Connecticut River / Pittsburg](https://castward.app/north-america/united-states/new-hampshire/upper-connecticut-river-pittsburg-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Piscataqua River / Portsmouth](https://castward.app/north-america/united-states/new-hampshire/piscataqua-river-portsmouth-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [White Mountains / Ellis River](https://castward.app/north-america/united-states/new-hampshire/white-mountains-ellis-river-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cape Cod / Monomoy](https://castward.app/north-america/united-states/massachusetts/cape-cod-monomoy-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Gloucester offshore](https://castward.app/north-america/united-states/massachusetts/gloucester-offshore-offshore-pelagic-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Martha's Vineyard beaches](https://castward.app/north-america/united-states/massachusetts/martha-s-vineyard-beaches-surf-and-beach-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Quabbin Reservoir](https://castward.app/north-america/united-states/massachusetts/quabbin-reservoir-coldwater-lake-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Narragansett Bay](https://castward.app/north-america/united-states/rhode-island/narragansett-bay-inshore-estuary-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Block Island waters](https://castward.app/north-america/united-states/rhode-island/block-island-waters-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Wood River](https://castward.app/north-america/united-states/rhode-island/wood-river-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Farmington River](https://castward.app/north-america/united-states/connecticut/farmington-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Housatonic River / Cornwall](https://castward.app/north-america/united-states/connecticut/housatonic-river-cornwall-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Catskills / Beaver Kill](https://castward.app/north-america/united-states/new-york/catskills-beaver-kill-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [West Branch Delaware River](https://castward.app/north-america/united-states/new-york/west-branch-delaware-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Montauk](https://castward.app/north-america/united-states/new-york/montauk-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Thousand Islands / St. Lawrence River](https://castward.app/north-america/united-states/new-york/thousand-islands-st-lawrence-river-large-freshwater-predators/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Finger Lakes / Cayuga Lake](https://castward.app/north-america/united-states/new-york/finger-lakes-cayuga-lake-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Raritan Bay](https://castward.app/north-america/united-states/new-jersey/raritan-bay-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Delaware River / New Jersey reach](https://castward.app/north-america/united-states/new-jersey/delaware-river-new-jersey-reach-river-smallmouth-and-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Island Beach State Park](https://castward.app/north-america/united-states/new-jersey/island-beach-state-park-surf-and-beach-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Manasquan / Shark River departures](https://castward.app/north-america/united-states/new-jersey/manasquan-shark-river-departures-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [South Branch Raritan River](https://castward.app/north-america/united-states/new-jersey/south-branch-raritan-river-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Spring Creek / Centre County](https://castward.app/north-america/united-states/pennsylvania/spring-creek-centre-county-spring-fed-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Susquehanna River / Harrisburg reach](https://castward.app/north-america/united-states/pennsylvania/susquehanna-river-harrisburg-reach-river-smallmouth-and-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Penns Creek](https://castward.app/north-america/united-states/pennsylvania/penns-creek-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Little Juniata River](https://castward.app/north-america/united-states/pennsylvania/little-juniata-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Letort Spring Run](https://castward.app/north-america/united-states/pennsylvania/letort-spring-run-spring-fed-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Erie / Erie port](https://castward.app/north-america/united-states/pennsylvania/lake-erie-erie-port-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Elk Creek / Lake Erie tributary](https://castward.app/north-america/united-states/pennsylvania/elk-creek-lake-erie-tributary-steelhead-and-anadromous-trout/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Raystown Lake](https://castward.app/north-america/united-states/pennsylvania/raystown-lake-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Indian River Inlet](https://castward.app/north-america/united-states/delaware/indian-river-inlet-rocky-shore-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Delaware Bay / Lewes base](https://castward.app/north-america/united-states/delaware/delaware-bay-lewes-base-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Brandywine Creek / Delaware reach](https://castward.app/north-america/united-states/delaware/brandywine-creek-delaware-reach-river-smallmouth-and-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Chesapeake Bay / Maryland base](https://castward.app/north-america/united-states/maryland/chesapeake-bay-maryland-base-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ocean City offshore](https://castward.app/north-america/united-states/maryland/ocean-city-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Mossy Creek](https://castward.app/north-america/united-states/virginia/mossy-creek-spring-fed-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Elk River / upper reach](https://castward.app/north-america/united-states/west-virginia/elk-river-upper-reach-spring-fed-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cranberry River](https://castward.app/north-america/united-states/west-virginia/cranberry-river-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Dale Hollow / Kentucky base](https://castward.app/north-america/united-states/kentucky/dale-hollow-kentucky-base-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [South Holston River](https://castward.app/north-america/united-states/tennessee/south-holston-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Chickamauga Lake](https://castward.app/north-america/united-states/tennessee/chickamauga-lake-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Watauga River](https://castward.app/north-america/united-states/tennessee/watauga-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Caney Fork River](https://castward.app/north-america/united-states/tennessee/caney-fork-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Great Smoky Mountains / Little River](https://castward.app/north-america/united-states/tennessee/great-smoky-mountains-little-river-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cape Hatteras, North Carolina](https://castward.app/north-america/united-states/north-carolina/cape-hatteras-beaches-surf-and-beach-fishing/) | 0 | 579 | 0 verified species; two required. |
| [Outer Banks / Oregon Inlet offshore](https://castward.app/north-america/united-states/north-carolina/outer-banks-oregon-inlet-offshore-offshore-pelagic-fishing/) | 1 | 564 | 1 verified species; two required. |
| [Pamlico Sound](https://castward.app/north-america/united-states/north-carolina/pamlico-sound-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Wilmington / Cape Fear estuary](https://castward.app/north-america/united-states/north-carolina/wilmington-cape-fear-estuary-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Brevard / Davidson River](https://castward.app/north-america/united-states/north-carolina/brevard-davidson-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tuckasegee River](https://castward.app/north-america/united-states/north-carolina/tuckasegee-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Fontana Lake](https://castward.app/north-america/united-states/north-carolina/fontana-lake-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Norman](https://castward.app/north-america/united-states/north-carolina/lake-norman-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Roanoke River / Weldon](https://castward.app/north-america/united-states/north-carolina/roanoke-river-weldon-river-smallmouth-and-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Albemarle Sound](https://castward.app/north-america/united-states/north-carolina/albemarle-sound-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Charleston marshes](https://castward.app/north-america/united-states/south-carolina/charleston-marshes-inshore-estuary-fishing/) | 1 | 594 | 1 verified species; two required. |
| [Beaufort / Port Royal Sound](https://castward.app/north-america/united-states/south-carolina/beaufort-port-royal-sound-inshore-estuary-fishing/) | 1 | 220 | 1 verified species; two required. |
| [Santee Cooper / Lake Marion](https://castward.app/north-america/united-states/south-carolina/santee-cooper-lake-marion-catfish-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Hartwell / South Carolina base](https://castward.app/north-america/united-states/south-carolina/lake-hartwell-south-carolina-base-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Grand Strand / Myrtle Beach surf](https://castward.app/north-america/united-states/south-carolina/grand-strand-myrtle-beach-surf-surf-and-beach-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Savannah / Tybee estuary](https://castward.app/north-america/united-states/georgia/savannah-tybee-estuary-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Golden Isles / St. Simons](https://castward.app/north-america/united-states/georgia/golden-isles-st-simons-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Seminole / Georgia base](https://castward.app/north-america/united-states/georgia/lake-seminole-georgia-base-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Toccoa River / tailwater](https://castward.app/north-america/united-states/georgia/toccoa-river-tailwater-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Okeechobee](https://castward.app/north-america/united-states/florida/lake-okeechobee-lake-and-reservoir-bass/) | 1 | 566 | 1 verified species; two required. |
| [Florida Keys / tarpon-focused trip](https://castward.app/north-america/united-states/florida/florida-keys-tarpon-focused-trip-saltwater-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Key West offshore](https://castward.app/north-america/united-states/florida/key-west-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Marathon / reef and wreck](https://castward.app/north-america/united-states/florida/marathon-reef-and-wreck-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Everglades / Florida Bay](https://castward.app/north-america/united-states/florida/everglades-florida-bay-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Biscayne Bay](https://castward.app/north-america/united-states/florida/biscayne-bay-saltwater-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Indian River Lagoon](https://castward.app/north-america/united-states/florida/indian-river-lagoon-inshore-estuary-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Tampa Bay](https://castward.app/north-america/united-states/florida/tampa-bay-inshore-estuary-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Charlotte Harbor](https://castward.app/north-america/united-states/florida/charlotte-harbor-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Jacksonville / St. Johns estuary](https://castward.app/north-america/united-states/florida/jacksonville-st-johns-estuary-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [St. Augustine nearshore](https://castward.app/north-america/united-states/florida/st-augustine-nearshore-nearshore-mixed-species-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Destin offshore](https://castward.app/north-america/united-states/florida/destin-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Pensacola inshore](https://castward.app/north-america/united-states/florida/pensacola-inshore-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Miami urban canals](https://castward.app/north-america/united-states/florida/miami-urban-canals-introduced-species-canal-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Orange Beach offshore](https://castward.app/north-america/united-states/alabama/orange-beach-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Smith Lake](https://castward.app/north-america/united-states/alabama/smith-lake-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Sipsey Fork / below Lewis Smith Dam](https://castward.app/north-america/united-states/alabama/sipsey-fork-below-lewis-smith-dam-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Gulfport / Biloxi nearshore](https://castward.app/north-america/united-states/mississippi/gulfport-biloxi-nearshore-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sardis Lake](https://castward.app/north-america/united-states/mississippi/sardis-lake-panfish-and-family-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ross Barnett Reservoir](https://castward.app/north-america/united-states/mississippi/ross-barnett-reservoir-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Venice marshes](https://castward.app/north-america/united-states/louisiana/venice-marshes-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Venice offshore](https://castward.app/north-america/united-states/louisiana/venice-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Delacroix marshes](https://castward.app/north-america/united-states/louisiana/delacroix-marshes-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Hopedale / Biloxi Marsh](https://castward.app/north-america/united-states/louisiana/hopedale-biloxi-marsh-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Grand Isle surf](https://castward.app/north-america/united-states/louisiana/grand-isle-surf-surf-and-beach-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Calcasieu Lake](https://castward.app/north-america/united-states/louisiana/calcasieu-lake-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Atchafalaya Basin](https://castward.app/north-america/united-states/louisiana/atchafalaya-basin-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Toledo Bend / Louisiana base](https://castward.app/north-america/united-states/louisiana/toledo-bend-louisiana-base-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Caney Creek Reservoir](https://castward.app/north-america/united-states/louisiana/caney-creek-reservoir-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cocodrie / Terrebonne marshes](https://castward.app/north-america/united-states/louisiana/cocodrie-terrebonne-marshes-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [White River / below Bull Shoals Dam](https://castward.app/north-america/united-states/arkansas/white-river-below-bull-shoals-dam-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Little Red River](https://castward.app/north-america/united-states/arkansas/little-red-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Norfork River](https://castward.app/north-america/united-states/arkansas/norfork-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Buffalo National River](https://castward.app/north-america/united-states/arkansas/buffalo-national-river-river-smallmouth-and-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Ouachita](https://castward.app/north-america/united-states/arkansas/lake-ouachita-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Greers Ferry Lake](https://castward.app/north-america/united-states/arkansas/greers-ferry-lake-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Upper Laguna Madre / Corpus Christi base](https://castward.app/north-america/united-states/texas/upper-laguna-madre-corpus-christi-base-inshore-estuary-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [South Padre offshore](https://castward.app/north-america/united-states/texas/south-padre-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Matagorda Bay](https://castward.app/north-america/united-states/texas/matagorda-bay-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Amistad / Texas base](https://castward.app/north-america/united-states/texas/lake-amistad-texas-base-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Padre Island National Seashore](https://castward.app/north-america/united-states/texas/padre-island-national-seashore-surf-and-beach-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Fraser River / lower reach](https://castward.app/north-america/canada/british-columbia/fraser-river-lower-reach-sturgeon-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Skeena River](https://castward.app/north-america/canada/british-columbia/skeena-river-steelhead-and-anadromous-trout/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Campbell River / coastal departure](https://castward.app/north-america/canada/british-columbia/campbell-river-coastal-departure-coastal-salmon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Haida Gwaii — coastal fishing](https://castward.app/north-america/canada/british-columbia/haida-gwaii-coastal-salmon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Vancouver / Howe Sound](https://castward.app/north-america/canada/british-columbia/vancouver-howe-sound-coastal-salmon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ucluelet offshore](https://castward.app/north-america/canada/british-columbia/ucluelet-offshore-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tofino coastal waters](https://castward.app/north-america/canada/british-columbia/tofino-coastal-waters-coastal-salmon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cowichan River](https://castward.app/north-america/canada/british-columbia/cowichan-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Elk River / Fernie](https://castward.app/north-america/canada/british-columbia/elk-river-fernie-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Sheridan Lake](https://castward.app/north-america/canada/british-columbia/sheridan-lake-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Dragon Lake](https://castward.app/north-america/canada/british-columbia/dragon-lake-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Stamp River](https://castward.app/north-america/canada/british-columbia/stamp-river-steelhead-and-anadromous-trout/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Chilliwack / Vedder River](https://castward.app/north-america/canada/british-columbia/chilliwack-vedder-river-steelhead-and-anadromous-trout/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Dean River](https://castward.app/north-america/canada/british-columbia/dean-river-remote-lodge-and-expedition/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Bow River / Calgary reach](https://castward.app/north-america/canada/alberta/bow-river-calgary-reach-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Crowsnest River](https://castward.app/north-america/canada/alberta/crowsnest-river-small-stream-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Oldman River / upper reach](https://castward.app/north-america/canada/alberta/oldman-river-upper-reach-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Red Deer River](https://castward.app/north-america/canada/alberta/red-deer-river-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [North Saskatchewan River / Edmonton](https://castward.app/north-america/canada/alberta/north-saskatchewan-river-edmonton-sturgeon-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lesser Slave Lake](https://castward.app/north-america/canada/alberta/lesser-slave-lake-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lac La Biche](https://castward.app/north-america/canada/alberta/lac-la-biche-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Newell](https://castward.app/north-america/canada/alberta/lake-newell-large-freshwater-predators/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Upper Kananaskis Lake](https://castward.app/north-america/canada/alberta/upper-kananaskis-lake-alpine-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Diefenbaker](https://castward.app/north-america/canada/saskatchewan/lake-diefenbaker-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tobin Lake](https://castward.app/north-america/canada/saskatchewan/tobin-lake-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lac La Ronge](https://castward.app/north-america/canada/saskatchewan/lac-la-ronge-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Reindeer Lake / Saskatchewan base](https://castward.app/north-america/canada/saskatchewan/reindeer-lake-saskatchewan-base-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Wollaston Lake](https://castward.app/north-america/canada/saskatchewan/wollaston-lake-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Last Mountain Lake](https://castward.app/north-america/canada/saskatchewan/last-mountain-lake-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Athabasca Lake / Saskatchewan base](https://castward.app/north-america/canada/saskatchewan/athabasca-lake-saskatchewan-base-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Winnipeg](https://castward.app/north-america/canada/manitoba/lake-winnipeg-ice-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Winnipeg / open-water program](https://castward.app/north-america/canada/manitoba/lake-winnipeg-open-water-program-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake of the Prairies](https://castward.app/north-america/canada/manitoba/lake-of-the-prairies-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Clear Lake / Riding Mountain area](https://castward.app/north-america/canada/manitoba/clear-lake-riding-mountain-area-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Whiteshell / West Hawk Lake](https://castward.app/north-america/canada/manitoba/whiteshell-west-hawk-lake-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Winnipeg River / Pinawa](https://castward.app/north-america/canada/manitoba/winnipeg-river-pinawa-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [North Seal River lodge area](https://castward.app/north-america/canada/manitoba/north-seal-river-lodge-area-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Nueltin Lake / Manitoba base](https://castward.app/north-america/canada/manitoba/nueltin-lake-manitoba-base-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Churchill River / Manitoba reach](https://castward.app/north-america/canada/manitoba/churchill-river-manitoba-reach-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake of the Woods / Ontario base](https://castward.app/north-america/canada/ontario/lake-of-the-woods-ontario-base-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Nipissing](https://castward.app/north-america/canada/ontario/lake-nipissing-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Simcoe / open-water trip](https://castward.app/north-america/canada/ontario/lake-simcoe-open-water-trip-lake-and-reservoir-bass/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Ontario / Toronto departure](https://castward.app/north-america/canada/ontario/lake-ontario-toronto-departure-great-lakes-open-water-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Niagara River / Ontario base](https://castward.app/north-america/canada/ontario/niagara-river-ontario-base-steelhead-and-anadromous-trout/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [St. Lawrence River / Ontario base](https://castward.app/north-america/canada/ontario/st-lawrence-river-ontario-base-large-freshwater-predators/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Temagami](https://castward.app/north-america/canada/ontario/lake-temagami-remote-lodge-and-expedition/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Algonquin / verified canoe route](https://castward.app/north-america/canada/ontario/algonquin-verified-canoe-route-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Nipigon River](https://castward.app/north-america/canada/ontario/nipigon-river-river-trout-and-grayling/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Rainy Lake / Ontario base](https://castward.app/north-america/canada/ontario/rainy-lake-ontario-base-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Eagle Lake / northwest Ontario](https://castward.app/north-america/canada/ontario/eagle-lake-northwest-ontario-large-freshwater-predators/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lac Seul](https://castward.app/north-america/canada/ontario/lac-seul-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Erie / Port Dover](https://castward.app/north-america/canada/ontario/lake-erie-port-dover-walleye-and-reservoir-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Bonaventure River](https://castward.app/north-america/canada/quebec/bonaventure-river-river-salmon/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Matapedia River](https://castward.app/north-america/canada/quebec/matapedia-river-river-salmon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sainte-Marguerite River / Saguenay area](https://castward.app/north-america/canada/quebec/sainte-marguerite-river-saguenay-area-river-salmon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Moisie River](https://castward.app/north-america/canada/quebec/moisie-river-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ungava / Koksoak system](https://castward.app/north-america/canada/quebec/ungava-koksoak-system-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Gouin Reservoir](https://castward.app/north-america/canada/quebec/gouin-reservoir-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cabonga Reservoir](https://castward.app/north-america/canada/quebec/cabonga-reservoir-remote-lodge-and-expedition/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Laurentians / Lac Nominingue](https://castward.app/north-america/canada/quebec/laurentians-lac-nominingue-walleye-and-reservoir-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [St. Lawrence River / Montreal reach](https://castward.app/north-america/canada/quebec/st-lawrence-river-montreal-reach-large-freshwater-predators/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Gaspe coastal waters](https://castward.app/north-america/canada/quebec/gaspe-coastal-waters-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lac Memphremagog / Quebec base](https://castward.app/north-america/canada/quebec/lac-memphremagog-quebec-base-coldwater-lake-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Miramichi River](https://castward.app/north-america/canada/new-brunswick/miramichi-river-river-salmon/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Restigouche River / New Brunswick base](https://castward.app/north-america/canada/new-brunswick/restigouche-river-new-brunswick-base-remote-lodge-and-expedition/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Saint John River / Fredericton](https://castward.app/north-america/canada/new-brunswick/saint-john-river-fredericton-large-freshwater-predators/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Grand Manan coastal waters](https://castward.app/north-america/canada/new-brunswick/grand-manan-coastal-waters-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Margaree River](https://castward.app/north-america/canada/nova-scotia/margaree-river-river-salmon/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Bras d'Or Lakes](https://castward.app/north-america/canada/nova-scotia/bras-d-or-lakes-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Halifax coastal waters](https://castward.app/north-america/canada/nova-scotia/halifax-coastal-waters-nearshore-mixed-species-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Shubenacadie / tidal reach](https://castward.app/north-america/canada/nova-scotia/shubenacadie-tidal-reach-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Gander River](https://castward.app/north-america/canada/newfoundland-and-labrador/gander-river-river-salmon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Humber River](https://castward.app/north-america/canada/newfoundland-and-labrador/humber-river-river-salmon/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Exploits River](https://castward.app/north-america/canada/newfoundland-and-labrador/exploits-river-river-salmon/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Flowers River / Labrador](https://castward.app/north-america/canada/newfoundland-and-labrador/flowers-river-labrador-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Minipi watershed / Labrador](https://castward.app/north-america/canada/newfoundland-and-labrador/minipi-watershed-labrador-remote-lodge-and-expedition/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Labrador coastal char program](https://castward.app/north-america/canada/newfoundland-and-labrador/labrador-coastal-char-program-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [North Lake / Prince Edward Island](https://castward.app/north-america/canada/prince-edward-island/north-lake-prince-edward-island-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Morell River](https://castward.app/north-america/canada/prince-edward-island/morell-river-small-stream-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Teslin Lake / Yukon base](https://castward.app/north-america/canada/yukon/teslin-lake-yukon-base-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Yukon River / Whitehorse reach](https://castward.app/north-america/canada/yukon/yukon-river-whitehorse-reach-river-trout-and-grayling/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Great Bear Lake](https://castward.app/north-america/canada/northwest-territories/great-bear-lake-remote-lodge-and-expedition/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Mackenzie River / named lodge reach](https://castward.app/north-america/canada/northwest-territories/mackenzie-river-named-lodge-reach-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tree River Lodge](https://castward.app/north-america/canada/nunavut/tree-river-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ensenada offshore](https://castward.app/north-america/mexico/baja-california/ensenada-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [San Quintin coastal waters](https://castward.app/north-america/mexico/baja-california/san-quintin-coastal-waters-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Bahia de los Angeles](https://castward.app/north-america/mexico/baja-california/bahia-de-los-angeles-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [San Felipe coastal waters](https://castward.app/north-america/mexico/baja-california/san-felipe-coastal-waters-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cedros Island](https://castward.app/north-america/mexico/baja-california/cedros-island-remote-lodge-and-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cabo San Lucas offshore](https://castward.app/north-america/mexico/baja-california-sur/cabo-san-lucas-offshore-offshore-pelagic-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [San Jose del Cabo / offshore program](https://castward.app/north-america/mexico/baja-california-sur/san-jose-del-cabo-offshore-program-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [La Paz / Espiritu Santo coastal waters](https://castward.app/north-america/mexico/baja-california-sur/la-paz-espiritu-santo-coastal-waters-inshore-estuary-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [East Cape / Los Barriles](https://castward.app/north-america/mexico/baja-california-sur/east-cape-los-barriles-inshore-estuary-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [East Cape offshore](https://castward.app/north-america/mexico/baja-california-sur/east-cape-offshore-offshore-pelagic-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Loreto](https://castward.app/north-america/mexico/baja-california-sur/loreto-inshore-estuary-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Magdalena Bay / mangroves](https://castward.app/north-america/mexico/baja-california-sur/magdalena-bay-mangroves-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Magdalena Bay offshore](https://castward.app/north-america/mexico/baja-california-sur/magdalena-bay-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Baja Sur / Pacific beach program](https://castward.app/north-america/mexico/baja-california-sur/baja-sur-pacific-beach-program-surf-and-beach-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [La Ventana coastal waters](https://castward.app/north-america/mexico/baja-california-sur/la-ventana-coastal-waters-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Puerto Penasco](https://castward.app/north-america/mexico/sonora/puerto-penasco-nearshore-mixed-species-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [San Carlos offshore](https://castward.app/north-america/mexico/sonora/san-carlos-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kino Bay](https://castward.app/north-america/mexico/sonora/kino-bay-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake El Salto](https://castward.app/north-america/mexico/sinaloa/lake-el-salto-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Picachos](https://castward.app/north-america/mexico/sinaloa/lake-picachos-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Mazatlan offshore](https://castward.app/north-america/mexico/sinaloa/mazatlan-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Topolobampo coastal waters](https://castward.app/north-america/mexico/sinaloa/topolobampo-coastal-waters-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [San Blas estuary](https://castward.app/north-america/mexico/nayarit/san-blas-estuary-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Punta Mita coastal waters](https://castward.app/north-america/mexico/nayarit/punta-mita-coastal-waters-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Riviera Nayarit offshore](https://castward.app/north-america/mexico/nayarit/riviera-nayarit-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Puerto Vallarta offshore](https://castward.app/north-america/mexico/jalisco/puerto-vallarta-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Banderas Bay / Jalisco coast](https://castward.app/north-america/mexico/jalisco/banderas-bay-jalisco-coast-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Chapala](https://castward.app/north-america/mexico/jalisco/lake-chapala-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Manzanillo offshore](https://castward.app/north-america/mexico/colima/manzanillo-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Zihuatanejo offshore](https://castward.app/north-america/mexico/guerrero/zihuatanejo-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ixtapa coastal waters](https://castward.app/north-america/mexico/guerrero/ixtapa-coastal-waters-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Acapulco offshore](https://castward.app/north-america/mexico/guerrero/acapulco-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Puerto Escondido offshore](https://castward.app/north-america/mexico/oaxaca/puerto-escondido-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Huatulco offshore](https://castward.app/north-america/mexico/oaxaca/huatulco-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Puerto Chiapas offshore](https://castward.app/north-america/mexico/chiapas/puerto-chiapas-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ascension Bay](https://castward.app/north-america/mexico/quintana-roo/ascension-bay-saltwater-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Espíritu Santo Bay](https://castward.app/north-america/mexico/quintana-roo/espiritu-santo-bay-saltwater-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Xcalak flats](https://castward.app/north-america/mexico/quintana-roo/xcalak-flats-saltwater-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Isla Blanca](https://castward.app/north-america/mexico/quintana-roo/isla-blanca-saltwater-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Isla Mujeres offshore](https://castward.app/north-america/mexico/quintana-roo/isla-mujeres-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cozumel offshore](https://castward.app/north-america/mexico/quintana-roo/cozumel-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Rio Lagartos](https://castward.app/north-america/mexico/yucatan/rio-lagartos-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [San Felipe / Yucatan](https://castward.app/north-america/mexico/yucatan/san-felipe-yucatan-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Progreso coastal waters](https://castward.app/north-america/mexico/yucatan/progreso-coastal-waters-saltwater-bottom-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Campeche mangroves](https://castward.app/north-america/mexico/campeche/campeche-mangroves-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sabancuy / lagoon system](https://castward.app/north-america/mexico/campeche/sabancuy-lagoon-system-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Veracruz offshore](https://castward.app/north-america/mexico/veracruz/veracruz-offshore-offshore-pelagic-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tecolutla estuary](https://castward.app/north-america/mexico/veracruz/tecolutla-estuary-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Vicente Guerrero](https://castward.app/north-america/mexico/tamaulipas/lake-vicente-guerrero-lake-and-reservoir-bass/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [La Pesca / Laguna Madre](https://castward.app/north-america/mexico/tamaulipas/la-pesca-laguna-madre-inshore-estuary-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Florida Keys flats and backcountry](https://castward.app/trips/keys-flats/) | 0 | 165 | 0 verified species; two required. |
| [Florida Keys offshore waters](https://castward.app/trips/keys-offshore/) | 0 | 614 | 0 verified species; two required. |
| [Andros, The Bahamas](https://castward.app/trips/andros-bonefish/) | 0 | 160 | 0 verified species; two required. |
| [Placencia, Punta Gorda and Belize flats](https://castward.app/trips/belize-permit/) | 0 | 161 | 0 verified species; two required. |
| [Belize Barrier Reef area](https://castward.app/trips/belize-reef/) | 0 | 158 | 0 verified species; two required. |
| [Quepos, Central Pacific coast](https://castward.app/trips/quepos-offshore/) | 0 | 159 | 0 verified species; two required. |
| [Tortuguero and Barra del Colorado area](https://castward.app/trips/costa-caribbean-canals/) | 0 | 165 | 0 verified species; two required. |
| [Rio Negro programs, Brazilian Amazon](https://castward.app/trips/rio-negro-peacock/) | 0 | 174 | 0 verified species; two required. |
| [Northern Norway coast](https://castward.app/trips/norway-skrei/) | 1 | 177 | 1 verified species; two required. |
| [Norwegian coastal fishing camps](https://castward.app/trips/norway-summer-sea/) | 1 | 163 | 1 verified species; two required. |
| [Lake Iso-Virmas experience, Finland](https://castward.app/trips/finland-ice-fishing/) | 0 | 167 | 0 verified species; two required. |
| [Lower Zambezi](https://castward.app/trips/lower-zambezi-tiger/) | 0 | 168 | 0 verified species; two required. |
| [Cosmoledo Atoll](https://castward.app/trips/cosmoledo-gt/) | 0 | 178 | 0 verified species; two required. |
| [Fish Mongolia river programs](https://castward.app/trips/mongolia-taimen/) | 1 | 177 | 1 verified species; two required. |
| [Northern Hokkaido](https://castward.app/trips/hokkaido-char/) | 0 | 168 | 0 verified species; two required. |
| [Gangwon stream programs](https://castward.app/trips/gangwon-streams/) | 1 | 169 | 1 verified species; two required. |
| [Northern Territory Top End](https://castward.app/trips/top-end-barramundi/) | 1 | 163 | 1 verified species; two required. |
| [Mataura River, Southland](https://castward.app/trips/mataura-trout/) | 1 | 163 | 1 verified species; two required. |
| [Gaula](https://castward.app/trips/g-norway-gaula/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Orkla](https://castward.app/trips/g-norway-orkla/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Namsen](https://castward.app/trips/g-norway-namsen/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Otra / Kristiansand](https://castward.app/trips/g-norway-otra-kristiansand/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Swedish Lapland](https://castward.app/trips/g-sweden-swedish-lapland/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Saimaa](https://castward.app/trips/g-finland-lake-saimaa/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Helnæs / Fyn](https://castward.app/trips/g-denmark-helns-fyn/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Mariager Fjord](https://castward.app/trips/g-denmark-mariager-fjord/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Little Belt](https://castward.app/trips/g-denmark-little-belt/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lough Corrib](https://castward.app/trips/g-ireland-lough-corrib/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [River Shannon](https://castward.app/trips/g-ireland-river-shannon/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lough Conn](https://castward.app/trips/g-ireland-lough-conn/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lough Mask](https://castward.app/trips/g-ireland-lough-mask/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lough Carra](https://castward.app/trips/g-ireland-lough-carra/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [River Tweed](https://castward.app/trips/g-united-kingdom-river-tweed/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [River Tay](https://castward.app/trips/g-united-kingdom-river-tay/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [River Spey](https://castward.app/trips/g-united-kingdom-river-spey/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [River Dee](https://castward.app/trips/g-united-kingdom-river-dee/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Barton Court / River Kennet](https://castward.app/trips/g-united-kingdom-barton-court-river-kennet/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Llyn Y Gors / Anglesey](https://castward.app/trips/g-united-kingdom-llyn-y-gors-anglesey/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Amsterdam canals and IJ](https://castward.app/trips/g-netherlands-amsterdam-canals-and-ij/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Sneekermeer / Friesland](https://castward.app/trips/g-netherlands-sneekermeer-friesland/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Ourthe Valley / RIVEO](https://castward.app/trips/g-belgium-ourthe-valley-riveo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Nisramont Lake](https://castward.app/trips/g-belgium-nisramont-lake/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Semois / Herbeumont](https://castward.app/trips/g-belgium-semois-herbeumont/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Eau d’Heure Lakes](https://castward.app/trips/g-belgium-eau-dheure-lakes/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sûre River](https://castward.app/trips/g-luxembourg-sure-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Moselle / Wasserbillig](https://castward.app/trips/g-luxembourg-moselle-wasserbillig/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Vianden reservoir / Our](https://castward.app/trips/g-luxembourg-vianden-reservoir-our/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Müritz](https://castward.app/trips/g-germany-lake-muritz/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Ybbs / Mostviertel](https://castward.app/trips/g-austria-ybbs-mostviertel/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lünersee / Rätikon](https://castward.app/trips/g-austria-lunersee-ratikon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Formarinsee / Arlberg](https://castward.app/trips/g-austria-formarinsee-arlberg/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Goiserer Traun](https://castward.app/trips/g-austria-goiserer-traun/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Grundlsee](https://castward.app/trips/g-austria-grundlsee/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Monaco offshore](https://castward.app/trips/g-monaco-monaco-offshore/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Monaco coastal night fishing](https://castward.app/trips/g-monaco-monaco-coastal-night-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Île de Ré](https://castward.app/trips/g-france-ile-de-re/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Var coast](https://castward.app/trips/g-france-var-coast/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cistierna / León](https://castward.app/trips/g-spain-cistierna-leon/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Ponta Delgada / São Miguel](https://castward.app/trips/g-portugal-ponta-delgada-sao-miguel/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sarca / Regorie](https://castward.app/trips/g-italy-sarca-regorie/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Chiese / Val di Fumo](https://castward.app/trips/g-italy-chiese-val-di-fumo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Avisio / CK reach](https://castward.app/trips/g-italy-avisio-ck-reach/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Adige / NKC reach](https://castward.app/trips/g-italy-adige-nkc-reach/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sesia / Varallo](https://castward.app/trips/g-italy-sesia-varallo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sesia / Alagna](https://castward.app/trips/g-italy-sesia-alagna/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Peipsi / Varnja winter](https://castward.app/trips/g-estonia-lake-peipsi-varnja-winter/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Peipsi / Varnja open water](https://castward.app/trips/g-estonia-lake-peipsi-varnja-open-water/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Burtnieks](https://castward.app/trips/g-latvia-lake-burtnieks/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Usma](https://castward.app/trips/g-latvia-lake-usma/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Lubāns](https://castward.app/trips/g-latvia-lake-lubans/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Mamry](https://castward.app/trips/g-poland-lake-mamry/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Śniardwy](https://castward.app/trips/g-poland-lake-sniardwy/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lake Niegocin](https://castward.app/trips/g-poland-lake-niegocin/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Pliva](https://castward.app/trips/g-bosnia-and-herzegovina-pliva/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kupa / Gorski Kotar](https://castward.app/trips/g-croatia-kupa-gorski-kotar/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kupica / Gorski Kotar](https://castward.app/trips/g-croatia-kupica-gorski-kotar/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Biograd Lake](https://castward.app/trips/g-montenegro-biograd-lake/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lim River](https://castward.app/trips/g-montenegro-lim-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Drina / Serbian bank](https://castward.app/trips/g-serbia-drina-serbian-bank/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Stari Slankamen / Tisa–Danube confluence](https://castward.app/trips/g-serbia-stari-slankamen-tisadanube-confluence/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Otava / Šumava](https://castward.app/trips/g-czechia-otava-sumava/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Vltava](https://castward.app/trips/g-czechia-vltava/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Jizera](https://castward.app/trips/g-czechia-jizera/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Belá](https://castward.app/trips/g-slovakia-bela/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Váh](https://castward.app/trips/g-slovakia-vah/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Poprad](https://castward.app/trips/g-slovakia-poprad/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Balaton](https://castward.app/trips/g-hungary-lake-balaton/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Paradise Lake / Hungary](https://castward.app/trips/g-hungary-paradise-lake-hungary/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Valley Lake / Hungary](https://castward.app/trips/g-hungary-valley-lake-hungary/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Holbina / Danube Delta](https://castward.app/trips/g-romania-holbina-danube-delta/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Arda River](https://castward.app/trips/g-bulgaria-arda-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kanina River](https://castward.app/trips/g-bulgaria-kanina-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Iugovska River](https://castward.app/trips/g-bulgaria-iugovska-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Chania Bay / Crete](https://castward.app/trips/g-greece-chania-bay-crete/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kissamos Bay / Crete](https://castward.app/trips/g-greece-kissamos-bay-crete/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ayia Napa harbour](https://castward.app/trips/g-cyprus-ayia-napa-harbour/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Gozo offshore](https://castward.app/trips/g-malta-gozo-offshore/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Oeschinensee](https://castward.app/trips/g-switzerland-oeschinensee/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tristaina lakes / Ordino](https://castward.app/trips/g-andorra-tristaina-lakes-ordino/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Curonian Lagoon / Lithuanian side](https://castward.app/trips/g-lithuania-curonian-lagoon-lithuanian-side/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Lithuanian Baltic coast](https://castward.app/trips/g-lithuania-lithuanian-baltic-coast/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Idrijca](https://castward.app/trips/g-slovenia-idrijca/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Unec](https://castward.app/trips/g-slovenia-unec/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Kwanza coast offshore](https://castward.app/trips/g-angola-kwanza-coast-offshore/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Faro River — Gassa Camp](https://castward.app/trips/g-cameroon-faro-river-gassa-camp/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Sette Cama](https://castward.app/trips/g-gabon-sette-cama/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Port Gentil](https://castward.app/trips/g-gabon-port-gentil/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Bijagós archipelago](https://castward.app/trips/g-guinea-bissau-bijagos-archipelago/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Nosy Be](https://castward.app/trips/g-madagascar-nosy-be/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Pomene](https://castward.app/trips/g-mozambique-pomene/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Bazaruto archipelago](https://castward.app/trips/g-mozambique-bazaruto-archipelago/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Inhaca Island](https://castward.app/trips/g-mozambique-inhaca-island/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Quirimbas archipelago](https://castward.app/trips/g-mozambique-quirimbas-archipelago/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Skeleton Coast](https://castward.app/trips/g-namibia-skeleton-coast/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Mnyera River](https://castward.app/trips/g-tanzania-mnyera-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ruhudji River](https://castward.app/trips/g-tanzania-ruhudji-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Nyerere Dam — Shangaa Camp](https://castward.app/trips/g-tanzania-nyerere-dam-shangaa-camp/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ngamba Island — Lake Victoria](https://castward.app/trips/g-uganda-ngamba-island-lake-victoria/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Bulago Island — Lake Victoria](https://castward.app/trips/g-uganda-bulago-island-lake-victoria/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Kalangala islands — Lake Victoria](https://castward.app/trips/g-uganda-kalangala-islands-lake-victoria/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Victoria Nile — Murchison Falls](https://castward.app/trips/g-uganda-victoria-nile-murchison-falls/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Nxamaseri — Okavango](https://castward.app/trips/g-botswana-nxamaseri-okavango/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Kariba](https://castward.app/trips/g-zimbabwe-lake-kariba/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Upper Zambezi — Zimbabwe bank](https://castward.app/trips/g-zimbabwe-upper-zambezi-zimbabwe-bank/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Mwandi — Upper Zambezi](https://castward.app/trips/g-zambia-mwandi-upper-zambezi/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Nasser — Abu Simbel](https://castward.app/trips/g-egypt-lake-nasser-abu-simbel/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Bin el Ouidane](https://castward.app/trips/g-morocco-bin-el-ouidane/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Barracuda Lodge jetty](https://castward.app/trips/g-gambia-barracuda-lodge-jetty/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Saly marina](https://castward.app/trips/g-senegal-saly-marina/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Djerba](https://castward.app/trips/g-tunisia-djerba/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sterkfontein Dam](https://castward.app/trips/g-south-africa-sterkfontein-dam/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Bokong River — Makhangoa](https://castward.app/trips/g-lesotho-bokong-river-makhangoa/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Rio Grande — Tierra del Fuego](https://castward.app/trips/g-argentina-rio-grande-tierra-del-fuego/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Rio Gallegos](https://castward.app/trips/g-argentina-rio-gallegos/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Rio Irigoyen](https://castward.app/trips/g-argentina-rio-irigoyen/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Iberá wetlands — Pirá Lodge](https://castward.app/trips/g-argentina-ibera-wetlands-pira-lodge/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Paraná River — Argentine program](https://castward.app/trips/g-argentina-parana-river-argentine-program/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Agua Negra River](https://castward.app/trips/g-bolivia-agua-negra-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sécure River](https://castward.app/trips/g-bolivia-secure-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Pluma River](https://castward.app/trips/g-bolivia-pluma-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tomo River](https://castward.app/trips/g-colombia-tomo-river/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Orinoco — Colombian program](https://castward.app/trips/g-colombia-orinoco-colombian-program/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Juruena–Teles Pires confluence](https://castward.app/trips/g-brazil-juruenateles-pires-confluence/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Xingu reservation program](https://castward.app/trips/g-brazil-xingu-reservation-program/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Acari River — Pinima Lodge](https://castward.app/trips/g-brazil-acari-river-pinima-lodge/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sucunduri River](https://castward.app/trips/g-brazil-sucunduri-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Agua Boa River](https://castward.app/trips/g-brazil-agua-boa-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Rewa arapaima waters](https://castward.app/trips/g-guyana-rewa-arapaima-waters/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Rewa River lodge waters](https://castward.app/trips/g-guyana-rewa-river-lodge-waters/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Corona Falls expedition](https://castward.app/trips/g-guyana-corona-falls-expedition/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kabalebo River](https://castward.app/trips/g-suriname-kabalebo-river/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Wonotobo Falls](https://castward.app/trips/g-suriname-wonotobo-falls/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Amatopo](https://castward.app/trips/g-suriname-amatopo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Galápagos — Tesoro charter](https://castward.app/trips/g-ecuador-galapagos-tesoro-charter/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Cusco Sacred Valley lakes](https://castward.app/trips/g-peru-cusco-sacred-valley-lakes/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Cusco Sacred Valley streams](https://castward.app/trips/g-peru-cusco-sacred-valley-streams/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Iquitos — Paiche/Tucunare project](https://castward.app/trips/g-peru-iquitos-paiche-tucunare-project/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Apurímac River — Cusco program](https://castward.app/trips/g-peru-apurimac-river-cusco-program/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Punta Sal](https://castward.app/trips/g-peru-punta-sal/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Salto Grande — Uruguay side](https://castward.app/trips/g-uruguay-salto-grande-uruguay-side/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ambergris Caye](https://castward.app/trips/g-belize-ambergris-caye/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Turneffe Atoll](https://castward.app/trips/g-belize-turneffe-atoll/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Placencia](https://castward.app/trips/g-belize-placencia/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Punta Gorda — Belize](https://castward.app/trips/g-belize-punta-gorda-belize/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Playas del Coco](https://castward.app/trips/g-costa-rica-playas-del-coco/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ocotal](https://castward.app/trips/g-costa-rica-ocotal/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tamarindo](https://castward.app/trips/g-costa-rica-tamarindo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sámara](https://castward.app/trips/g-costa-rica-samara/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Carrillo](https://castward.app/trips/g-costa-rica-carrillo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Arenal](https://castward.app/trips/g-costa-rica-lake-arenal/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Los Sueños](https://castward.app/trips/g-costa-rica-los-suenos/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Hannibal Bank](https://castward.app/trips/g-panama-hannibal-bank/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Isla Montuosa](https://castward.app/trips/g-panama-isla-montuosa/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Gatún Lake — Gamboa](https://castward.app/trips/g-panama-gatun-lake-gamboa/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Acklins flats](https://castward.app/trips/g-bahamas-acklins-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Crooked Island flats](https://castward.app/trips/g-bahamas-crooked-island-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ragged Island](https://castward.app/trips/g-bahamas-ragged-island/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Chub Cay — Berry Islands](https://castward.app/trips/g-bahamas-chub-cay-berry-islands/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Abaco](https://castward.app/trips/g-bahamas-abaco/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Exuma](https://castward.app/trips/g-bahamas-exuma/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Long Island — Bahamas](https://castward.app/trips/g-bahamas-long-island-bahamas/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Iztapa](https://castward.app/trips/g-guatemala-iztapa/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Jardines de la Reina](https://castward.app/trips/g-cuba-jardines-de-la-reina/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cayo Largo](https://castward.app/trips/g-cuba-cayo-largo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cayo Romano](https://castward.app/trips/g-cuba-cayo-romano/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Zapata](https://castward.app/trips/g-cuba-zapata/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cayo Santa María](https://castward.app/trips/g-cuba-cayo-santa-maria/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Babai River](https://castward.app/trips/g-nepal-babai-river/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Seti–Karnali river system](https://castward.app/trips/g-nepal-setikarnali-river-system/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Trishuli River](https://castward.app/trips/g-nepal-trishuli-river/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Haa River](https://castward.app/trips/g-bhutan-haa-river/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Paro Valley](https://castward.app/trips/g-bhutan-paro-valley/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Bumthang Valley](https://castward.app/trips/g-bhutan-bumthang-valley/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Bolgoda Lake](https://castward.app/trips/g-sri-lanka-bolgoda-lake/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kuala Rompin](https://castward.app/trips/g-malaysia-kuala-rompin/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Royal Belum–Temenggor](https://castward.app/trips/g-malaysia-royal-belumtemenggor/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Sabah — Borneo program](https://castward.app/trips/g-malaysia-sabah-borneo-program/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Komodo region](https://castward.app/trips/g-indonesia-komodo-region/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Bali](https://castward.app/trips/g-indonesia-bali/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lombok and Gili area](https://castward.app/trips/g-indonesia-lombok-and-gili-area/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Pilar — Siargao](https://castward.app/trips/g-philippines-pilar-siargao/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Subic Bay offshore](https://castward.app/trips/g-philippines-subic-bay-offshore/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Phú Quốc offshore](https://castward.app/trips/g-vietnam-phu-quoc-offshore/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Singapore charter waters](https://castward.app/trips/g-singapore-singapore-charter-waters/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tokyo Bay](https://castward.app/trips/g-japan-tokyo-bay/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Akan](https://castward.app/trips/g-japan-lake-akan/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Takayama-area guided waters](https://castward.app/trips/g-japan-takayama-area-guided-waters/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Biwa](https://castward.app/trips/g-japan-lake-biwa/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Jeju coastal sunset trip](https://castward.app/trips/g-south-korea-jeju-coastal-sunset-trip/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Dubai](https://castward.app/trips/g-united-arab-emirates-dubai/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Abu Dhabi](https://castward.app/trips/g-united-arab-emirates-abu-dhabi/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Ras Al Khaimah](https://castward.app/trips/g-united-arab-emirates-ras-al-khaimah/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Fujairah](https://castward.app/trips/g-united-arab-emirates-fujairah/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Doha charter program](https://castward.app/trips/g-qatar-doha-charter-program/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Aqaba](https://castward.app/trips/g-jordan-aqaba/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Jeddah](https://castward.app/trips/g-saudi-arabia-jeddah/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [South Andaman fishing grounds](https://castward.app/trips/g-india-south-andaman-fishing-grounds/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kaafu Atoll](https://castward.app/trips/g-maldives-kaafu-atoll/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Baa Atoll](https://castward.app/trips/g-maldives-baa-atoll/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Noonu Atoll](https://castward.app/trips/g-maldives-noonu-atoll/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Laamu Atoll](https://castward.app/trips/g-maldives-laamu-atoll/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Hallaniyat Islands](https://castward.app/trips/g-oman-hallaniyat-islands/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Hasik](https://castward.app/trips/g-oman-hasik/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Gillhams — Krabi](https://castward.app/trips/g-thailand-gillhams-krabi/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Bangkok managed-lake circuit](https://castward.app/trips/g-thailand-bangkok-managed-lake-circuit/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Savusavu](https://castward.app/trips/g-fiji-savusavu/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Mamanuca Islands](https://castward.app/trips/g-fiji-mamanuca-islands/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Yasawa Islands](https://castward.app/trips/g-fiji-yasawa-islands/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Taveuni — Makaira](https://castward.app/trips/g-fiji-taveuni-makaira/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Coral Coast — Cuvu Beach](https://castward.app/trips/g-fiji-coral-coast-cuvu-beach/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Luganville — Espiritu Santo](https://castward.app/trips/g-vanuatu-luganville-espiritu-santo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Trees and Fishes — Vanuatu](https://castward.app/trips/g-vanuatu-trees-and-fishes-vanuatu/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Papatura — reef waters](https://castward.app/trips/g-solomon-islands-papatura-reef-waters/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Papatura — nearby rivers](https://castward.app/trips/g-solomon-islands-papatura-nearby-rivers/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Munda — Roviana Lagoon](https://castward.app/trips/g-solomon-islands-munda-roviana-lagoon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Vava’u](https://castward.app/trips/g-tonga-vavau/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Palau — Swings trolling charter](https://castward.app/trips/g-palau-palau-swings-trolling-charter/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Palau — Swings bottom-fishing charter](https://castward.app/trips/g-palau-palau-swings-bottom-fishing-charter/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Arno Atoll](https://castward.app/trips/g-marshall-islands-arno-atoll/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Pohnpei](https://castward.app/trips/g-federated-states-of-micronesia-pohnpei/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Yap](https://castward.app/trips/g-federated-states-of-micronesia-yap/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Aitutaki](https://castward.app/trips/g-cook-islands-aitutaki/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Niue — ocean fishing charter](https://castward.app/trips/g-niue-niue-ocean-fishing-charter/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Kiritimati — saltwater flats](https://castward.app/trips/g-kiribati-kiritimati-saltwater-flats/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Kiritimati — offshore waters](https://castward.app/trips/g-kiribati-kiritimati-offshore-waters/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Tabuaeran — Fanning Island](https://castward.app/trips/g-kiribati-tabuaeran-fanning-island/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Wari Long Reef — Milne Bay](https://castward.app/trips/g-papua-new-guinea-wari-long-reef-milne-bay/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Eucumbene](https://castward.app/trips/g-australia-lake-eucumbene/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Jindabyne](https://castward.app/trips/g-australia-lake-jindabyne/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Tongariro River — lodge-based fishing](https://castward.app/trips/g-new-zealand-tongariro-river-lodge-based-fishing/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Upper Tongariro River — raft access](https://castward.app/trips/g-new-zealand-upper-tongariro-river-raft-access/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Taupō](https://castward.app/trips/g-new-zealand-lake-taupo/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [St. George’s Harbour](https://castward.app/trips/g-grenada-st-georges-harbour/) | 1 | 0 | 1 verified species; two required. Local description below 120 words. |
| [Barbados — Cannon Charters](https://castward.app/trips/g-barbados-barbados-cannon-charters/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Montego Bay](https://castward.app/trips/g-jamaica-montego-bay/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Marigot — Caribbean-side fishing](https://castward.app/trips/g-saint-lucia-marigot-caribbean-side-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [West End — Roatán](https://castward.app/trips/g-honduras-west-end-roatan/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [San Juan del Sur](https://castward.app/trips/g-nicaragua-san-juan-del-sur/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Punta Cana — Mike’s Marina](https://castward.app/trips/g-dominican-republic-punta-cana-mikes-marina/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [St. Brandon](https://castward.app/trips/g-mauritius-st-brandon/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Malindi — Kingfisher](https://castward.app/trips/g-kenya-malindi-kingfisher/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Antalya — Mediterranean boat fishing](https://castward.app/trips/g-turkey-antalya-mediterranean-boat-fishing/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Owen River Lodge](https://castward.app/trips/g-new-zealand-owen-river-lodge/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Lake Brunner Eco Lodge](https://castward.app/trips/g-new-zealand-lake-brunner-eco-lodge/) | 0 | 0 | 0 verified species; two required. Local description below 120 words. |
| [Cairns / outer Great Barrier Reef](https://castward.app/trips/cairns-heavy-tackle-marlin/) | 1 | 220 | 1 verified species; two required. |
