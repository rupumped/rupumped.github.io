#!/bin/bash
# convert-images.sh
# Converts all JPG/PNG images to WebP at 85 quality, preserving originals.
# Run from the repo root.

find . \
  -not -path './.git/*' \
  -not -path './tarpit/*' \
  \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | \
while read -r img; do
  out="${img%.*}.webp"
  if [ ! -f "$out" ]; then
    cwebp -q 85 "$img" -o "$out"
    echo "Converted: $img → $out"
  fi
done

# Every img changed to:
# <picture>
#   <source srcset="homepage/headshot.webp" type="image/webp">
#   <img src="homepage/headshot.jpg" alt="My professional headshot">
# </picture>