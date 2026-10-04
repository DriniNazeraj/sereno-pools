import { useEffect, useRef } from "react";
import { Picture } from "@/components/Picture";
import { loadGsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";

export function OutdoorLiving() {
  const ref = useRef<HTMLElement>(null);
  const img = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !img.current || prefersReducedMotion()) return;
    let dead = false;
    let t: gsap.core.Tween | undefined;
    loadGsap().then(({ gsap }) => {
      if (dead || !ref.current || !img.current) return;
      t = gsap.fromTo(
        img.current,
        { yPercent: -8 },
        { yPercent: 8, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } },
      );
    });
    return () => {
      dead = true;
      t?.scrollTrigger?.kill();
      t?.kill();
    };
  }, []);
  return (
    <section ref={ref} id="outdoor-living" aria-labelledby="outdoor-title" className="relative flex min-h-[90svh] items-end overflow-hidden bg-forest-950">
      {/* PLACEHOLDER IMAGE — day-for-night grade of the AI-generated hero render; replace with a real night photo. */}
      <div ref={img} className="absolute inset-x-0 -top-[10%] h-[120%] will-change-transform">
        <Picture
          slug="outdoor-living"
          widths={[800, 1600, 2400, 3200]}
          width={3200}
          height={1800}
          alt="The pool lit at night with warm light from the house (AI-generated placeholder)"
          /* object-cover in a box 120% of a min-h-[90svh] section: rendered width = max(100vw, 1.2 x 90vh x 16/9) */
          sizes="max(100vw, 192vh)"
          imgClassName="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-forest-950/25 to-transparent" />
      <div className="container-x relative pb-16 pt-40 md:pb-24">
        <h2 id="outdoor-title" className="t-h2 max-w-[14ch] text-white" data-reveal>
          More than a pool. A place to gather.
        </h2>
        <p className="t-body-l mt-6 max-w-[48ch] text-on-dark/80" data-reveal style={{ ["--i" as string]: 1 }}>
          Outdoor kitchens, fire features, shade structures, and lighting designed with the pool, not bolted on after.
        </p>
        <a href="#services" className="link-u mt-6 inline-flex min-h-11 items-center text-[15px] font-medium text-white" data-reveal style={{ ["--i" as string]: 2 }}>
          See outdoor living →
        </a>
      </div>
    </section>
  );
}
