"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "small" | "large" | "full";
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto px-4 w-full",
          {
            "max-w-7xl": size === "default",
            "max-w-4xl": size === "small",
            "max-w-[1400px]": size === "large",
            "max-w-full": size === "full",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Container.displayName = "Container";

export { Container };
