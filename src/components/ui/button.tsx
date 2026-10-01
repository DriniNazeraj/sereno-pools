import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn-focus inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium text-[15px] transition-[background-color,color,border-color,transform] duration-[180ms] ease-out-expo active:scale-[.98] disabled:pointer-events-none disabled:opacity-70 select-none",
  {
    variants: {
      variant: {
        default: "rounded-full h-12 px-6 bg-forest-700 text-cream-50 hover:bg-forest-900",
        outline: "rounded-full h-12 px-6 border border-current bg-transparent hover:bg-black/5",
        light: "rounded-full h-12 px-6 bg-white text-forest-900 hover:bg-cream-100",
        link: "h-11 px-0 underline-offset-4 decoration-1 hover:underline",
        ghost: "rounded-full h-11 w-11 hover:bg-black/5",
      },
      size: { default: "", sm: "!h-11 !px-4 text-[14px]", icon: "h-11 w-11 !px-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
export { Button, buttonVariants };
