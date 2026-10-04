import { useEffect, useRef, useState } from "react";
import { CAPTIONS, FRAME_SETS, HD_MEDIA, MOBILE_MEDIA, SCRUB, STAGES, frameUrl, pickFrameSet, type FrameSet } from "@/config/hero";
import { loadFrames, type Frame } from "@/lib/frameLoader";
import { loadGsap } from "@/lib/gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

type Mode = "anim" | "static";

function shouldUseStatic() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData) return true;
  if (c?.effectiveType && /(^|-)(2g|3g)$/.test(c.effectiveType)) return true;
  return false;
}

export function Hero() {
  const [mode, setMode] = useState<Mode>("anim");
  const [stage, setStage] = useState(0);
  const [loaderDone, setLoaderDone] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderBarRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldUseStatic()) {
      setMode("static");
      setLoaderDone(true);
      return;
    }
    const set: FrameSet = pickFrameSet();
    const frames: (Frame | undefined)[] = new Array(set.count);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const state = { frame: 0 };
    let drawn = -1;
    let raf = 0;
    let lastStage = 0;
    let firstDraw = false;

    // Backing store = CSS size x DPR (capped at 2), so the canvas is never drawn small and stretched.
    // Resizing a canvas resets its 2D state, so smoothing is (re)applied after every resize and before drawing.
    const smooth = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        drawn = -1;
      }
      smooth();
    };

    // Nearest loaded frame to i (prefers the exact frame; frames stream in, so gaps are normal).
    const nearest = (i: number) => {
      if (frames[i]) return i;
      for (let d = 1; d < set.count; d++) {
        if (i - d >= 0 && frames[i - d]) return i - d;
        if (i + d < set.count && frames[i + d]) return i + d;
      }
      return -1;
    };

    const tick = () => {
      raf = 0;
      const target = Math.min(set.count - 1, Math.max(0, Math.round(state.frame)));
      const idx = nearest(target);
      if (idx >= 0 && idx !== drawn) {
        const img = frames[idx]!;
        const iw = "naturalWidth" in img ? img.naturalWidth : img.width;
        const ih = "naturalHeight" in img ? img.naturalHeight : img.height;
        const s = Math.max(canvas.width / iw, canvas.height / ih);
        const dw = iw * s, dh = ih * s;
        smooth();
        ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
        drawn = idx;
        canvas.dataset.frame = String(idx); // QA hook: frame on screen
        if (!firstDraw) {
          firstDraw = true;
          setCanvasReady(true);
        }
      }
      const p = state.frame / (set.count - 1);
      for (let i = 0; i < STAGES; i++) {
        const el = segRefs.current[i];
        if (el) el.style.transform = `scaleX(${Math.min(1, Math.max(0, p * STAGES - i))})`;
      }
      if (hintRef.current) hintRef.current.style.opacity = p > 0.05 ? "0" : "1";
      const st = Math.min(STAGES - 1, Math.floor(p * STAGES));
      if (st !== lastStage) {
        lastStage = st;
        setStage(st);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    size();
    const onResize = () => {
      size();
      schedule();
    };
    window.addEventListener("resize", onResize);

    const loader = loadFrames(
      set,
      STAGES,
      (i, f) => {
        frames[i] = f;
        // redraw if this frame is closer to the scroll target than what is on screen
        const t = Math.round(state.frame);
        if (drawn < 0 || Math.abs(i - t) < Math.abs(drawn - t)) schedule();
      },
      (n, total) => {
        if (loaderBarRef.current) loaderBarRef.current.style.transform = `scaleX(${n / total})`;
      },
      imgRef.current,
      () => state.frame,
    );
    loader.stage1.then(() => {
      setLoaderDone(true);
      schedule();
    });
    loader.rest.then(schedule);

    // scroll-scrub wiring: GSAP is a lazy chunk (see loadGsap); until it arrives frame 0 is shown
    let dead = false;
    let tween: gsap.core.Tween | undefined;
    let exit: ScrollTrigger | undefined;
    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (dead) return;
      tween = gsap.to(state, {
        frame: set.count - 1,
        ease: "none",
        onUpdate: schedule,
        scrollTrigger: {
          trigger: trackRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: SCRUB,
        },
      });
      // Hero exit: fade the heading + captions out over the last 10% of the pin, so nothing white slides
      // up under the (by then cream) header. Uses raw scroll progress, not the scrubbed frame.
      const FADE_FROM = 0.9;
      exit = ScrollTrigger.create({
        trigger: trackRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const el = fadeRef.current;
          if (!el) return;
          const o = Math.min(1, Math.max(0, (1 - self.progress) / (1 - FADE_FROM)));
          el.style.opacity = String(o);
          el.style.visibility = o === 0 ? "hidden" : "";
        },
      });
      // restore correct frame when reloading mid-page
      ScrollTrigger.refresh();
      schedule();
    });

    return () => {
      dead = true;
      loader.cancel();
      tween?.scrollTrigger?.kill();
      exit?.kill();
      tween?.kill();
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const isStatic = mode === "static";
  // First frame (or, in the static fallback, the last frame) of a set; the <picture> picks the set with the
  // same media queries the JS uses (pickFrameSet) and index.html preloads.
  const poster = (set: FrameSet) => frameUrl(set, isStatic ? set.count - 1 : 0);

  return (
    <section id="top" aria-labelledby="hero-title" className={cn("relative", isStatic && "hero-static")}>
      <div className="hero-track" ref={trackRef}>
        <div className={cn("hero-stage", isStatic && "!static !h-auto min-h-[100svh]")}>
          <div className="hero-media">
            <picture>
              <source media={MOBILE_MEDIA} srcSet={poster(FRAME_SETS.mobile)} width={FRAME_SETS.mobile.width} height={FRAME_SETS.mobile.height} />
              <source media={HD_MEDIA} srcSet={poster(FRAME_SETS.hd)} width={FRAME_SETS.hd.width} height={FRAME_SETS.hd.height} />
              <img
                ref={imgRef}
                src={poster(FRAME_SETS.desktop)}
                width={FRAME_SETS.desktop.width}
                height={FRAME_SETS.desktop.height}
                alt={isStatic ? "Finished backyard pool with stone coping behind a modern Texas house (AI-generated placeholder render)" : "Lawn behind a modern Texas house, before the pool build (AI-generated placeholder render)"}
                {...({ fetchpriority: "high" } as Record<string, string>)}
                decoding="async"
                style={{ opacity: canvasReady && !isStatic ? 0 : 1 }}
              />
            </picture>
            {!isStatic && <canvas ref={canvasRef} aria-hidden="true" />}
          </div>
          <div className="hero-overlay" />

          <div ref={fadeRef} className="hero-copy container-x relative h-full">
            {/* Mobile: wraps naturally (max 9ch). >=900px: exactly two lines, "Scroll to build / your backyard". */}
            <h1 id="hero-title" className="hero-title t-display text-white">
              <span className="hero-line">Scroll to build</span> <span className="hero-line">your backyard</span>
            </h1>

            {isStatic ? (
              <ol className="mt-10 grid max-w-xl gap-6 pb-16 text-white">
                {CAPTIONS.map((c) => (
                  <li key={c.n}>
                    <p className="eyebrow eyebrow-dark mb-2 !text-white/80">
                      {c.n} — {c.label}
                    </p>
                    <p className="t-caption">{c.text}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <>
                <div className="absolute bottom-6 left-[clamp(20px,5vw,64px)] right-[clamp(20px,5vw,64px)] md:bottom-12">
                  <div className="mb-5 flex w-40 gap-1.5" aria-hidden="true">
                    {CAPTIONS.map((c, i) => (
                      <span key={c.n} className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-white/25">
                        <span
                          ref={(el) => (segRefs.current[i] = el)}
                          className="absolute inset-0 origin-left bg-white"
                          style={{ transform: "scaleX(0)" }}
                        />
                      </span>
                    ))}
                  </div>
                  <ol className="relative h-[calc(clamp(20px,2.2vw,30px)*2.5+28px)] text-white" aria-label="Build stages">
                    {CAPTIONS.map((c, i) => (
                      <li key={c.n} className={cn("caption", i === stage && "is-active")} aria-current={i === stage ? "step" : undefined}>
                        <p className="eyebrow mb-3 !text-white/80">
                          {c.n} — {c.label}
                        </p>
                        <p className="t-caption">{c.text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div
                  ref={hintRef}
                  className="scroll-hint eyebrow absolute bottom-6 right-[clamp(20px,5vw,64px)] !text-white/80 md:bottom-12"
                  aria-hidden="true"
                >
                  Scroll <span className="arrow">↓</span>
                </div>
              </>
            )}
          </div>

          {!isStatic && (
            // Quiet loading hint (designer-approved): a hairline at the very bottom of the hero that fills while
            // stage 01 streams, then fades. Nothing covers the first frame, the heading or the captions.
            <div className={cn("hero-progress", loaderDone && "is-done")} aria-hidden="true">
              <div ref={loaderBarRef} className="hero-progress-bar" style={{ transform: "scaleX(0)" }} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
