import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Wordmark } from "@/components/Wordmark";
import { NAV } from "@/config/site";

/**
 * Full-screen mobile menu (Radix Dialog as a shadcn Sheet). Lazy-loaded chunk: fetched on the first
 * tap/hover/focus of the menu button, so the Dialog code never ships on page load.
 * Body scroll lock + restore is handled by useScrollLock in Header (Radix's own lock stays on too).
 */
export default function MobileMenu({ open, onOpenChange, onNavigate }: { open: boolean; onOpenChange: (o: boolean) => void; onNavigate: (href: string) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-scroll-lock-allow className="overflow-y-auto overscroll-contain">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <div className="container-x flex h-16 items-center justify-between">
          <Wordmark dark />
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close menu" className="-mr-2 text-on-dark hover:bg-white/10">
              <X className="h-6 w-6" aria-hidden />
            </Button>
          </SheetClose>
        </div>
        <nav aria-label="Mobile" className="container-x mt-10 flex flex-col pb-10">
          {[...NAV, { href: "#contact", label: "Get a quote" }].map((n, i) => (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(n.href);
              }}
              className="menu-item btn-focus border-b border-on-dark/10 py-4 font-serif text-[36px] leading-[1.1] tracking-[-0.02em]"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
