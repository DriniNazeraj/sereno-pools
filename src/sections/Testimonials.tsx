import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * PLACEHOLDER TESTIMONIALS — invented copy for layout only. Replace with real,
 * attributable client reviews. Do NOT add Review/AggregateRating schema for these.
 */
const QUOTES = [
  {
    quote: "They showed us the pool in 3D before a single shovel hit the ground, and the finished yard looks exactly like it.",
    name: "Placeholder client",
    area: "Westlake Hills",
  },
  {
    quote: "Fixed price, a weekly update every Friday, and a crew that left the site cleaner than they found it.",
    name: "Placeholder client",
    area: "Travis Heights",
  },
  {
    quote: "Our kids have not left the water since June. The neighbours keep asking who built it.",
    name: "Placeholder client",
    area: "Circle C Ranch",
  },
];

export function Testimonials() {
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="section-y bg-cream-50">
      <div className="container-x">
        <div className="text-center">
          <p className="eyebrow" data-reveal>
            Reviews
          </p>
          <h2 id="reviews-title" className="t-h2 mx-auto mt-6 max-w-[16ch]" data-reveal style={{ ["--i" as string]: 1 }}>
            Word travels in the cul-de-sac.
          </h2>
          <p className="mt-4 text-[13px] text-ink-muted" data-reveal style={{ ["--i" as string]: 2 }}>
            Sample quotes shown for layout; real client reviews coming soon.
          </p>
        </div>
        <ul
          className="no-scrollbar -mx-[clamp(20px,5vw,64px)] mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[clamp(20px,5vw,64px)] px-[clamp(20px,5vw,64px)] pb-2 md:mx-0 md:mt-20 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0"
          aria-label="Client reviews"
          tabIndex={0}
        >
          {QUOTES.map((q, i) => (
            <li key={q.area} className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto" data-reveal style={{ ["--i" as string]: i }}>
              <Card className="flex h-full flex-col p-8 shadow-card">
                <div className="flex gap-1 text-forest-500" role="img" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-current" strokeWidth={0} aria-hidden />
                  ))}
                </div>
                <blockquote className="mt-6 flex-1 font-serif text-[20px] italic leading-[1.45] text-ink">&ldquo;{q.quote}&rdquo;</blockquote>
                <p className="mt-8 text-[14px] text-ink-muted">
                  <span className="font-medium text-ink">{q.name}</span> · {q.area}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
