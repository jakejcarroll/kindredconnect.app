"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

/* ─── Design canvas ──────────────────────────────────────────────────────
   Matches Apple's largest required iPhone slot (6.9"). Previews render at
   this size then CSS-scale into the grid card; the on-demand export target
   also renders here (and re-renders at the selected target resolution). */
const W = 1320;
const H = 2868;

const IPHONE_SIZES = [
  { label: '6.9"', w: 1320, h: 2868 },
  { label: '6.5"', w: 1284, h: 2778 },
  { label: '6.3"', w: 1206, h: 2622 },
  { label: '6.1"', w: 1125, h: 2436 },
] as const;

/* ─── iPhone mockup geometry (pre-measured from skill mockup.png) ──────── */
const MK_W = 1022;
const MK_H = 2082;
const SC_L = (52 / MK_W) * 100;
const SC_T = (46 / MK_H) * 100;
const SC_W = (918 / MK_W) * 100;
const SC_H = (1990 / MK_H) * 100;
const SC_RX = (126 / 918) * 100;
const SC_RY = (126 / 1990) * 100;

/* ─── Theme: warm-editorial (Kindred Palette) ────────────────────────────
   Mirrors `constants/theme.ts` Palette so screenshots stay on-brand. */
const THEME = {
  bg: "#FEF9F4",        // peach50
  bgAlt: "#FAF0E3",     // peach100
  bgDeeper: "#F5E0D8",  // terracotta100
  ink: "#55241C",       // terracotta900 — body
  headline: "#3A1812",  // deep brown — display headlines on light bg
  accent: "#AD6055",    // terracotta500 — primary brand color
  accentDeep: "#8D4438",// terracotta700
  muted: "#957549",     // peach600
  hairline: "#E8D5C7",
  // Dark surfaces (match app's dark-mode surfaces)
  bgDark: "#1F1C1A",         // bgDark
  surfaceDark: "#302C29",    // surfaceDark
  surfaceDarkSection: "#262320",
  shadow:
    "0 24px 80px -24px rgba(85, 36, 28, 0.18), 0 8px 24px -8px rgba(85, 36, 28, 0.12)",
};

/* ─── Image paths (served from /public — let the browser cache them) ───
   Data-URI preload caused two problems: huge base64 strings in <img src>
   silently failed to render in the previews, and pre-fetching everything
   sequentially was slow. Plain network paths render instantly and the
   browser caches them; html-to-image will re-decode them on capture. */
const img = (path: string) => path;
// Slide-aligned screenshot names — public/slides/<id>.png. Each file is the
// in-app screenshot that appears on the corresponding slide. To swap a slide's
// screenshot, replace the matching file (or update the call site below).
const phoneSrc = (name: string) => `/slides/${name}.png`;

/* Wait until every <img> inside an element has decoded — html-to-image's
   double-call only retries the snapshot, not the decode. Calling decode()
   explicitly avoids the "blank screen rectangle" race during export. */
async function waitForImagesDecoded(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((el) => {
      if (el.complete && el.naturalWidth > 0) return el.decode().catch(() => undefined);
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        el.addEventListener("load", done, { once: true });
        el.addEventListener("error", done, { once: true });
      });
    })
  );
}

/* ─── Phone: PNG mockup wrapping a screenshot src ──────────────────────── */
/* Layer order matches the SKILL recipe exactly: mockup PNG renders in normal
   flow; screenshot is absolutely positioned ON TOP at z-index 10 over the
   pre-measured screen area. This is robust to whether the mockup's screen
   cutout is opaque or transparent. */
function Phone({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: `${MK_W}/${MK_H}`,
        filter:
          "drop-shadow(0 32px 48px rgba(85, 36, 28, 0.18)) drop-shadow(0 12px 24px rgba(85, 36, 28, 0.12))",
        ...style,
      }}
    >
      <img
        src={img("/mockup.png")}
        alt=""
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
        draggable={false}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          overflow: "hidden",
          left: `${SC_L}%`,
          top: `${SC_T}%`,
          width: `${SC_W}%`,
          height: `${SC_H}%`,
          borderRadius: `${SC_RX}% / ${SC_RY}%`,
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

