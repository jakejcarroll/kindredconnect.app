# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Marketing website for **Kindred** — a weekly couples check-in iOS app. Hosted on GitHub Pages at `kindredconnect.app`.

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
CNAME               — GitHub Pages custom domain (kindredconnect.app)
```

### Landing Page Sections (index.html)

Major sections in DOM order:

`nav` → `hero` → `how-it-works (#how)` → `batches (#batches)` → `between check-ins (#between)` → `anti-positioning (#anti)` → `who it's for (#who)` → `pricing (#pricing)` → `FAQ (#faq)` → `closing CTA` → `footer`

Nav links use fragment IDs (e.g. `#how`, `#pricing`) for smooth-scroll navigation.

## Development

Serve locally (required — `file://` won't resolve absolute CSS paths):

```
python3 -m http.server 8000
```

No install, build, lint, or test commands exist.

## Deployment

Pushes to `main` auto-deploy via GitHub Pages. The `CNAME` file maps to `kindredconnect.app`.

## Design System

CSS is split into shared stylesheets and page-specific inline styles:

- **`css/shared.css`** — loaded by all pages. Contains design tokens (`:root` variables), reset, typography, nav, `.btn-primary`, footer, and `prefers-reduced-motion`. Edit here for site-wide style changes.
- **`css/blog.css`** — loaded by blog index + blog posts. Contains post content styles, post CTA, "more from blog", blog cards, blog header/featured, and blog responsive rules.
- **Inline `<style>`** — homepage keeps ~400 lines of unique CSS (hero, phone mocks, sections, pricing, FAQ, animations). Legal pages keep ~50 lines of `.legal` content styles.
- All `<link>` tags use absolute paths (e.g. `/css/shared.css`) — works at any nesting depth on GitHub Pages but requires a local server for development.

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
- **Scroll animations** — IntersectionObserver fades in `.step`, `.batch-card`, and `.between-card` elements. New elements with these classes auto-animate; removing the class opts out.
- **Stagger delay** — `.batch-card` elements get sequential `transitionDelay` based on DOM order.
- **UK pricing** — if timezone is `Europe/London`, the script swaps visible USD copy to GBP. Update this block whenever USD pricing strings change.

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

The 5 phone mockups on `index.html` (hero + 4 steps) are real iPhone screenshots composited at runtime: `/images/screenshots/mockup.webp` (transparent bezel) layered with one of the slide screenshots. The composite is just two `<img>` tags inside a `.phone` wrapper — no JS, no canvas.

Source-of-truth PNGs live in `marketing-screenshots/public/slides/` (eight numbered slides plus `02b-answer.png`) and `marketing-screenshots/public/mockup.png`. The marketing-screenshots Next.js project is also where App Store screenshots are generated; the same raw assets feed both.

To refresh `images/screenshots/` after adding or replacing a source PNG:

```
cd marketing-screenshots
pnpm install   # only needed once, or after sharp updates
pnpm sync-web-assets
```

The script (`marketing-screenshots/scripts/sync-web-assets.mjs`) resizes every `public/slides/*.png` to 750 px wide WebP and `public/mockup.png` to 580 px wide WebP, writing into `../images/screenshots/`. Idempotent; safe to re-run.

To swap which screenshot appears in a slot, edit the `<img src>` inside the corresponding `.phone__screen` div in `index.html` — no CSS changes needed.

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
