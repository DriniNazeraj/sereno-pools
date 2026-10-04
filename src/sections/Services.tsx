import { Waves, Bath, Hammer, Flame, Lightbulb, Droplets } from "lucide-react";
import { Card } from "@/components/ui/card";

const SERVICES = [
  { icon: Waves, title: "Custom pools", text: "Gunite pools designed around your yard, your views, and how you swim." },
  { icon: Bath, title: "Pools + spas", text: "Attached or freestanding spas with spillovers, jets, and heating." },
  { icon: Hammer, title: "Renovations", text: "New plaster, tile, coping, and equipment for a tired older pool." },
  { icon: Flame, title: "Outdoor living", text: "Kitchens, fire pits, pergolas, and decks that frame the water." },
  { icon: Lightbulb, title: "Lighting & automation", text: "Warm LED lighting and app control for pumps, heat, and colour." },
  { icon: Droplets, title: "Care & maintenance", text: "Weekly service, balancing, and repairs from the team that built it." },
];

export function Services() {
  return (
    <section id="services" aria-labelledby="services-title" className="section-y bg-cream-100">
      <div className="container-x">
        <div className="text-center">
          <p className="eyebrow" data-reveal>
            What we do
          </p>
          <h2 id="services-title" className="t-h2 mx-auto mt-6 max-w-[18ch]" data-reveal style={{ ["--i" as string]: 1 }}>
            Everything your backyard needs.
          </h2>
        </div>
        <ul className="mt-16 grid gap-6 sm:grid-cols-2 md:mt-20 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <li key={s.title} data-reveal style={{ ["--i" as string]: i % 3 }}>
              <Card className="group flex h-full flex-col p-8 transition-[transform,box-shadow] duration-[320ms] ease-out-expo hover:-translate-y-1 hover:shadow-lift">
                <s.icon className="h-7 w-7 text-forest-700" strokeWidth={1.25} aria-hidden />
                <h3 className="t-h3 mt-8">{s.title}</h3>
                <p className="mt-3 text-ink-muted">{s.text}</p>
                <a href="#contact" className="link-u mt-6 inline-flex min-h-11 items-center self-start text-[15px] font-medium text-forest-700">
                  Learn more<span className="sr-only"> about {s.title.toLowerCase()}</span>&nbsp;→
                </a>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
