import { useEffect, useLayoutEffect } from "react";

// layout effect in the browser (cleanup runs in the same commit as close), plain effect during SSR
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Locks page scroll while `locked` is true and restores the exact scroll position afterwards.
 * - html/body overflow hidden + overscroll-behavior none (no scroll chaining / rubber-band behind the sheet)
 * - wheel + touchmove outside `allowSelector` are cancelled (iOS Safari ignores overflow:hidden for touch)
 * - we deliberately do NOT use `position: fixed` on <body>: that resets scrollY to 0, which would make the
 *   GSAP ScrollTrigger hero scrub back to frame 0 and flip the header state while the menu is open.
 * - scrollbar width is compensated with padding so the layout doesn't jump on desktop.
 * No Lenis is used on this site; if it is added later, call lenis.stop()/start() here as well.
 */
export function useScrollLock(locked: boolean, allowSelector = "[data-scroll-lock-allow]") {
  useIsoLayoutEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const body = document.body;
    const y = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyPadding: body.style.paddingRight,
    };
    const sbw = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;
    html.dataset.scrollLocked = "true";

    const block = (e: Event) => {
      const t = e.target as Element | null;
      const scroller = t?.closest?.(allowSelector) as HTMLElement | null;
      if (scroller && scroller.scrollHeight > scroller.clientHeight) return; // let the sheet itself scroll
      if (e.cancelable) e.preventDefault();
    };
    const keys = (e: KeyboardEvent) => {
      if (["PageDown", "PageUp", "Home", "End", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("keydown", keys);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.paddingRight = prev.bodyPadding;
      delete html.dataset.scrollLocked;
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    };
  }, [locked, allowSelector]);
}
