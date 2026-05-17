"use client";

import { User, Session } from "@supabase/supabase-js";

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);



/**
 * Provides authentication state to its children.
 * Manages the user session and listens for auth changes.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[AuthProvider] Error fetching initial session:", error);
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
      const newUser = session?.user ?? null;

      // Only update state if the user actually changed
      setUser((prevUser) => {
        if (prevUser?.id !== newUser?.id) {
          // Invalidate queries when user changes to ensure fresh data
          queryClient.invalidateQueries({ queryKey: ["credits"] });
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          queryClient.invalidateQueries({ queryKey: ["user"] });
        }

        if (
          prevUser?.id === newUser?.id &&
          JSON.stringify(prevUser?.user_metadata) === JSON.stringify(newUser?.user_metadata)
        ) {
          return prevUser;
        }
        return newUser;
      });

      // Only set isLoading to false if it's not already false, to avoid unnecessary re-renders
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [queryClient]);

  const logOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      logOut,
    }),
    [user, isLoading, logOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
