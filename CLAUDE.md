# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Marketing website for **Kindred** — a weekly couples check-in iOS app. Hosted on Cloudflare Pages at `kindredconnect.app`.

## Architecture

This is a **static site** with no build step, no bundler, and no JavaScript framework.

```
css/shared.css      — Shared CSS: design tokens, reset, nav, footer, btn-primary
css/blog.css        — Blog CSS: post content, CTA, cards, blog index styles
fonts/              — Self-hosted DM Sans + DM Serif Display woff2 files (loaded via @font-face in shared.css)
scripts/            — Maintenance scripts (update-sitemap.sh)
index.html          — Landing page (hero, features, how-it-works, FAQ, footer)
blog/index.html     — Blog listing (featured post + card grid)
blog/*/index.html   — Individual blog posts (4 currently)
privacy/index.html  — Privacy Policy
terms/index.html    — Terms of Service
images/             — favicon.png (browser tab), app-icon.png (apple-touch-icon), kindred-mark.png, kindred-lockup{,@2x,@3x}.png, og.png (social preview)
sitemap.xml         — Sitemap for search engines (update when adding pages)
robots.txt          — Search crawler directives
404.html            — Custom 404 page served by Cloudflare Pages on missing routes
```

### Landing Page Sections (index.html)

Major sections in DOM order:

`nav` → `hero` → `weekly rhythm (#rhythm)` → `batches (#batches)` → `skeptical-partner (#involves)` → `pricing (#pricing)` → `FAQ (#faq)` → `journal (.journal)` → `closing CTA (.closing)` → `footer`

The rhythm section is the structural centre — five sub-sections (4 alternating step rows + a "week between" break-out with three feature cards). The skeptical-partner beat sits in a constrained 640px column and runs in a quieter visual register than the rest of the page.

Nav has no fragment links — only `Blog` and `Download` (the latter is a placeholder `href="#"` until the App Store URL is wired). Section IDs exist for direct linking but aren't used in the current nav.

## Development

