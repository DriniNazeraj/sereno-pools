import generated from "@/config/gallery.generated.json";

/**
 * PLACEHOLDER IMAGES: crops and colour grades (day, golden hour, dusk, night) of the designer's
 * AI-generated FINISHED-pool render (scripts/make_placeholder_photos.py). Finished pools and night
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

export type GalleryItem = { slug: string; widths: number[]; w: number; h: number; place: string; alt: string };
export const ITEMS: GalleryItem[] = generated.map((g) => ({ ...g, ...COPY[g.slug] }));
