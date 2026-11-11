# Trip search eligibility

The content gate has four requirements:

1. Two distinct individual species have reviewed destination evidence and HTTP source links.
2. The trip has a season section. Unknown dates remain explicit.
3. The trip has at least 120 words of unique local description.
4. The trip has a valid canonical path. The build must also have a production origin.

`reviewed-source` and `existing-source-linked` are the accepted destination evidence states. A taxonomy or country occurrence record alone is insufficient. Broad groups, duplicate species IDs and unverified targets do not count. Existing species research remains the source of truth; this release does not independently recheck every source.

The catalog stores 801 destination records. The trip renderer has 798 trip pages. The other three records are starter destination collections.

## Data path

- `src/destination-species.json` supplies destination evidence and its source URLs.
- `src/species-catalog.json` distinguishes individual species from broad groups.
- `species_glossary.compile_into` joins those records to the trip catalog.
- `src/trip-descriptions.json` supplies 182 original local descriptions and their evidence links.
- Existing detailed guides retain their authored article sections as the local description.
- Shared gear modules and imported preparation text do not count as local descriptions.
- `index_policy.compile_into` writes `indexAssessment` and `indexEligible` after all content joins.
- `world.json`, the catalog downloads, continent queues and collection counts consume that result.
- `index_policy.install` renders each new description. It checks the final trip route, season heading and production origin.
- The final page map supplies robots metadata, `route-manifest.json`, `index-audit.json` and the sitemap.
- `sitemap_entries` reads either sitemap form for release checks and IndexNow preparation.

The description check rejects exact duplicates after place, state and country normalization. It cannot replace editorial review. The new descriptions distinguish access choices, targets, shared-water departures and source limits. They do not claim verified access, method, current conditions, catches or reviews.

The descriptions use brown trout for inland Salmo trutta context. The existing species ID and catalog label remain unchanged.

## Publication

The content tier still describes research depth. It no longer determines search eligibility. A preparation brief can pass the four checks without becoming a detailed guide. A detailed single-species guide fails the two-species requirement.

The existing canonical paths remain unchanged. Legacy redirects remain permanent and point directly to the canonical page. Redirects never enter a sitemap, even if their noindex flag is accidentally false.

At more than 1,000 eligible URLs, `sitemap.xml` becomes an index. Each child has at most 1,000 canonical URLs. The robots file points to the index. Preview builds remain noindex and publish no sitemap.

Unknown seasons remain unknown in the planner and filters. A season section does not create a documented month range.