/* ─── Caption: label + headline scaled from canvas width ──────────────── */
function Caption({
  cW,
  label,
  headline,
  align = "left",
  inkColor = THEME.ink,
  labelColor = THEME.muted,
  maxWidth,
  headlineSize = 0.094,
  labelMarginBottom = 0.02,
}: {
  cW: number;
  label: React.ReactNode;
  headline: React.ReactNode;
  align?: "left" | "center" | "right";
  inkColor?: string;
  labelColor?: string;
  maxWidth?: number | string;
  headlineSize?: number; // multiplier of cW; default 0.094
  labelMarginBottom?: number; // multiplier of cW; default 0.02
}) {
  return (
    <div style={{ textAlign: align, maxWidth }}>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: cW * 0.034,
          fontWeight: 500,
          color: labelColor,
          marginBottom: cW * labelMarginBottom,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontSize: cW * headlineSize,
          lineHeight: 0.98,
          color: inkColor,
          letterSpacing: cW * -0.001,
        }}
      >
        {headline}
      </div>
    </div>
  );
}

/* ─── Decorative blob (subtle, warm) ──────────────────────────────────── */
function Blob({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: `blur(${size * 0.18}px)`,
        opacity: 0.65,
        ...style,
      }}
    />
  );
}

/* ─── Slide registry ──────────────────────────────────────────────────── */
type SlideProps = { cW: number; cH: number };
type SlideDef = { id: string; component: (p: SlideProps) => React.ReactNode };

const slide1: SlideDef = {
  id: "01-hero",
  component: ({ cW, cH }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(180deg, ${THEME.bg} 0%, ${THEME.bgAlt} 100%)`,
        overflow: "hidden",
      }}
    >
      <Blob size={cW * 0.6} color={THEME.bgDeeper} style={{ top: -cW * 0.18, left: -cW * 0.18 }} />
      <Blob size={cW * 0.5} color={THEME.bgDeeper} style={{ bottom: -cW * 0.1, right: -cW * 0.18 }} />
      <div
        style={{
          position: "absolute",
          top: cH * 0.075,
          left: 0,
          right: 0,
          padding: `0 ${cW * 0.08}px`,
          textAlign: "center",
          zIndex: 3,
        }}
      >
        <Caption
          cW={cW}
          label={
            <img
              src={img("/kindred-lockup.png")}
              alt="Kindred"
              style={{
                width: cW * 0.24,
                height: "auto",
                display: "block",
                marginInline: "auto",
              }}
              draggable={false}
            />
          }
          align="center"
          headlineSize={0.118}
          labelMarginBottom={0.045}
          headline={
            <>
              What you say,
              <br />
              turned into
              <br />
              what you do.
            </>
          }
        />
      </div>
      <Phone
        src={phoneSrc("01-hero")}
        alt="Home"
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          width: "86%",
          transform: "translateX(-50%) translateY(14%)",
          zIndex: 2,
        }}
      />
    </div>
  ),
};

const slide2: SlideDef = {
  id: "02-ritual",
  component: ({ cW, cH }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: THEME.bg,
        overflow: "hidden",
      }}
    >
      <Blob size={cW * 0.7} color={THEME.bgDeeper} style={{ top: -cW * 0.25, right: -cW * 0.25 }} />
      <div
        style={{
          position: "absolute",
          top: cH * 0.1,
          left: cW * 0.08,
          right: cW * 0.08,
          zIndex: 3,
        }}
      >
        <Caption
          cW={cW}
          label="The ritual"
          align="left"
          headlineSize={0.115}
          headline={
            <>
              Just the
              <br />
              two of you.
            </>
          }
        />
      </div>
      <Phone
        src={phoneSrc("02-ritual")}
        alt="Ritual start"
        style={{
          position: "absolute",
          bottom: -cH * 0.08,
          left: "50%",
          width: "86%",
          transform: "translateX(-50%)",
          zIndex: 2,
        }}
      />
    </div>
  ),
};

const slide4: SlideDef = {
  id: "04-reveal",
  component: ({ cW, cH }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(180deg, ${THEME.bgAlt} 0%, ${THEME.bgDeeper} 100%)`,
        overflow: "hidden",
      }}
    >
      <Blob size={cW * 0.7} color={THEME.bg} style={{ top: -cW * 0.25, left: cW * 0.2 }} />
      <div
        style={{
          position: "absolute",
          top: cH * 0.08,
          left: 0,
          right: 0,
          padding: `0 ${cW * 0.08}px`,
          textAlign: "center",
          zIndex: 4,
        }}
      >
        <Caption
          cW={cW}
          label="The reveal"
          align="center"
          headlineSize={0.105}
          headline={
            <>
              No peeking.
              <br />
              No editing.
            </>
          }
        />
      </div>
      <Phone
        src={phoneSrc("04-reveal-back")}
        alt="Partner answers"
        style={{
          position: "absolute",
          bottom: cH * 0.02,
          left: -cW * 0.14,
          width: "70%",
          transform: "rotate(-7deg)",
          opacity: 0.92,
          zIndex: 2,
        }}
      />
      <Phone
        src={phoneSrc("04-reveal-front")}
        alt="Mutual reveal"
        style={{
          position: "absolute",
          bottom: 0,
          right: -cW * 0.08,
          width: "78%",
          transform: "rotate(4deg)",
          zIndex: 3,
        }}
      />
    </div>
  ),
};

