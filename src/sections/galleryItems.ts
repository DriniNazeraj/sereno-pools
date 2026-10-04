import generated from "@/config/gallery.generated.json";

/**
 * PLACEHOLDER IMAGES: crops and colour grades (day, golden hour, dusk, night) of the designer's
 * AI-generated FINISHED-pool render, cut from its 5120x2880 super-resolved copy (scripts/make_placeholder_photos.py). Finished pools and night
 * shots only; no construction stages, no people, nothing hotlinked. NOT real Sereno projects.
 * Swap for real project photos and give each a real descriptive alt text.
 */
const COPY: Record<string, { place: string; alt: string }> = {
  "finished-pool": { place: "The finished pool", alt: "Rectangular pool with cream stone coping behind a modern stone-and-timber house (AI-generated placeholder)" },
  "night-glass": { place: "After dark", alt: "Lit pool at night in front of a glass wall glowing with warm interior light (AI-generated placeholder)" },
  "golden-hour": { place: "Golden hour", alt: "Finished pool and lawn in warm low evening sun, live oaks behind the house (AI-generated placeholder)" },
  "coping-detail": { place: "Tile & coping detail", alt: "Close view of blue waterline tile and cream stone coping along the pool edge (AI-generated placeholder)" },
  "dusk-pool": { place: "Blue hour", alt: "Pool lit at dusk under a violet and amber sky, house windows glowing (AI-generated placeholder)" },
  "night-water": { place: "Pool lighting", alt: "Underwater pool lights glowing turquoise at night beside dark lawn (AI-generated placeholder)" },
};

export type GalleryItem = {
  slug: string;
  /** Every exported width, e.g. [800, 1600, 2400] (coping-detail tops out at its native 2160). */
  widths: number[];
  /** Grid srcset: ONLY the ~800 and ~1600 files. The top size never loads with the grid. */
  grid: number[];
  /** Lightbox srcset: ~1600 and the top size (~2400), so a 1440 DPR 2 screen gets the 2400 file. */
  full: number[];
  w: number;
  h: number;
  place: string;
  alt: string;
};
export const ITEMS: GalleryItem[] = generated.map((g) => ({ ...g, grid: g.widths.slice(0, 2), full: g.widths.slice(1), ...COPY[g.slug] }));

/**
 * Grid `sizes`, matching the real column width of the masonry (`columns-1 sm:columns-2 md:columns-3`, gap 16 px)
 * inside .container-x (max 1240 px content, side padding clamp(20px, 5vw, 64px); screens sm 640, md 900):
 *  - >= 1368 px: (1240 - 32) / 3 = 403 px;   1280-1367: (100vw - 128 - 32) / 3;   900-1279: (90vw - 32) / 3
 *  - 640-899: two columns, (90vw - 16) / 2;  400-639: one column, 90vw;  < 400: 100vw - 40 px.
 */
export const GRID_SIZES =
  "(min-width: 1368px) 403px, (min-width: 1280px) calc(33.33vw - 54px), (min-width: 900px) calc(30vw - 11px), (min-width: 640px) calc(45vw - 8px), (min-width: 400px) 90vw, calc(100vw - 40px)";

/**
 * Lightbox `sizes` for one item: the image is max-h 78svh and max-w 100% of the dialog (padding 16 px, 48 px from
 * md), object-contain, so its rendered width is min(viewport - padding, 78vh x aspect ratio).
 */
export const lightboxSizes = (it: GalleryItem) => {
  const byHeight = `${((78 * it.w) / it.h).toFixed(1)}vh`;
  return `(min-width: 900px) min(calc(100vw - 96px), ${byHeight}), min(calc(100vw - 32px), ${byHeight})`;
};
