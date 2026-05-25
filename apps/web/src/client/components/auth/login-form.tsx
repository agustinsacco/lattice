"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, Typography, Banner } from "@lattice/ui";
import SocialButton from "./social-button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/client/supabase/client";

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/api/auth/callback?next=${redirectTo}`,
        },
      });

      if (error) throw error;

      setMessage("Check your email for the magic link!");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.refresh();
      router.push(redirectTo);
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
        <Typography variant="h2" className="mt-4">Welcome Back</Typography>
        <Typography variant="muted" className="mt-2">Sign in to continue to Lattice</Typography>
      </div>

      {error && (
        <Banner variant="error" className="py-2.5">
          {error}
        </Banner>
      )}

      {message && (
        <Banner variant="success" className="py-2.5">
          {message}
        </Banner>
      )}

      <Tabs defaultValue="magic-link" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="magic-link">
          <form onSubmit={handleMagicLinkLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-magic" className="sr-only">
                Email
              </Label>
              <Input
                id="email-magic"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-50 border-gray-200 focus:ring-blue-500/50"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              variant="brand"
              className="w-full h-12"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Magic Link"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="password">
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-password" className="sr-only">
                Email
              </Label>
              <Input
                id="email-password"
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
                className="bg-gray-50 border-gray-200 focus:ring-blue-500/50"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              variant="brand"
              className="w-full h-12"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
          <span className="px-3 text-gray-400 bg-white">Or continue with</span>
        </div>
      </div>

      <div className="space-y-3">
        <SocialButton redirectTo={redirectTo} />
      </div>

      <Typography variant="small" className="mt-6 text-center block">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-brand-dark hover:text-brand-secondary transition-colors">
          Sign up
        </Link>
      </Typography>
    </div>
  );
}
