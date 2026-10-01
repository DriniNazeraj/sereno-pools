import { cn } from "@/lib/utils";
/** "Sereno POOLS". The {" "} keeps the DOM text "Sereno Pools" (accessible name / label-content match);
 *  the visual gap comes from flex gap, so the space itself isn't rendered. */
export function Wordmark({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="font-serif text-[24px] leading-none tracking-[-0.01em]">Sereno</span>{" "}
      <span className={cn("text-[10px] font-semibold uppercase leading-none tracking-[.2em]", dark ? "text-on-dark/70" : "opacity-70")}>Pools</span>
    </span>
  );
}
