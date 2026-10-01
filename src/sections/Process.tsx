import { useEffect, useRef } from "react";
import { loadGsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";

const STEPS = [
  { title: "Design", text: "A site visit, then a 3D design of your backyard." },
  { title: "Engineer", text: "Soil tests, structural plans, and city permits." },
  { title: "Excavate", text: "We dig, frame, and set the steel rebar cage." },
  { title: "Build", text: "Concrete shell, hand-set tile, and stone coping." },
  { title: "Fill & hand over", text: "Water chemistry, a walkthrough, then dive in." },
];

export function Process() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const lines = root.querySelectorAll<HTMLElement>("[data-line]");
    if (prefersReducedMotion()) {
      lines.forEach((l) => (l.style.transform = "none"));
      return;
    }
    let dead = false;
    let tweens: gsap.core.Tween[] = [];
    loadGsap().then(({ gsap }) => {
      if (dead) return;
      tweens = Array.from(lines).map((l) =>
        gsap.fromTo(
          l,
          { [l.dataset.line === "x" ? "scaleX" : "scaleY"]: 0 },
          { [l.dataset.line === "x" ? "scaleX" : "scaleY"]: 1, ease: "none", scrollTrigger: { trigger: root, start: "top 80%", end: "bottom 60%", scrub: 0.6 } },
        ),
      );
    });
    return () => {
      dead = true;
      tweens.forEach((t) => (t.scrollTrigger?.kill(), t.kill()));
    };
  }, []);

  return (
    <section id="process" aria-labelledby="process-title" className="section-y bg-cream-50">
      <div className="container-x">
        <div className="text-center">
          <p className="eyebrow" data-reveal>
            How we build
          </p>
          <h2 id="process-title" className="t-h2 mx-auto mt-6 max-w-[18ch]" data-reveal style={{ ["--i" as string]: 1 }}>
            Five steps from sketch to swim.
          </h2>
        </div>
        <div ref={ref} className="relative mt-16 md:mt-24">
          {/* track + drawn line: horizontal on desktop, vertical on mobile */}
          <div aria-hidden className="absolute left-5 top-5 bottom-5 w-px bg-line md:left-[10%] md:right-[10%] md:top-5 md:bottom-auto md:h-px md:w-auto">
            <div data-line="y" className="line-v absolute inset-0 origin-top bg-forest-700 md:hidden" />
            <div data-line="x" className="line-h absolute inset-0 hidden origin-left bg-forest-700 md:block" />
          </div>
          <ol className="relative grid gap-10 md:grid-cols-5 md:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-6 md:flex-col md:items-center md:gap-0 md:text-center" data-reveal style={{ ["--i" as string]: i }}>
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-forest-700 bg-cream-50 font-serif text-[17px] text-forest-700">
                  {i + 1}
                </span>
                <div className="md:mt-6">
                  <h3 className="text-[20px] leading-[1.2] tracking-[-0.01em]">{s.title}</h3>
                  <p className="mt-2 max-w-[28ch] text-[15px] leading-[1.55] text-ink-muted md:mx-auto">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
