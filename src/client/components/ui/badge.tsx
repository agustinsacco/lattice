"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/client/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gray-900 text-white",
        secondary:
          "border-transparent bg-gray-100 text-gray-600",
        brand:
          "border-brand-primary/20 bg-brand-primary/10 text-brand-dark border",
        destructive:
          "border-red-100 bg-red-50 text-red-600 border",
        outline: "border-gray-200 text-gray-600 border",
        success: "border-green-100 bg-green-50 text-green-700 border",
        warning: "border-yellow-100 bg-yellow-50 text-yellow-700 border",
        error: "border-red-200 bg-red-50 text-red-600 border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
