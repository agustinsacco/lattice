"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Label } from "@lattice/ui";
import { Loader2 } from "lucide-react";
import { supabase } from "@/client/supabase/client";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const _router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/api/auth/callback?next=/dashboard`,
        },
      });

      if (error) throw error;

      setMessage("Check your email to confirm your account");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center">
        <Image src="/logo.png" alt="Lattice Logo" width={56} height={56} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900 font-heading">Create Account</h1>
        <p className="text-gray-500 text-sm mt-2">Get started with Lattice today</p>
      </div>

      {error && <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg">{error}</div>}

      {message && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg">{message}</div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-50 border-gray-200 focus:ring-blue-500/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-gray-50 border-gray-200 focus:ring-blue-500/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="sr-only">
            Confirm Password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="bg-gray-50 border-gray-200 focus:ring-blue-500/50"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/20"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign Up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-gray-900 hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-6 text-xs text-center text-gray-500">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="font-medium text-gray-900 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-gray-900 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
