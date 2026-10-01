import { Suspense, lazy, useState } from "react";
import { Picture } from "@/components/Picture";
import { ITEMS } from "./galleryItems";

const loadLightbox = () => import("./GalleryLightbox");
const GalleryLightbox = lazy(loadLightbox);

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  // The lightbox chunk (Radix Dialog) is only mounted after the first open, so it never ships on page load.
  const [mounted, setMounted] = useState(false);
  const open = (i: number) => {
    setMounted(true);
    setIndex(i);
  };

  return (
    <section id="gallery" aria-labelledby="gallery-title" className="section-y bg-white">
      <div className="container-x">
        <div className="text-center">
          <p className="eyebrow" data-reveal>
            Recent work
          </p>
          <h2 id="gallery-title" className="t-h2 mt-6" data-reveal style={{ ["--i" as string]: 1 }}>
            A few we&rsquo;re proud of.
          </h2>
          <p className="mt-4 text-[13px] text-ink-muted" data-reveal style={{ ["--i" as string]: 2 }}>
            AI-generated placeholder images shown for layout; real project photos coming soon.
          </p>
        </div>
        <ul className="mt-16 columns-1 gap-4 sm:columns-2 md:mt-20 md:columns-3">
          {ITEMS.map((it, i) => (
            <li key={it.slug} className="mb-4 break-inside-avoid" data-reveal style={{ ["--i" as string]: i % 3 }}>
              <button
                type="button"
                onClick={() => open(i)}
                onPointerEnter={loadLightbox}
                onFocus={loadLightbox}
                className="group relative block w-full overflow-hidden rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
                aria-label={`${it.place}: open larger image`}
              >
                <Picture
                  slug={it.slug}
                  widths={it.widths}
                  width={it.w}
                  height={it.h}
                  alt={it.alt}
                  sizes="(min-width: 1200px) 400px, (min-width: 900px) 31vw, (min-width: 640px) 46vw, 92vw"
                  imgClassName="block h-auto w-full transition-transform duration-[600ms] ease-out-expo group-hover:scale-[1.03]"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-forest-950/70 to-transparent p-5 pt-16 text-left text-[14px] font-medium text-white opacity-0 transition-opacity duration-[320ms] group-hover:opacity-100 group-focus-visible:opacity-100">
                  {it.place}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {mounted && (
        <Suspense fallback={null}>
          <GalleryLightbox index={index} setIndex={setIndex} />
        </Suspense>
      )}
    </section>
  );
}
