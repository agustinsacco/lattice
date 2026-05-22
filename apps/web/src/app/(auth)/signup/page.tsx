"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/client/hooks/use-auth";
import SignupForm from "@/client/components/auth/signup-form";

export default function SignupPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if user is logged in and auth state is no longer loading
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // Optional: Show a loading state while checking auth status
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If not logged in, show the auth form
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <SignupForm />
    </Suspense>
  );
}
