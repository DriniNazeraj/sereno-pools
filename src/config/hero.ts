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
 * width/height below are the REAL pixel dimensions of the files (used for <img width/height> and cover math).
 */
export type FrameSet = {
  name: "desktop" | "mobile";
  dir: string;
  count: number;
  width: number;
  height: number;
};

export const FRAME_SETS: Record<FrameSet["name"], FrameSet> = {
  desktop: { name: "desktop", dir: "/frames/desktop", count: 120, width: 1280, height: 720 },
  mobile: { name: "mobile", dir: "/frames/mobile", count: 60, width: 720, height: 900 },
};

/** Viewports narrower than this load the portrait (mobile) set. */
export const MOBILE_BREAKPOINT = 900;
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
