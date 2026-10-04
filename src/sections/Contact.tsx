import { useEffect, useRef, useState, type ComponentType } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ContactPayload } from "@/lib/contact";

type FormComp = ComponentType<{ initial?: Partial<ContactPayload> }>;

const field =
  "w-full rounded-sm border border-input bg-transparent px-4 text-[16px] text-foreground outline-none transition-[border-color,box-shadow] duration-[180ms] focus-visible:border-forest-500 focus-visible:shadow-[0_0_0_3px_rgba(62,122,98,.35)]";

/**
 * Server-rendered stand-in with identical layout; swapped for the interactive
 * form (separate JS chunk) once the section nears the viewport or the page is idle.
 * Anything typed before the swap is carried over.
 */
function FormShell({ formRef }: { formRef: React.RefObject<HTMLFormElement> }) {
  const input = (name: string, label: string, type = "text", auto?: string) => (
    <div className="space-y-2">
      <label htmlFor={`pre-${name}`} className="block text-[14px] font-medium leading-[1.4]">
        {label}
      </label>
      <input id={`pre-${name}`} name={name} type={type} autoComplete={auto} className={`${field} h-12`} />
    </div>
  );
  const select = (label: string, placeholder: string) => (
    <div className="space-y-2">
      <span className="block text-[14px] font-medium leading-[1.4]">{label}</span>
      <div className={`${field} flex h-12 items-center justify-between text-on-dark/60`}>
        {placeholder}
        <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
      </div>
    </div>
  );
  return (
    <form ref={formRef} aria-label="Request a design consult" className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      {input("name", "Name", "text", "name")}
      <div className="grid gap-5 sm:grid-cols-2">
        {input("email", "Email", "email", "email")}
        {input("phone", "Phone", "tel", "tel")}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {select("Project type", "Choose one")}
        {select("Budget", "Choose a range")}
      </div>
      <div className="space-y-2">
        <label htmlFor="pre-message" className="block text-[14px] font-medium leading-[1.4]">
          Message <span className="font-normal text-on-dark/60">(optional)</span>
        </label>
        <textarea id="pre-message" name="message" rows={4} placeholder="Yard size, must-haves, timing…" className={`${field} min-h-[120px] resize-y py-3 leading-[1.5]`} />
      </div>
      <button type="submit" className="btn-focus inline-flex h-[52px] w-full items-center justify-center rounded-full bg-cream-50 text-[15px] font-medium text-forest-900">
        Request my design consult
      </button>
      <p className="text-center text-[13px] text-on-dark/60">No spam, ever. We only use your details to reply.</p>
    </form>
  );
}

export function Contact() {
  const [Comp, setComp] = useState<FormComp | null>(null);
  const [initial, setInitial] = useState<Partial<ContactPayload>>();
  const sectionRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let done = false;
    const load = () => {
      if (done) return;
      done = true;
      import("./ContactForm").then((m) => {
        const f = shellRef.current;
        if (f) {
          const d = new FormData(f);
          const v: Partial<ContactPayload> = {};
          (["name", "email", "phone", "message"] as const).forEach((k) => {
            const x = d.get(k);
            if (typeof x === "string" && x) v[k] = x;
          });
          setInitial(v);
        }
        setComp(() => m.default);
      });
    };
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && load(), { rootMargin: "1500px 0px" });
    if (sectionRef.current) io.observe(sectionRef.current);
    const shell = shellRef.current;
    shell?.addEventListener("focusin", load);
    const onLoad = () => setTimeout(load, 4000);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => {
      io.disconnect();
      shell?.removeEventListener("focusin", load);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <section ref={sectionRef} id="contact" aria-labelledby="contact-title" className="theme-dark section-y bg-forest-900 text-on-dark">
      <div className="container-x grid gap-14 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <p className="eyebrow eyebrow-dark" data-reveal>
            Start your project
          </p>
          <h2 id="contact-title" className="t-h2 mt-6 max-w-[12ch] text-cream-50" data-reveal style={{ ["--i" as string]: 1 }}>
            Let&rsquo;s design your backyard.
          </h2>
          <p className="t-body-l mt-6 max-w-[40ch] text-on-dark/75" data-reveal style={{ ["--i" as string]: 2 }}>
            Tell us a little about your yard and what you have in mind. We&rsquo;ll come back with ideas, a timeline, and an
            honest number.
          </p>
          <ul className="mt-10 space-y-4" data-reveal style={{ ["--i" as string]: 3 }}>
            {["Free 3D design of your backyard", "Fixed-price quote, no surprises", "A reply within 1 business day"].map((t) => (
              <li key={t} className="flex items-center gap-3 text-[16px]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-on-dark/30">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-7 lg:col-span-6 lg:col-start-7" data-reveal style={{ ["--i" as string]: 2 }}>
          <div className="rounded-lg border border-on-dark/[.14] bg-forest-950/60 p-6 sm:p-8">
            {Comp ? <Comp initial={initial} /> : <FormShell formRef={shellRef} />}
          </div>
        </div>
      </div>
    </section>
  );
}
