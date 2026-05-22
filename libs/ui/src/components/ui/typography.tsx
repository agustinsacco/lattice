"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const typographyVariants = cva("text-foreground", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl font-heading",
      h2: "scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 font-heading",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight font-heading",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight font-heading",
      p: "leading-7 [&:not(:first-child)]:mt-6 font-sans",
      blockquote: "mt-6 border-l-2 pl-6 italic",
      ul: "my-6 ml-6 list-disc [&>li]:mt-2",
      inlineCode: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
      tiny: "text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "p",
  },
});

type TypographyElement = "h1" | "h2" | "h3" | "h4" | "p" | "blockquote" | "code" | "span" | "div";

interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: TypographyElement;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as, ...props }, ref) => {
    const Component = as || (variant && ["h1", "h2", "h3", "h4", "p", "blockquote"].includes(variant) ? (variant as TypographyElement) : "p");

    return (
      <Component
        className={cn(typographyVariants({ variant, className }))}
        ref={ref as any}
        {...props}
      />
    );
  }
);
Typography.displayName = "Typography";

export { Typography, typographyVariants };
