import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full rounded-sm border border-input bg-transparent px-4 text-[16px] text-foreground placeholder:text-on-dark/40 transition-[border-color,box-shadow] duration-[180ms] outline-none focus-visible:border-forest-500 focus-visible:shadow-[0_0_0_3px_rgba(62,122,98,.35)] aria-[invalid=true]:border-error";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, "h-12", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(fieldBase, "py-3 leading-[1.5] resize-y min-h-[120px]", className)} {...props} />,
);
Textarea.displayName = "Textarea";
