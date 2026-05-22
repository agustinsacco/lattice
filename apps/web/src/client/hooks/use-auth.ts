import { useContext } from "react";
import { AuthContext } from "@/client/providers/auth-provider";

/**
 * Custom hook for accessing the authentication context.
 * This hook must be used within a component that is a child of the AuthProvider.
 * @returns The authentication context.
 * @throws Will throw an error if used outside of an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
