#!/usr/bin/env node
// Resize the App Store source PNGs into web-suitable WebP assets for the
// marketing site. Reads from ./public/slides/*.png and ./public/mockup.png,
// writes to ../images/screenshots/. Sized for the homepage phone composites
// (~200–250 px display widths at up to 3× DPR), so 750 px wide screenshots
// and a 580 px wide bezel hit retina without bloat.

import { readdir, mkdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, "..");
const SLIDES_DIR = join(PROJECT_ROOT, "public", "slides");
const MOCKUP_PATH = join(PROJECT_ROOT, "public", "mockup.png");
const OUT_DIR = resolve(PROJECT_ROOT, "..", "images", "screenshots");

const SHOT_WIDTH = 750;
const BEZEL_WIDTH = 580;
const QUALITY = 85;

async function fileSizeKB(path) {
  const s = await stat(path);
  return Math.round(s.size / 1024);
}

async function convertScreenshot({ srcPath, outPath, width }) {
  await sharp(srcPath)
    .resize({ width })
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(outPath);
  const kb = await fileSizeKB(outPath);
  const rel = (p) => p.replace(PROJECT_ROOT + "/", "").replace(OUT_DIR, "images/screenshots");
  console.log(`  ${rel(srcPath)} → ${rel(outPath)} (${kb} KB)`);
}

// The source bezel has metallic "highlight" pixels in the gold frame (a camera-bump
// shimmer at the top and a matching reflection band at the bottom). Against the
// App Store slides' dark backgrounds they read as a phone-like sheen; against the
// marketing site's cream page background they read as light bleed at the edges of
// the screen. Flatten any near-cream pixels in the bezel's frame area to the
// dominant gold so the gold-to-screen transition stays clean at small render sizes.
async function convertBezel({ srcPath, outPath, width }) {
  const FRAME_GOLD = { r: 150, g: 131, b: 96 };
  const buf = await sharp(srcPath)
    .resize({ width })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = buf;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Bright/cream pixels (R+G+B > 510 with all channels > 150) are the
    // highlight bands; everything else (gold mid-tones, dark frame, black
    // screen) stays exactly as-is.
    if (r > 150 && g > 150 && b > 150 && r + g + b > 510) {
      data[i] = FRAME_GOLD.r;
      data[i + 1] = FRAME_GOLD.g;
      data[i + 2] = FRAME_GOLD.b;
    }
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: QUALITY, alphaQuality: 90, effort: 5 })
    .toFile(outPath);
  const kb = await fileSizeKB(outPath);
  const rel = (p) => p.replace(PROJECT_ROOT + "/", "").replace(OUT_DIR, "images/screenshots");
  console.log(`  ${rel(srcPath)} → ${rel(outPath)} (${kb} KB) [highlights flattened]`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const slides = (await readdir(SLIDES_DIR))
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort();

  console.log(`Syncing ${slides.length} slide(s) + bezel → ${OUT_DIR}`);

  await Promise.all(
    slides.map((file) =>
      convertScreenshot({
        srcPath: join(SLIDES_DIR, file),
        outPath: join(OUT_DIR, file.replace(/\.png$/i, ".webp")),
        width: SHOT_WIDTH,
      }),
    ),
  );

  await convertBezel({
    srcPath: MOCKUP_PATH,
    outPath: join(OUT_DIR, "mockup.webp"),
    width: BEZEL_WIDTH,
  });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
