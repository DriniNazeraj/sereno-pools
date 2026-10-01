import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * PLACEHOLDER STATS — not confirmed. Replace with Drini's real numbers before launch.
 * Final values are rendered in the HTML; the count-up is visual only.
 */
const STATS = [
  { value: 18, decimals: 0, suffix: "", label: "Years building in Austin" },
  { value: 600, decimals: 0, suffix: "+", label: "Pools completed" },
  { value: 25, decimals: 0, suffix: "", label: "Design & build awards" },
  { value: 4.9, decimals: 1, suffix: "", label: "Average Google rating" },
];

export function Stats() {
  const ref = useRef<HTMLDListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    const nums = Array.from(el.querySelectorAll<HTMLElement>("[data-count]"));
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1200;
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const e = 1 - Math.pow(1 - p, 3);
          nums.forEach((n) => {
            const v = Number(n.dataset.count);
            const d = Number(n.dataset.decimals);
            n.textContent = (v * e).toFixed(d);
          });
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section aria-label="Sereno Pools in numbers" className="bg-forest-900 py-[72px] text-on-dark">
      <div className="container-x">
        <dl ref={ref} className="grid grid-cols-2 gap-y-12 md:grid-cols-4 md:gap-y-0">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={
                "flex flex-col items-center px-4 text-center " +
                (i % 2 === 1 ? "border-l border-on-dark/15 " : "") +
                (i === 2 ? "md:border-l md:border-on-dark/15" : "")
              }
            >
              <dt className="order-2 mt-3 text-[14px] leading-[1.4] text-on-dark/70">{s.label}</dt>
              <dd className="t-stat order-1">
                <span data-count={s.value} data-decimals={s.decimals} className="inline-block min-w-[2ch]">
                  {s.value.toFixed(s.decimals)}
                </span>
                {s.suffix}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
