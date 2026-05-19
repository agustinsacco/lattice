"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/client/utils";

const bannerVariants = cva(
  "relative w-full p-4 flex items-start gap-3 rounded-2xl border text-sm transition-all",
  {
    variants: {
      variant: {
        info: "bg-blue-50 border-blue-100 text-blue-800",
        brand: "bg-blue-50 border-blue-100 text-blue-900",
        success: "bg-green-50 border-green-100 text-green-800",
        warning: "bg-orange-50 border-orange-100 text-orange-800",
        error: "bg-red-50 border-red-100 text-red-800",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

interface BannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  title?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  ({ className, variant, title, icon, children, onClose, ...props }, ref) => {
    const defaultIcon = {
      info: <Info className="h-5 w-5" />,
      brand: <Info className="h-5 w-5" />,
      success: <CheckCircle className="h-5 w-5" />,
      warning: <AlertTriangle className="h-5 w-5" />,
      error: <AlertCircle className="h-5 w-5" />,
    }[variant || "info"];

    return (
      <div
        ref={ref}
        className={cn(bannerVariants({ variant }), className)}
        {...props}
      >
        <div className="flex-shrink-0 mt-0.5">{icon || defaultIcon}</div>
        <div className="flex-1">
          {title && <h5 className="font-bold mb-1">{title}</h5>}
          <div className="leading-relaxed">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 hover:bg-black/5 rounded-lg p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Banner.displayName = "Banner";

export { Banner, bannerVariants };