const slide3: SlideDef = {
  id: "03-commitments",
  component: ({ cW, cH }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(180deg, ${THEME.bgDark} 0%, ${THEME.surfaceDark} 100%)`,
        overflow: "hidden",
      }}
    >
      <Blob
        size={cW * 1.25}
        color={THEME.accent}
        style={{ top: -cW * 0.55, right: -cW * 0.55, opacity: 0.42 }}
      />
      <Blob
        size={cW * 1.05}
        color={THEME.accentDeep}
        style={{ bottom: -cW * 0.45, left: -cW * 0.5, opacity: 0.48 }}
      />
      {/* Warm halo behind the phone — gives the cream screenshot
          something to emerge from on the dark bg. */}
      <div
        style={{
          position: "absolute",
          bottom: -cW * 0.25,
          left: "50%",
          width: cW * 1.3,
          height: cW * 1.3,
          transform: "translateX(-50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${THEME.accent} 0%, transparent 60%)`,
          opacity: 0.28,
          filter: `blur(${cW * 0.04}px)`,
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: cH * 0.1,
          left: 0,
          right: 0,
          padding: `0 ${cW * 0.08}px`,
          textAlign: "center",
          zIndex: 3,
        }}
      >
        <Caption
          cW={cW}
          label="Commitments"
          align="center"
          inkColor={THEME.bg}
          labelColor={THEME.bgDeeper}
          headlineSize={0.118}
          headline={
            <>
              What you said
              <br />
              doesn&apos;t slip.
            </>
          }
        />
      </div>
      <Phone
        src={phoneSrc("03-commitments")}
        alt="Task triage"
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          width: "86%",
          transform: "translateX(-50%) translateY(14%)",
          zIndex: 2,
          // Override the Phone component's warm-brown drop-shadow with a
          // neutral dark one — the warm tint clashed with the dark surface
          // and read as a glowing border. Black at 40% gives natural depth
          // without competing with the brand-color halo behind.
          filter: "drop-shadow(0 24px 48px rgba(0, 0, 0, 0.4))",
        }}
      />
    </div>
  ),
};

const slide7: SlideDef = {
  id: "07-notes",
  component: ({ cW, cH }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: THEME.bg,
        overflow: "hidden",
      }}
    >
      <Blob size={cW * 0.7} color={THEME.bgDeeper} style={{ top: -cW * 0.25, right: -cW * 0.18 }} />
      <Phone
        src={phoneSrc("07-notes")}
        alt="Notes"
        style={{
          position: "absolute",
          top: -cH * 0.04,
          left: "50%",
          width: "78%",
          transform: "translateX(-50%) rotate(-3deg)",
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: cH * 0.08,
          left: cW * 0.08,
          right: cW * 0.08,
          textAlign: "center",
          zIndex: 3,
        }}
      >
        <Caption
          cW={cW}
          label="Between check-ins"
          align="center"
          headline={
            <>
              What you noticed,
              <br />
              kept for next time.
            </>
          }
        />
      </div>
    </div>
  ),
};

