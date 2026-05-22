"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { WelcomeCreditsModal } from "@/client/components/welcome/welcome-credits-modal";
import { supabase } from "@/client/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Session } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
interface WelcomeCreditsContextType {
  // Reserved for future expansion
}

const WelcomeCreditsContext = createContext<WelcomeCreditsContextType | undefined>(undefined);

export function useWelcomeCredits() {
  const context = useContext(WelcomeCreditsContext);
  if (context === undefined) {
    throw new Error("useWelcomeCredits must be used within a WelcomeCreditsProvider");
  }
  return context;
}

/**
 * WelcomeCreditsProvider
 *
 * Checks if the user should receive welcome credits on every app load.
 * The actual credit grant is controlled server-side for security and idempotency.
 * The backend RPC ensures credits are only granted once per user.
 */
export function WelcomeCreditsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [balance, setBalance] = useState(0);

  const isChecking = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && !isChecking.current) {
        checkWelcomeCredits(session);
      }
    });

    async function checkWelcomeCredits(session: Session) {
      if (isChecking.current) return;
      isChecking.current = true;
      try {
        // Call the welcome credits API endpoint
        // This is idempotent - the backend ensures credits are only granted once
        const response = await fetch("/api/welcome-credits", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          console.error("Failed to check welcome credits");
          return;
        }

        const data = await response.json();

        // If credits were just granted, show the modal
        if (data.shouldShow && data.creditsGranted) {
          setBalance(data.balance);
          setIsModalOpen(true);

          // Invalidate credits query to update UI immediately
          queryClient.invalidateQueries({ queryKey: ["credits"] });
        }
      } catch (error) {
        console.error("Error checking welcome credits:", error);
      }
    }

    // Check immediately on mount as well (for existing sessions)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkWelcomeCredits(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <WelcomeCreditsContext.Provider value={{}}>
      {children}
      <WelcomeCreditsModal isOpen={isModalOpen} onClose={handleClose} balance={balance} />
    </WelcomeCreditsContext.Provider>
  );
}
