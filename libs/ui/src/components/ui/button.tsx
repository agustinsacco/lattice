import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-brand-primary/30 focus-visible:ring-4 focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 aria-invalid:border-destructive cursor-pointer hover:translate-y-[-2px] active:translate-y-[1px] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gray-900 text-white hover:bg-gray-800 shadow-xl shadow-gray-200/50",
        brand:
          "bg-gradient-to-br from-brand-primary to-[#FFD700] text-brand-dark shadow-[0_8px_20px_-4px_rgba(255,242,66,0.4)] border border-brand-primary/20",
        brandOutline:
          "border-2 border-brand-primary bg-white text-brand-dark hover:bg-brand-primary/5 shadow-sm",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-red-200/50",
        outline:
          "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
        secondary: 
          "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: 
          "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900",
        link: 
          "text-brand-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-14 px-8 py-4 text-base rounded-2xl",
        icon: "h-11 w-11 p-0",
        "icon-sm": "h-9 w-9 p-0",
        "icon-lg": "h-14 w-14 p-0 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
