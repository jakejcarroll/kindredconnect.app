# marketing-screenshots

Build pipeline for the iPhone phone composites embedded on the marketing
homepage. Reads the source PNGs in `public/` and writes one composited WebP
per phone to `../images/screenshots/`.

The marketing site embeds these as plain `<img>` tags — bezel and screenshot
are pre-merged here so there's no runtime layering, no pixel-percentage CSS,
and no decode race between two layers.

## Layout

```
public/
  mockup.png        — transparent iPhone bezel (1022×2082)
  slides/*.png      — in-app screenshots (1320×2868), one per phone
scripts/
  sync-web-assets.mjs — composite builder
```

## Regenerate

Run after replacing or adding a source PNG in `public/slides/` (or after
swapping `public/mockup.png`):

```
pnpm install   # one time, or after sharp updates
pnpm sync-web-assets
```

The script resizes the bezel to 750 px wide, places each screenshot inside
the screen rectangle with rounded corners, and writes
`../images/screenshots/<slide-name>.webp`. Idempotent; safe to re-run.

## Source-of-truth note

This folder is the regeneration tool, not the source of truth for what the
marketing site serves. The committed WebPs in `images/screenshots/` are what
the deployed site uses. Re-run the sync any time the source PNGs change, then
commit both the source PNG and the regenerated WebP together.

## Adding a new phone

1. Drop the new screenshot PNG into `public/slides/`.
2. `pnpm sync-web-assets`.
3. Reference the resulting `/images/screenshots/<name>.webp` from
   `index.html`.

## Bezel highlight flattening

The source `mockup.png` carries a metallic camera-bump shimmer at the top and
a matching reflection band at the bottom. They read fine on dark App Store
backgrounds (the original use case) but as light bleed against the marketing
site's cream page background. The script flattens those near-cream pixels in
the gold frame to a uniform gold. If you ever update `mockup.png` to add
intentionally bright design elements, expect this step to mute them — adjust
the threshold in `flattenBezelHighlights()` or skip the flattening for that
asset.
