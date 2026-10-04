import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { NAV } from "@/config/site";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/useScrollLock";

const loadMenu = () => import("./MobileMenu");
const MobileMenu = lazy(loadMenu);

/** Header switches to the cream state this fraction of the pin BEFORE the hero unpins (heading is faded out by then). */
const SOLID_EARLY = 0.03;

export function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    const hero = document.getElementById("top");
    let raf = 0;
    const check = () => {
      raf = 0;
      if (document.documentElement.dataset.scrollLocked) return;
      const h = window.innerWidth >= 900 ? 72 : 64;
      let end = 0;
      if (hero) {
        const pinLen = hero.offsetHeight - window.innerHeight;
        end =
          pinLen > window.innerHeight * 0.5
            ? hero.offsetTop + pinLen * (1 - SOLID_EARLY) // pinned hero: just before it unpins
            : hero.offsetTop + hero.offsetHeight - h; // static (reduced motion / save-data) hero
      }
      setSolid(window.scrollY >= end);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const openMenu = () => {
    setMenuMounted(true);
    setOpen(true);
  };
  // Menu link: close (scroll lock restores the old position), then jump to the section.
  const navigate = useCallback((href: string) => {
    setOpen(false);
    requestAnimationFrame(() => {
      document.querySelector(href)?.scrollIntoView({ block: "start" });
      history.pushState(null, "", href);
    });
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 transition-[background-color,color,border-color,backdrop-filter] duration-[320ms] ease-out-expo md:h-[72px]",
        solid
          ? "border-b border-line bg-cream-50/85 text-ink backdrop-blur-[12px]"
          : "border-b border-transparent bg-transparent text-white",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="container-x flex h-full items-center justify-between gap-2 min-[360px]:gap-4">
        <a href="#top" className="btn-focus -m-2 flex min-h-11 shrink-0 items-center rounded-sm p-2" aria-label="Sereno Pools, back to top">
          <Wordmark />
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="nav-link btn-focus rounded-sm py-3 text-[15px] font-medium">
              {n.label}
            </a>
          ))}
          <Button asChild variant={solid ? "default" : "light"} className="ml-2">
            <a href="#contact">Get a quote</a>
          </Button>
        </nav>
        <div className="flex min-w-0 items-center gap-1 min-[360px]:gap-2 md:hidden">
          <Button asChild size="sm" variant={solid ? "default" : "light"} className="max-[359px]:!px-3 max-[359px]:text-[13px]">
            <a href="#contact">Get a quote</a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={openMenu}
            onPointerEnter={loadMenu}
            onTouchStart={loadMenu}
            onFocus={loadMenu}
            className={cn("-mr-2 shrink-0", solid ? "hover:bg-black/5" : "hover:bg-white/10")}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </Button>
        </div>
      </div>
      {menuMounted && (
        <Suspense fallback={null}>
          <MobileMenu open={open} onOpenChange={setOpen} onNavigate={navigate} />
        </Suspense>
      )}
    </header>
  );
}
