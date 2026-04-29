#!/usr/bin/env node
// Build composite phone images (bezel + screenshot pre-merged) for the
// marketing site. Reads ./public/slides/*.png and ./public/mockup.png; writes
// one rounded-corner WebP per slide to ../images/screenshots/. The marketing
// site embeds these as plain <img> tags — no runtime layering, no
// pixel-percentage CSS, no decode race between bezel and screenshot layers.

import { readdir, mkdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, "..");
const SLIDES_DIR = join(PROJECT_ROOT, "public", "slides");
const BEZEL_SRC = join(PROJECT_ROOT, "public", "mockup.png");
const OUT_DIR = resolve(PROJECT_ROOT, "..", "images", "screenshots");

// Phones display at ~230–250 px wide on the marketing site, so a 750 px
// composite gives ~3× DPR clarity without bloat.
const COMPOSITE_W = 750;
const QUALITY = 85;

// Source bezel geometry from public/mockup.png (1022×2082): the screen
// rectangle inside the gold frame plus its corner radius. Used to scale,
// position, and round the screenshot when compositing.
const SRC_BEZEL_W = 1022;
const SRC_SCREEN_X = 52;
const SRC_SCREEN_Y = 46;
const SRC_SCREEN_W = 918;
const SRC_SCREEN_H = 1990;
const SRC_SCREEN_R = 126;

// The source bezel has metallic "highlight" pixels in the gold frame (a
// camera-bump shimmer at the top, a matching reflection band at the bottom).
// They read as light bleed against the marketing site's cream background.
// Flatten near-cream frame pixels to the dominant gold so the gold-to-screen
// transition stays clean at small render sizes.
const FRAME_GOLD = { r: 150, g: 131, b: 96 };

async function fileSizeKB(path) {
  const s = await stat(path);
  return Math.round(s.size / 1024);
}

function flattenBezelHighlights(raw) {
  const { data } = raw;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 150 && g > 150 && b > 150 && r + g + b > 510) {
      data[i] = FRAME_GOLD.r;
      data[i + 1] = FRAME_GOLD.g;
      data[i + 2] = FRAME_GOLD.b;
    }
  }
  return raw;
}

async function buildBezelBuffer() {
  const raw = await sharp(BEZEL_SRC)
    .resize({ width: COMPOSITE_W })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  flattenBezelHighlights(raw);
  return sharp(raw.data, {
    raw: { width: raw.info.width, height: raw.info.height, channels: 4 },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function buildComposite({ srcPath, outPath, bezel, geom }) {
  const screen = await sharp(srcPath)
    .resize({ width: geom.screenW, height: geom.screenH, fit: "cover", position: "top" })
    .png()
    .toBuffer();

  const cornerMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${geom.screenW}" height="${geom.screenH}">` +
    `<rect width="${geom.screenW}" height="${geom.screenH}" rx="${geom.screenR}" ry="${geom.screenR}" fill="#fff"/>` +
    `</svg>`
  );
  const screenRounded = await sharp(screen)
    .composite([{ input: cornerMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  await sharp(bezel.data)
    .composite([{ input: screenRounded, left: geom.screenX, top: geom.screenY }])
    .webp({ quality: QUALITY, alphaQuality: 90, effort: 5 })
    .toFile(outPath);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const bezel = await buildBezelBuffer();
  const scale = bezel.info.width / SRC_BEZEL_W;
  const geom = {
    screenX: Math.round(SRC_SCREEN_X * scale),
    screenY: Math.round(SRC_SCREEN_Y * scale),
    screenW: Math.round(SRC_SCREEN_W * scale),
    screenH: Math.round(SRC_SCREEN_H * scale),
    screenR: Math.round(SRC_SCREEN_R * scale),
  };

  const slides = (await readdir(SLIDES_DIR))
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort();

  console.log(`Building ${slides.length} phone composite(s) → ${OUT_DIR}`);
  console.log(
    `  bezel ${bezel.info.width}×${bezel.info.height}, ` +
    `screen ${geom.screenW}×${geom.screenH} @ (${geom.screenX},${geom.screenY}), ` +
    `radius ${geom.screenR}`
  );

  await Promise.all(
    slides.map(async (file) => {
      const outPath = join(OUT_DIR, file.replace(/\.png$/i, ".webp"));
      await buildComposite({
        srcPath: join(SLIDES_DIR, file),
        outPath,
        bezel,
        geom,
      });
      const kb = await fileSizeKB(outPath);
      console.log(`  ${file} → ${file.replace(/\.png$/i, ".webp")} (${kb} KB)`);
    }),
  );

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
