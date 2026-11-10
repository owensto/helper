# Trip scene import

Run from the website directory after new scenes arrive:

```sh
python3 scripts/sync_trip_images.py /Users/oven/orca/workspaces/seo-reports/runs/castward-trip-images
VERCEL_ENV=production SITE_URL=https://castward.app npm run build:vercel
python3 tests/trip-images.test.py
vercel deploy --prod --yes --scope owens-projects-f5c36e9a
```

The importer keys the public manifest by trip ID, copies all six responsive files, and preserves the source alt text. It reads the original PNG dimensions. Repeated imports produce the same output. Incomplete sets wait for the next import; existing scenes remain available. Unknown trip IDs fail the import. Commit the public assets, scripts, and updated tracked build output. Trips without a scene use the existing water-type image.
