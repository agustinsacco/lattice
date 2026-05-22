"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "none" | "small" | "default" | "large";
  background?: "transparent" | "white" | "muted" | "brand";
  border?: "none" | "top" | "bottom" | "both";
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing = "default", background = "transparent", border = "none", ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          {
            "py-0": spacing === "none",
            "py-8 lg:py-12": spacing === "small",
            "py-16 lg:py-24": spacing === "default",
            "py-24 lg:py-32": spacing === "large",
          },
          {
            "bg-white": background === "white",
            "bg-gray-50/50": background === "muted",
            "bg-blue-50/30": background === "brand",
          },
          {
            "border-t border-gray-100": border === "top" || border === "both",
            "border-b border-gray-100": border === "bottom" || border === "both",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Section.displayName = "Section";

export { Section };
