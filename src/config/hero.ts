/**
 * Hero frame-sequence config: the ONE place to change frame counts / folders / dimensions.
 * Frames live in /public/frames/<set>/frame_001.webp ... frame_NNN.webp (3-digit, 1-based).
 *
 * Current frames are AI-generated PLACEHOLDER renders supplied by the designer (a modern Texas house:
 * lawn -> dig pit with rebar -> concrete shell -> filled pool). They are NOT illustrations and NOT real
 * Sereno projects; replace with approved footage/renders before launch.
 *  - desktop: 120 frames, 1280x720 WebP, <= 60 KB each (scripts/reencode_frames.py, from the designer's
 *    lossless stage renders; originals backed up at /workspace/sereno/frames-designer-originals/).
 *  - mobile:  60 frames, 720x900 WebP (designer's portrait crop, unchanged).
 *  - hd:      120 frames, 1920x1080 WebP for wide / high-DPI screens (see HD_MEDIA), rendered by
 *    design/hero-stages/make_frames.py from the Real-ESRGAN 2560x1440 stage sources in design/hero-stages/hd-2560/.
 *    Before the first real scroll only `hd.prescroll` is fetched (frame 1 plus five more, spread across
 *    stage 1). The other 114 stream in nearest-first after that scroll. Desktop and mobile still prefetch
 *    the whole of stage 1.
 * width/height below are the REAL pixel dimensions of the files (used for <img width/height> and cover math).
 */
export type FrameSet = {
  name: "desktop" | "mobile" | "hd";
  dir: string;
  count: number;
  width: number;
  height: number;
  /**
   * 0-based frames fetched before the first real scroll. Omit to prefetch every frame in stage 1.
   * HD only: 1-based frames 1, 6, 12, 18, 24, 30 (about 1.2 MB instead of all 30 stage-1 frames).
   */
  prescroll?: readonly number[];
};

export const FRAME_SETS: Record<FrameSet["name"], FrameSet> = {
  desktop: { name: "desktop", dir: "/frames/desktop", count: 120, width: 1280, height: 720 },
  mobile: { name: "mobile", dir: "/frames/mobile", count: 60, width: 720, height: 900 },
  hd: { name: "hd", dir: "/frames/hd", count: 120, width: 1920, height: 1080, prescroll: [0, 5, 11, 17, 23, 29] },
};

/** Viewports narrower than this load the portrait (mobile) set. */
export const MOBILE_BREAKPOINT = 900;
/** Portrait (phone) set. */
export const MOBILE_MEDIA = `(max-width: ${MOBILE_BREAKPOINT - 0.02}px)`;
/**
 * HD set: viewport >= 1280 CSS px AND viewport x DPR > 1400 device px, i.e. width > 1400 px at DPR 1,
 * or >= 1280 px at DPR >= 1.1 (zoomed / scaled laptops, Retina, 4K).
 * The SAME query drives the <picture> <source>, the <link rel="preload"> in index.html (keep in sync) and
 * the JS set choice, so the preloaded first frame is always the one the canvas uses.
 */
export const HD_MEDIA =
  "(min-width: 1401px), (min-width: 1280px) and (min-resolution: 1.1dppx), (min-width: 1280px) and (-webkit-min-device-pixel-ratio: 1.1)";

/** Picks the frame set for the current viewport (browser only). */
export function pickFrameSet(): FrameSet {
  if (window.matchMedia(MOBILE_MEDIA).matches) return FRAME_SETS.mobile;
  if (window.matchMedia(HD_MEDIA).matches) return FRAME_SETS.hd;
  return FRAME_SETS.desktop;
}
export const STAGES = 4;
/** Scroll length of the pin, in viewport heights (one per stage). Keep in sync with .hero-track in index.css. */
export const PIN_VH = 400;
export const SCRUB = 0.5;

export const frameUrl = (set: FrameSet, i: number) => `${set.dir}/frame_${String(i + 1).padStart(3, "0")}.webp`;

export const CAPTIONS = [
  { n: "01", label: "THE START", text: "Every great pool starts as a patch of grass." },
  { n: "02", label: "THE DIG", text: "We dig, frame, and steel-reinforce." },
  { n: "03", label: "THE BUILD", text: "Concrete shell. Hand-\u2060set tile. Stone coping." },
  { n: "04", label: "THE FINISH", text: "Fill it, balance it — then dive in." },
] as const;
