This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Sync to web

`pnpm sync-web-assets` reads `public/slides/*.png` and `public/mockup.png`, resizes them with `sharp`, and writes WebP copies to `../images/screenshots/` for use by the homepage phone composites in the parent marketing site. Screenshots come out 750 px wide at quality 85; the bezel comes out 580 px wide with alpha preserved. The script is in `scripts/sync-web-assets.mjs` and is idempotent — re-run any time you add a new slide or replace an existing one.

> **Note on bezel processing:** the bezel pass intentionally flattens near-cream "highlight" pixels in the gold frame to a uniform gold. The source `mockup.png` includes a metallic camera-bump shimmer and a bottom reflection band that read fine against the App Store slides' dark backgrounds but as visible light bleed against the marketing site's cream page background. If you ever update `mockup.png` to add intentionally bright design elements, expect this step to mute them — adjust the threshold in `convertBezel()` or skip the flattening for that asset.