Serve locally (required — `file://` won't resolve absolute CSS paths):

```
python3 -m http.server 8000
```

No install, build, lint, or test commands exist.

## Deployment

Pushes to `main` auto-deploy via Cloudflare Pages (project name `kindredconnect-app`, preview URL `kindredconnect-app.pages.dev`). DNS for `kindredconnect.app` is also managed in Cloudflare — the apex CNAME flattens to the Pages project, and `www` is a Proxied CNAME to the apex (Cloudflare auto-redirects www → apex with a single 301).

Cloudflare Pages serves `404.html` with a `404` status for any unknown route. Without it, Pages falls back to `index.html` with `200`, which is bad for SEO.

HSTS is enabled at the Cloudflare edge (`max-age=31536000; includeSubDomains`, preload off). **Any new subdomain on `kindredconnect.app` must serve HTTPS or browsers will refuse to load it** — keep new subdomains Proxied (orange cloud) for automatic SSL via Cloudflare's universal cert, or provision a valid TLS cert at the origin if grey-clouding. To unwind: drop max-age to 0 in Cloudflare and wait the full year for browser caches to expire before HTTPS can safely be removed.

## Design System

CSS is split into shared stylesheets and page-specific inline styles:

- **`css/shared.css`** — loaded by all pages. Contains design tokens (`:root` variables), reset, typography, nav, `.btn-primary`, footer, and `prefers-reduced-motion`. Edit here for site-wide style changes.
- **`css/blog.css`** — loaded by blog index + blog posts. Contains post content styles, post CTA, "more from blog", blog cards, blog header/featured, and blog responsive rules.
- **Inline `<style>`** — homepage keeps ~600 lines of unique CSS (hero, phone composites, rhythm steps + week-between break-out, batches, skeptical-partner, pricing, FAQ, journal, closing CTA, animations). Legal pages keep ~50 lines of `.legal` content styles.
- All `<link>` tags use absolute paths (e.g. `/css/shared.css`) — works at any nesting depth on Cloudflare Pages but requires a local server for development.

Design tokens in `css/shared.css`:
- **Fonts:** DM Serif Display (headings) + DM Sans (body) — self-hosted woff2 in `/fonts/`, declared via `@font-face` at the top of `css/shared.css`. `index.html` preloads `dm-sans.woff2`.
- **Primary color:** `#AD6055` (warm terracotta)
- **Background:** `#F7F2EE` (warm off-white)
- **Foreground:** `#3D2F25` (dark brown)
- **Footer background:** `#1E1814` (deep warm dark)
- **Accent colors** (homepage-only, inline): sage `#94A87C`, dusty-blue `#8DA0B5`, ochre `#C9A655`

## Inline JavaScript (index.html only)

At the bottom of the landing page:
- **FAQ accordion** — event delegation on `.faq-list` handles clicks on any `.faq-question` child. Adding a new `.faq-item` works automatically; no `onclick` attribute needed.
- **Scroll animations** — IntersectionObserver fades in `.step`, `.batch-card`, `.feature-card`, `.skeptical-row`, `.journal-feature`, and `.journal-list-item` elements. New elements with these classes auto-animate; removing the class opts out.
- **Stagger delay** — `.batch-card`, `.feature-card`, `.skeptical-row`, and `.journal-list-item` get sequential `transitionDelay` based on DOM order.
- **UK pricing** — if timezone is `Europe/London`, the script swaps visible USD copy to GBP. Update this block whenever USD pricing strings change. Note: `.pricing-detail` is currency-agnostic by design (no per-month math), so the localiser deliberately skips it.

## Icon sprite (index.html)

The landing page defines an SVG sprite at the top of `<body>` with `<symbol id="i-app-store">` and `<symbol id="i-chevron">`. Reference via `<svg><use href="#i-app-store"/></svg>` — `fill` / `stroke` inherit from the outer `<svg>` so you can still color-theme per usage. Add new shared icons as additional `<symbol>` elements rather than inlining paths repeatedly.

## Brand Image Assets

Files in `images/`:

- `favicon.png` — transparent padded heart, used for `<link rel="icon">` (browser tab). Padding mimics the breathing room the cream icon used to have so it doesn't render oversized at 16×16.
- `app-icon.png` — heart on cream, used for `<link rel="apple-touch-icon">`. Must stay non-transparent so iOS home-screen icons fill the rounded-square mask cleanly.
- `kindred-mark.png` — raw heart on transparent, no padding. Available for in-content use.
- `kindred-lockup{,@2x,@3x}.png` — wordmark + heart at 1×/2×/3×. Available for nav/footer/marketing surfaces.
- `og.png` — 1200×630 social preview, referenced by `og:image` and `twitter:image`.

Source masters live in `docs/Brand Assets/` (gitignored). Update masters there first, then copy into `images/` keeping the same filenames so HTML references don't change.

## Homepage Screenshots

The phone mockups on `index.html` (hero composite + 5 rhythm steps) are pre-composited static WebPs — bezel and screenshot are merged at build time, not at runtime. Each phone is a single `<img class="phone">` tag with explicit `width="750" height="1528"`. No two-layer overlay, no pixel-percentage CSS, no decode race between bezel and screen.

The phone's drop-shadow halo (`filter: drop-shadow(0 24px 48px ...)`) extends roughly 72px below the visual phone bounds. Any layout that places content directly below a phone needs to leave at least that much clearance, or the halo bleeds into the next element. Step 5's row gap uses a `--week-row-gap` custom property (currently 112px) so the divider line can self-centre without re-tuning a magic number.

Source PNGs live in `marketing-screenshots/public/slides/` (one per phone, the raw in-app screenshot at 1320×2868) plus `marketing-screenshots/public/mockup.png` (the transparent iPhone bezel at 1022×2082). The `marketing-screenshots/` folder is a build-only tool — not deployed, not Next.js. It's a small Node + sharp project whose only job is to produce the composited WebPs in `images/screenshots/`.

To refresh `images/screenshots/` after replacing or adding a source PNG:

```
cd marketing-screenshots
pnpm install   # only needed once, or after sharp updates
pnpm sync-web-assets
```

The script (`marketing-screenshots/scripts/sync-web-assets.mjs`) reads each `public/slides/*.png`, resizes the bezel to 750 px wide, places the screenshot inside the screen rectangle with rounded corners, and writes one composited WebP per slide to `../images/screenshots/<slide>.webp`. Idempotent; safe to re-run. Commit both the source PNG and the regenerated WebP together.

To swap which screenshot appears in a slot on the marketing site, edit the `<img src>` on the corresponding `.phone` element in `index.html` — no CSS changes needed. To change the screenshot itself, replace the source PNG in `public/slides/` and re-run sync.

**Cache busting:** browsers cache favicons very aggressively, often surviving hard-refresh. The favicon `<link>` includes a `?v=N` query string. When swapping `favicon.png`, bump the version on every page (currently `?v=2`):

```
grep -rln 'favicon\.png?v=' . --include='*.html' | xargs sed -i '' 's/favicon\.png?v=[0-9]*/favicon.png?v=NEW/'
```

The same applies to `og.png` if it changes — social platforms cache OG images for days. Add `?v=N` to `og:image` / `twitter:image` URLs to force re-scrape.

## Creating a New Blog Post

Copy an existing post (e.g. `blog/weekly-couples-check-in/index.html`) to `blog/new-slug/index.html`. Each post needs:

1. **`<head>`**: unique `<title>`, `<meta description>`, `<link rel="canonical">`, OG/Twitter meta, and two stylesheet links (`/css/shared.css` + `/css/blog.css`)
2. **JSON-LD**: `Article` schema with headline, datePublished, description
3. **HTML body**: nav, `<article class="post">` with breadcrumb + content, post CTA, "more from blog" cards, footer
4. **No inline CSS needed** — shared.css and blog.css handle all styling

Also update `blog/index.html` (add the post to the listing) and `sitemap.xml` (see Sitemap maintenance below).

## Sitemap maintenance

`sitemap.xml` `<lastmod>` values are derived from each source file's git log. Don't hand-edit them — run:

```
./scripts/update-sitemap.sh
```

The script lists URL→source-file pairs at the top; add a new entry there when you add a page. Untracked files fall back to today's date.

## SEO

`index.html` contains JSON-LD structured data (`<script type="application/ld+json">`) with product info, pricing, and FAQ schema. When changing pricing, FAQ content, or product descriptions, update both the visible HTML **and** the JSON-LD block.

## Brand Voice

All user-facing copy must follow the Kindred brand voice ("Warm and Grounded"). The `kindred-voice` skill (`.claude/skills/kindred-voice/SKILL.md`) is the canonical reference — it loads proactively when writing or reviewing copy. Key principles: address the person not the concept, ask don't lead, never perform warmth, short copy stays conversational not sloganlike.

## Strategy Docs

The `docs/` directory contains strategic reference material (gitignored — not deployed):

- `positioning.md` — Market positioning, differentiation, audience, risks
- `messaging.md` — Value propositions, taglines, audience-specific messaging
- `brand-identity.md` — Colour palette, typography, design principles
- `blog-spec.md` — Blog implementation spec: infrastructure, SEO, initial post content
- `privacy-policy.md`, `terms-of-service.md` — Source copy for the deployed legal pages
- `App-Icon-1024x1024@1x.png`, `kindred-og-1200x630.png` — Master assets (deployed copies live in `images/`)

Consult these when making copy or design decisions. They inform tone and content but the kindred-voice skill governs final copy.
