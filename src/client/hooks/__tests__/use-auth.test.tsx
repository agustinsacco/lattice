import { renderHook } from "@testing-library/react";
import { AuthContext, AuthContextType } from "@/client/providers/auth-provider";
import { useAuth } from "../use-auth";
import React from "react";
import { User } from "@supabase/supabase-js"; // Import User type for mocking

describe("useAuth", () => {
  it("should return the auth context when used within AuthProvider", () => {
    const mockAuthContext: AuthContextType = {
      user: { id: "123", email: "test@example.com" } as User, // Mock a User object
      logOut: jest.fn(),
      isLoading: false,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>{children}</AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toEqual(mockAuthContext);
  });

  it("should throw an error when used outside of AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within an AuthProvider");
  });
});
