import { clsx, type ClassValue } from "clsx";
/** Class joiner (tailwind-merge dropped to save ~8KB gz; use `!` modifiers for overrides). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
