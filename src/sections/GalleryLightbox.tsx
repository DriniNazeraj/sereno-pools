import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Picture } from "@/components/Picture";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ITEMS, lightboxSizes } from "./galleryItems";

/** Lightbox (Radix Dialog). Lazy-loaded chunk: only fetched when a visitor opens (or hovers) a gallery image. */
export default function GalleryLightbox({ index, setIndex }: { index: number | null; setIndex: (fn: (i: number | null) => number | null) => void }) {
  const touch = useRef<number | null>(null);
  const go = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + ITEMS.length) % ITEMS.length)), [setIndex]);
  const item = index !== null ? ITEMS[index] : null;
  return (
    <Dialog open={index !== null} onOpenChange={(o) => !o && setIndex(() => null)}>
      <DialogContent
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
        className="flex flex-col items-center justify-center p-4 md:p-12"
      >
        {item && (
          <>
            <DialogTitle className="sr-only">{item.place}</DialogTitle>
            <DialogDescription className="sr-only">
              Image {index! + 1} of {ITEMS.length}. Use the arrow keys or swipe to browse.
            </DialogDescription>
            <figure className="flex max-h-full w-full flex-col items-center">
              <Picture
                key={item.slug}
                slug={item.slug}
                widths={item.full}
                width={item.w}
                height={item.h}
                alt={item.alt}
                sizes={lightboxSizes(item)}
                eager
                className="contents"
                imgClassName="max-h-[78svh] w-auto max-w-full rounded-md object-contain"
              />
              <figcaption className="mt-4 text-[14px] text-on-dark/80">
                {item.place} · {index! + 1} / {ITEMS.length} · AI-generated placeholder
              </figcaption>
            </figure>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="btn-focus absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:left-6"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="btn-focus absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:right-6"
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
            <DialogClose
              aria-label="Close"
              className="btn-focus absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:right-6 md:top-6"
            >
              <X className="h-6 w-6" aria-hidden />
            </DialogClose>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
