"use client";

import React from "react";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { CreditsModalProvider } from "@/client/providers/credits-modal";
import { WelcomeCreditsProvider } from "@/client/providers/welcome-credits-provider";

interface ClientProvidersProps {
  children: React.ReactNode;
}

/**
 * Composes all client-side providers into a single component.
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <WelcomeCreditsProvider>
          <CreditsModalProvider>{children}</CreditsModalProvider>
        </WelcomeCreditsProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
