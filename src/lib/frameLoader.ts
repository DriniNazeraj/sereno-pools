import { frameUrl, type FrameSet } from "@/config/hero";

export type Frame = ImageBitmap | HTMLImageElement;

async function decode(url: string): Promise<Frame> {
  if (typeof createImageBitmap === "function") {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`frame ${url}: ${res.status}`);
    return await createImageBitmap(await res.blob());
  }
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return img;
}

/** Resolves once the browser has actually painted (rAF -> next task), i.e. after the first paint. */
const afterPaint = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "End", "Home", " ", "Spacebar"]);
/** Pixels the page must actually move (after load-time scroll restoration settles) to count as a real scroll. */
const SCROLL_DELTA = 24;

/**
 * Resolves on the visitor's first REAL scroll intent:
 *  - a trusted `wheel` or `touchmove` (finger actually dragging; `touchstart` / `pointerdown` taps do not count),
 *  - a scroll key (arrows, Page Up/Down, Home/End, Space) outside form fields,
 *  - or a `scroll` that moves the page more than SCROLL_DELTA px from where it settled after `load`
 *    (covers scrollbar drags; ignores the browser's scroll restoration, ScrollTrigger.refresh(), resizes
 *    and other programmatic same-position scrolls, which all happen before the baseline is taken).
 * No requestIdleCallback / timer fallback: a visitor who never scrolls never downloads stages 02-04.
 * Exception: a reload that restores the page part-way down (baseline > 0) counts as "already scrolled".
 */
function firstRealScroll(isCancelled: () => boolean) {
  return new Promise<string>((resolve) => {
    let done = false;
    let baseline: number | null = null;
    const finish = (why: string) => {
      if (done) return;
      done = true;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      if (!isCancelled()) resolve(why);
    };
    const onWheel = (e: WheelEvent) => e.isTrusted && Math.abs(e.deltaY) + Math.abs(e.deltaX) > 0 && finish("wheel");
    const onTouchMove = (e: TouchEvent) => e.isTrusted && finish("touchmove");
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!e.isTrusted || !SCROLL_KEYS.has(e.key) || t?.closest?.("input, textarea, select, [contenteditable], [role=combobox], [role=dialog]")) return;
      finish("key");
    };
    const onScroll = () => {
      if (baseline === null) return; // still before the post-load baseline: restoration / refresh, ignore
      if (Math.abs(window.scrollY - baseline) > SCROLL_DELTA) finish("scroll");
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    const takeBaseline = () =>
      // two frames after load: scroll restoration and ScrollTrigger's load-time refresh have run
      requestAnimationFrame(() => requestAnimationFrame(() => {
        baseline = window.scrollY;
        if (baseline > SCROLL_DELTA) finish("restored-mid-page");
      }));
    if (document.readyState === "complete") takeBaseline();
    else window.addEventListener("load", takeBaseline, { once: true });
  });
}

/**
 * Streams a frame set in three steps:
 *  1. frame 0: taken from the server-rendered <img fetchpriority="high"> (no second request) when it
 *     shows the same file, otherwise fetched;
 *  2. after the first paint: the rest of stage 01 (resolves `stage1`);
 *  3. only after the visitor's first real scroll (see firstRealScroll): stages 02-04.
 * Frames are fetched by a small worker pool that always picks the not-yet-requested frame nearest to
 * the current scroll target (`getTarget`), so a fast flick to the end of the hero fetches the end
 * frames first instead of waiting for every frame in between. Until a frame arrives the canvas keeps
 * the nearest loaded one.
 */
export function loadFrames(
  set: FrameSet,
  stages: number,
  onFrame: (i: number, f: Frame) => void,
  onProgress: (loadedStage1: number, totalStage1: number) => void,
  firstImg?: HTMLImageElement | null,
  getTarget: () => number = () => 0,
) {
  let cancelled = false;
  const perStage = Math.ceil(set.count / stages);
  const requested = new Uint8Array(set.count);
  let limit = perStage; // frames [0, limit) may be fetched; grows to set.count after the first real scroll
  let s1 = 0;
  let done = 0;
  let resolveStage1!: () => void;
  let resolveAll!: () => void;
  const stage1 = new Promise<void>((r) => (resolveStage1 = r));
  const all = new Promise<void>((r) => (resolveAll = r));
  let wake: (() => void) | null = null;
  const unlocked = new Promise<void>((r) => (wake = r));

  const settle = (i: number) => {
    done++;
    if (i < perStage && ++s1 <= perStage) {
      onProgress(s1, perStage);
      if (s1 === perStage) resolveStage1();
    }
    if (done === set.count) resolveAll();
  };

  const load = async (i: number) => {
    try {
      const f = await decode(frameUrl(set, i));
      if (!cancelled) onFrame(i, f);
    } catch {
      /* keep going; the nearest loaded frame is drawn */
    }
    settle(i);
  };

  /** Not-yet-requested frame in [0, limit) nearest to the scroll target (ties: the earlier frame). */
  const pick = () => {
    const t = Math.min(limit - 1, Math.max(0, Math.round(getTarget())));
    for (let d = 0; d < limit; d++) {
      if (t - d >= 0 && !requested[t - d]) return t - d;
      if (t + d < limit && !requested[t + d]) return t + d;
    }
    return -1;
  };

  const worker = async () => {
    for (;;) {
      if (cancelled) return;
      const i = pick();
      if (i < 0) {
        if (limit < set.count) { await unlocked; continue; }
        return;
      }
      requested[i] = 1;
      await load(i);
    }
  };

  const firstFrame = async () => {
    requested[0] = 1;
    const url = frameUrl(set, 0);
    const img = firstImg;
    if (img && img.currentSrc && new URL(img.currentSrc, location.href).pathname === url) {
      try {
        if (!img.complete) await new Promise((r, j) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", j, { once: true }); });
        await img.decode();
        if (!cancelled) onFrame(0, img);
        settle(0);
        return;
      } catch {
        /* fall through to a normal fetch */
      }
    }
    await load(0);
  };

  (async () => {
    await firstFrame();
    await afterPaint();
    if (!cancelled) await Promise.all(Array.from({ length: 4 }, worker));
  })();

  const rest = firstRealScroll(() => cancelled).then(async (why) => {
    performance.mark?.(`frames-rest-start:${why}`);
    limit = set.count;
    wake?.();
    await all;
    return why;
  });

  return { stage1, rest, cancel: () => { cancelled = true; wake?.(); } };
}
