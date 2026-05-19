"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/client/hooks/use-auth";
import LoginForm from "@/client/components/auth/login-form";

function LoginContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to") || "/";

  useEffect(() => {
    // Redirect if user is logged in and auth state is no longer loading
    if (!isLoading && user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  // Optional: Show a loading state while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not logged in, show the auth form
  return <LoginForm redirectTo={redirectTo} />;
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/50 py-12 px-4">
      <Suspense fallback={<div>Loading form...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
