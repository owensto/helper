#!/bin/sh
# Convert original fish illustrations (PNG, white background) to the two public sizes used by Cast & Catch.
# Usage: scripts/prepare_game_fish.sh <folder with <species-id>.png files>
set -e
out="$(dirname "$0")/../public/media/game/fish"
mkdir -p "$out"
for f in "$1"/*.png; do
  id=$(basename "$f" .png)
  [ -f "$out/$id-640.webp" ] && continue
  cwebp -quiet -q 78 -m 6 -resize 640 0 "$f" -o "$out/$id-640.webp"
  cwebp -quiet -q 72 -m 6 -resize 320 0 "$f" -o "$out/$id-320.webp"
done
ls "$out" | wc -l
