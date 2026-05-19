import { Loader2 } from "lucide-react";
import { cn } from "@/client/utils";

interface FullPageLoaderProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export function FullPageLoader({ isLoading, message, className }: FullPageLoaderProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm transition-all duration-500",
        isLoading ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 rounded-full animate-pulse" />
          <div className="relative bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>

        {message && (
          <div className="text-center space-y-1">
            <p className="text-lg font-heading font-semibold text-gray-900">{message}</p>
            <p className="text-sm text-gray-500">Please wait a moment...</p>
          </div>
        )}
      </div>
    </div>
  );
}
