export function Intro() {
  return (
    <section id="intro" aria-labelledby="intro-title" className="section-y bg-cream-50">
      <div className="container-x text-center">
        <p className="eyebrow" data-reveal>
          Sereno Pools · Austin, TX
        </p>
        <h2 id="intro-title" className="t-h2 mx-auto mt-6 max-w-[16ch] text-ink" data-reveal style={{ ["--i" as string]: 1 }}>
          We build backyards you never want to leave.
        </h2>
        <p className="t-body-l mx-auto mt-8 max-w-[60ch] text-ink-muted" data-reveal style={{ ["--i" as string]: 2 }}>
          Sereno Pools is a custom pool builder in Austin, Texas. We design, engineer, and build every pool, spa, and outdoor
          living space in-house, from the first 3D sketch to the day you dive in. One team, one fixed price, and a finish
          that still looks new a decade later.
        </p>
      </div>
    </section>
  );
}
