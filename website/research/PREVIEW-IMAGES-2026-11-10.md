# Preview images and motion

The route manifest at `public/media/previews/manifest.json` assigns an image to each collection and taxonomy route. Aliases retain the same image identity. Each Local classic and trip style has a distinct scene. Country, state, province, regional, and water cards use a scene from their own collection.

## Data path

1. The catalogs define the place, water, method, season, and related trips.
2. The image run records a separate GPT Image prompt and alt text for each new scene. It reuses completed, suitable scenes from the existing trip image manifest.
3. The encoder creates AVIF and WebP files at 640, 1200, and 1600 pixels. It applies the IPTC `trainedAlgorithmicMedia` source type. The 1600 WebP is the retained master. It deletes each new PNG after verification.
4. `sync_preview_images.py RUN_DIR --require-complete` imports the images and route assignments. The public manifest preserves prompts, descriptions, source trip IDs, and AI provenance.
5. `preview_images.py` supplies the same route and trip identity to the card, detail-page, metadata, and atlas consumers. Existing per-trip images take priority for destination pages.
6. `preview_cards.py` adds images to collection, water, species, and field-guide cards. It marks the first three cards of each type as eager. Other cards use native lazy loading. Phone cards use the 640-pixel source; larger layouts retain the full responsive source sets.
7. The browser applies motion only to visible card images. It never hides a poster while it waits for JavaScript.

## Motion

The image has a continuous, subtle zoom and drift. A CSS light sweep adds a water-like reflection. Scroll motion moves the visible image by at most four pixels. Entry uses a 380 ms clip reveal. Hover and keyboard focus increase image scale and brightness with a 220 ms transition.

An intersection observer pauses images outside the viewport. A page visibility change pauses hidden pages. The site's existing pause control also stops the new motion. Reduced-motion mode removes the animations, reveal, parallax, and transitions. The atlas uses the same observer when it adds a new preview.

The feature adds no video download or animation library. Existing film cards retain their posters and video controls.

## Checks

- `python3 scripts/build_vercel.py`
- `python3 tests/preview-images.test.py`
- `node tests/preview-images-browser.cjs`
- Existing release, static, atlas, image, guide, species, video, Vercel, and JavaScript checks.

The browser check covers nine page types at desktop and phone widths. It checks eager image loads, overflow, script errors, motion pauses, reduced motion, and no-JavaScript output. It also checks accessibility on the trip-style directory.

The image batch and evidence are in `runs/castward-preview-images/` in the SEO reports workspace. The release result records the final checks, scores, deployment, and remaining scope of the separate per-trip image job.