const slide8: SlideDef = {
  id: "08-identity",
  component: ({ cW, cH }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(180deg, ${THEME.bgAlt} 0%, ${THEME.bgDeeper} 100%)`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${cW * 0.08}px`,
      }}
    >
      <Blob size={cW * 0.8} color={THEME.bg} style={{ top: -cW * 0.3, left: -cW * 0.2 }} />
      <Blob size={cW * 0.7} color={THEME.bg} style={{ bottom: -cW * 0.3, right: -cW * 0.2 }} />
      <img
        src={img("/kindred-lockup.png")}
        alt="Kindred"
        style={{
          width: cW * 0.52,
          height: "auto",
          marginBottom: cW * 0.07,
          zIndex: 2,
        }}
        draggable={false}
      />
      <div style={{ zIndex: 2 }}>
        <Caption
          cW={cW}
          label="Made for"
          align="center"
          headline={
            <>
              Couples who want
              <br />
              to follow through.
            </>
          }
        />
      </div>
      <div
        style={{
          marginTop: cW * 0.04,
          maxWidth: cW * 0.7,
          fontFamily: "var(--font-sans)",
          fontSize: cW * 0.032,
          lineHeight: 1.35,
          color: THEME.muted,
          zIndex: 2,
        }}
      >
        Twenty minutes a week. Just the two of you.
      </div>
      <div
        style={{
          marginTop: cW * 0.05,
          fontFamily: "var(--font-sans)",
          fontSize: cW * 0.024,
          color: THEME.muted,
          letterSpacing: cW * 0.001,
          opacity: 0.7,
          zIndex: 2,
        }}
      >
        kindredconnect.app
      </div>
    </div>
  ),
};

const slide5: SlideDef = {
  id: "05-decide",
  component: ({ cW, cH }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(160deg, ${THEME.bgAlt} 0%, ${THEME.bg} 60%)`,
        overflow: "hidden",
      }}
    >
      <Blob size={cW * 0.6} color={THEME.bgDeeper} style={{ top: -cW * 0.18, right: -cW * 0.2 }} />
      <div
        style={{
          position: "absolute",
          top: cH * 0.1,
          left: cW * 0.08,
          right: cW * 0.08,
          textAlign: "right",
          zIndex: 3,
        }}
      >
        <Caption
          cW={cW}
          label="What's next"
          align="right"
          headline={
            <>
              Commitments,
              <br />
              made together.
            </>
          }
        />
      </div>
      <Phone
        src={phoneSrc("05-decide")}
        alt="Add a commitment"
        style={{
          position: "absolute",
          bottom: -cH * 0.04,
          left: -cW * 0.06,
          width: "82%",
          transform: "rotate(-4deg)",
          zIndex: 2,
        }}
      />
    </div>
  ),
};

const slide6: SlideDef = {
  id: "06-review",
  component: ({ cW, cH }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(180deg, ${THEME.bg} 0%, ${THEME.bgAlt} 100%)`,
        overflow: "hidden",
      }}
    >
      <Blob size={cW * 0.55} color={THEME.bgDeeper} style={{ top: -cW * 0.18, left: -cW * 0.18 }} />
      <Blob size={cW * 0.5} color={THEME.bgDeeper} style={{ bottom: -cW * 0.15, right: -cW * 0.18 }} />
      <div
        style={{
          position: "absolute",
          top: cH * 0.085,
          left: 0,
          right: 0,
          padding: `0 ${cW * 0.08}px`,
          textAlign: "center",
          zIndex: 3,
        }}
      >
        <Caption
          cW={cW}
          label="Over time"
          align="center"
          headlineSize={0.108}
          headline={
            <>
              The follow-through,
              <br />
              side by side.
            </>
          }
        />
      </div>
      <Phone
        src={phoneSrc("06-review")}
        alt="Habit tracking — both partners' ratings over weeks"
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          width: "82%",
          transform: "translateX(-50%) translateY(8%)",
          zIndex: 2,
        }}
      />
    </div>
  ),
};

/* Narrative arc — accountability loop:
   1. Hero — what you say, turned into what you do
   2. Ritual — just the two of you (orb)
   3. Commitments hero (DARK) — what you said doesn't slip
   4. Reveal — no peeking, no editing
   5. Decide — commitments, made together
   6. Review — the follow-through, side by side (longitudinal habit chart)
   7. Notes — what you noticed, kept for next time
   8. Identity — couples who want to follow through */
const SLIDES: SlideDef[] = [
  slide1,
  slide2,
  slide3,
  slide4,
  slide5,
  slide6,
  slide7,
  slide8,
];

/* ─── Preview card: renders the slide at W × H, scaled
       by ResizeObserver to fill the grid cell. ───────────────────────── */
