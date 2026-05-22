"use client";

import { DashboardContainer } from "@/client/components/dashboard/dashboard-container";
import { useAuth } from "@/client/hooks/use-auth";
import { HeroSection } from "@/client/components/landing/hero-section";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <HeroSection />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      <DashboardContainer user={user} />
    </div>
  );
}
