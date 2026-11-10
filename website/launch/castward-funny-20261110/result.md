# Castward funny reels — 2026-11-10

Four new comedy reels are live at https://castward.app/videos/.

| Reel | Joke | Voice |
|---|---|---|
| bait-thief | A gull steals bait, then opens a restaurant. | None |
| lure-critic | A fish critic orders a worm without the hook. | Larry |
| captain-guitar | A guest brings a guitar. The fish ask for an encore. | Charlie |
| fish-tale | A fish grows with each story. The ruler quits. | None |

All four masters are 1080×1920, 30 fps, and 16 seconds.
All 479 adjacent frame pairs change in each reel.
The hooks start on frame zero. The punchlines start at 13 seconds.
Complete captions remain visible for three or four seconds.
Each reel ends with castward.app.
The scenes use local Python animation only. No paid video or image service was used.
The jokes are original fictional scenes. They make no factual fishing claims.
The linked Castward page is saved in sources/linked-page.html.
No social account received a post or scheduled item.

## Files

- Masters, sidecars, code, frame strips, and checks: tools/video/v3/castward-funny/.
- 540×960 previews and poster JPGs: /private/tmp/claude-501/-Users-oven-orca-workspaces-insiderhealth-frigatebird/0cbbc4a1-c70e-4510-8d64-b74035bb0769/scratchpad/castward/funny/.
- 720×1280 web copies, posters, and captions: website/public/media/videos/.
- A source and check archive is in website/launch/castward-funny-20261110/.

## Audio

Four separate ElevenLabs instrumental music requests ran one at a time.
The arrangements use clarinet polka, jazz waltz, guitar swing, and a chamber march.
Two reels use the approved stock voices Larry and Charlie. No cloned voice was used.
Eight short voice requests preserve the pauses before each punchline.
Voice input: 251 characters. Returned voice cost: 110 character-cost units.
Music receipts did not return a cash cost.
The effects reuse cached gull and splash recordings. No new effects request was made.
Final audio levels range from -16.84 to -15.98 LUFS. True peaks stay at or below -1.56 dBTP.
All spoken lines end before the final fade.

## Checks

All four pass the unchanged uniqueness checker.
The comparison includes 33 sidecars from castward-v2 and castward-v3, plus the shared history.
The highest audio similarity is 0.7022. The failure limit is 0.975.
All four final encoded frame strips received a visual review.
The review found and corrected a caption index error before deployment.
The site passed 26 engine tests, 10 Vercel tests, the video catalog test, release checks, and 1,613 route checks.
The live browser check confirms playback for all 13 videos at 720×1280.
The mobile page has no horizontal overflow. The browser reports no page errors.
Curl checks confirm HTTP 200 for three changed pages and all 12 new media files.
The library and homepage each contain 13 VideoObject entries. The linked guide contains five.
IndexNow accepted the three changed page URLs with HTTP 200.

## Release

Deployment: https://castward-qwuu4c9qc-owens-projects-f5c36e9a.vercel.app
Deployment ID: dpl_FqtVAYzH3JCYbpvtowxm9FHQc7sx.
Command: vercel deploy --prod --yes --scope owens-projects-f5c36e9a.
Directory: /Users/oven/orca/workspaces/castward/website.
Repository: owensto/helper. Branch: castward-launch only.

Evidence: qa-results.json, audio-levels.json, audio-pairwise.json, browser-results.json, live-verification.json, indexnow-result.json, and deploy.log.
