import { Wordmark } from "@/components/Wordmark";
import { NAV, SITE } from "@/config/site";

export function Footer() {
  return (
    <footer className="bg-forest-950 pb-10 pt-20 text-on-dark">
      <div className="container-x">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Wordmark dark />
            <p className="mt-5 max-w-[34ch] text-[15px] text-on-dark/70">Custom pools, spas, and outdoor living, designed and built in Austin, Texas.</p>
          </div>
          <div className="md:col-span-4">
            <p className="eyebrow eyebrow-dark">Visit or call</p>
            {/* PLACEHOLDER contact details */}
            <address className="mt-5 space-y-1 text-[15px] not-italic text-on-dark/85">
              <p>{SITE.street}</p>
              <p>
                {SITE.city}, {SITE.region} {SITE.zip}
              </p>
              <p className="pt-3">
                <a href={SITE.phoneHref} className="link-u inline-flex min-h-11 items-center">
                  {SITE.phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${SITE.email}`} className="link-u inline-flex min-h-11 items-center">
                  {SITE.email}
                </a>
              </p>
            </address>
          </div>
          <nav aria-label="Footer" className="md:col-span-3">
            <p className="eyebrow eyebrow-dark">Explore</p>
            <ul className="mt-4">
              {[...NAV, { href: "#contact", label: "Contact" }].map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="link-u inline-flex min-h-11 items-center text-[15px] text-on-dark/85">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-2 border-t border-on-dark/10 pt-8 text-[13px] text-on-dark/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Sereno Pools (placeholder name). All rights reserved.</p>
          <p>Licensed &amp; insured · Austin, TX</p>
        </div>
      </div>
    </footer>
  );
}