function ScreenshotPreview({
  children,
  index,
  onExportOne,
}: {
  children: React.ReactNode;
  index: number;
  onExportOne: (i: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.6);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setScale(w / W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${W}/${H}`,
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
      <button
        onClick={() => onExportOne(index)}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          padding: "4px 10px",
          background: "rgba(255,255,255,0.92)",
          color: "#374151",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}
      >
        Export
      </button>
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          padding: "3px 8px",
          background: "rgba(0,0,0,0.55)",
          color: "white",
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function ScreenshotsPage() {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);

  // Single on-demand export target. Holds the slide currently being captured.
  const [exportSlideIdx, setExportSlideIdx] = useState<number | null>(null);
  const exportTargetRef = useRef<HTMLDivElement | null>(null);

  const currentSize = IPHONE_SIZES[sizeIdx];

  // Wait for the export target to render the requested slide, then capture.
  function waitForExportTarget(): Promise<HTMLDivElement> {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      const tick = () => {
        const el = exportTargetRef.current;
        if (el && el.firstChild) return resolve(el);
        if (performance.now() - start > 5000) return reject(new Error("export target timeout"));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async function captureSlide(slideIdx: number, w: number, h: number): Promise<string> {
    setExportSlideIdx(slideIdx);
    const el = await waitForExportTarget();
    // Make sure every <img> in the snapshot has decoded before html-to-image
    // serializes the DOM — otherwise the screen rectangles inside the phone
    // bezel come out blank.
    await waitForImagesDecoded(el);
    const opts = { width: w, height: h, pixelRatio: 1, cacheBust: true };
    // Double-call: first warms fonts/images, second produces clean output.
    await toPng(el, opts);
    const dataUrl = await toPng(el, opts);
    return dataUrl;
  }

  async function exportOne(i: number) {
    setExporting(`${i + 1}/${SLIDES.length}`);
    try {
      const dataUrl = await captureSlide(i, currentSize.w, currentSize.h);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${String(i + 1).padStart(2, "0")}-${SLIDES[i].id}-en-${currentSize.w}x${currentSize.h}.png`;
      a.click();
    } finally {
      setExportSlideIdx(null);
      setExporting(null);
    }
  }

  async function exportAll() {
    try {
      for (let i = 0; i < SLIDES.length; i++) {
        setExporting(`${i + 1}/${SLIDES.length}`);
        const dataUrl = await captureSlide(i, currentSize.w, currentSize.h);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${String(i + 1).padStart(2, "0")}-${SLIDES[i].id}-en-${currentSize.w}x${currentSize.h}.png`;
        a.click();
        // Unmount the export target between slides so memory drops back down.
        setExportSlideIdx(null);
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      setExportSlideIdx(null);
      setExporting(null);
    }
  }

  const exportSlide = exportSlideIdx != null ? SLIDES[exportSlideIdx] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            overflowX: "auto",
            minWidth: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
            Kindred · App Store
          </span>
          <span style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
            {SLIDES.length} slides · iPhone
          </span>
          <select
            value={sizeIdx}
            onChange={(e) => setSizeIdx(Number(e.target.value))}
            style={{
              fontSize: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "5px 10px",
            }}
          >
            {IPHONE_SIZES.map((s, i) => (
              <option key={i} value={i}>
                {s.label} — {s.w}×{s.h}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flexShrink: 0, padding: "10px 16px", borderLeft: "1px solid #e5e7eb" }}>
          <button
            onClick={exportAll}
            disabled={!!exporting}
            style={{
              padding: "7px 20px",
              background: exporting ? "#93c5fd" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: exporting ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {exporting ? `Exporting… ${exporting}` : "Export All"}
          </button>
        </div>
      </div>

      <div
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 24,
        }}
      >
        {SLIDES.map((slide, i) => (
          <ScreenshotPreview key={slide.id} index={i} onExportOne={exportOne}>
            {slide.component({ cW: W, cH: H })}
          </ScreenshotPreview>
        ))}
      </div>

      {/* Single on-demand export target. Mounted only while exporting; only ever
          holds one full-resolution slide at a time. */}
      {exportSlide && (
        <div
          style={{
            position: "absolute",
            left: -99999,
            top: 0,
            pointerEvents: "none",
          }}
        >
          <div
            ref={exportTargetRef}
            style={{
              width: currentSize.w,
              height: currentSize.h,
              position: "relative",
              background: "#fff",
              overflow: "hidden",
            }}
          >
            {exportSlide.component({ cW: currentSize.w, cH: currentSize.h })}
          </div>
        </div>
      )}
    </div>
  );
}
