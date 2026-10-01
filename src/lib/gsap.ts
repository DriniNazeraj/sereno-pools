import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as ST } from "gsap/ScrollTrigger";

export type GsapKit = { gsap: typeof Gsap; ScrollTrigger: typeof ST };

let kit: Promise<GsapKit> | null = null;

/**
 * GSAP + ScrollTrigger as a separate chunk, requested only after the first paint (rAF -> next task).
 * Keeping ~45 KB gzip of animation code off the critical path lets the server-rendered hero paint
 * without it (this was the main item in the mobile LCP dependency graph). All callers share one load.
 */
export function loadGsap(): Promise<GsapKit> {
  kit ??= new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)))
    .then(() => Promise.all([import("gsap"), import("gsap/ScrollTrigger")]))
    .then(([g, s]) => {
      g.gsap.registerPlugin(s.ScrollTrigger);
      s.ScrollTrigger.config({ ignoreMobileResize: true });
      return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
    });
  return kit;
}
