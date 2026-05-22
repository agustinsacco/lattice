"use client";

import Link from "next/link";
import Image from "next/image";
import { UserNav } from "@/client/components/dashboard/user-nav";
import { useAuth } from "@/client/hooks/use-auth";
import { useCredits } from "@/client/hooks/use-credits";
import { useCreditsModal } from "@/client/providers/credits-modal";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toast } from "sonner";

export function Header() {
  const { user } = useAuth();
  const { openModal } = useCreditsModal();

  // Use React Query hooks
  // Fetch user credits for validation
  const { data: credits, isLoading: isLoadingCredits } = useCredits();

  const handleCreditsClick = () => {
    openModal();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md border-gray-200 print:hidden">
      <div className="w-full px-4 md:px-6 h-16 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/logo.png" alt="Lattice Logo" width={32} height={32} className="rounded-full" />
          <span className="font-heading font-bold text-xl text-gray-900">Lattice</span>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-700 text-sm font-medium cursor-pointer hover:bg-sky-500/20 transition-all active:scale-95"
                onClick={handleCreditsClick}
              >
                <div className={`w-2 h-2 rounded-full bg-sky-500 ${isLoadingCredits ? "animate-pulse" : ""}`} />
                <span>
                  {isLoadingCredits ? "Loading..." : `${credits ? Math.floor(credits).toLocaleString() : "0"} Credits`}
                </span>
              </div>
            </>
          )}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
