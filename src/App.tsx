import { useEffect } from "react";
import { Header } from "@/sections/Header";
import { Hero } from "@/sections/Hero";
import { Intro } from "@/sections/Intro";
import { Stats } from "@/sections/Stats";
import { Process } from "@/sections/Process";
import { Gallery } from "@/sections/Gallery";
import { OutdoorLiving } from "@/sections/OutdoorLiving";
import { Services } from "@/sections/Services";
import { Testimonials } from "@/sections/Testimonials";
import { Contact } from "@/sections/Contact";
import { Footer } from "@/sections/Footer";

function useReveals() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((e) => e.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          // reveal on 15% in view, or if already scrolled past (jump via nav link)
          if (e.isIntersecting || e.boundingClientRect.bottom < 0) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

export default function App() {
  useReveals();
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <Intro />
        <Stats />
        <Process />
        <Gallery />
        <OutdoorLiving />
        <Services />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
