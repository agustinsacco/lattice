"use client";

import Link from "next/link";
import { Sparkles, LogIn, Box } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Typography } from "@/client/components/ui/typography";

export function HeroSection() {
  return (
    <div className="w-full max-w-md mx-auto py-12 px-6 bg-white border border-gray-100 rounded-3xl shadow-xl text-center space-y-6">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
        <Box className="w-8 h-8 text-blue-600 animate-pulse" />
      </div>

      <div className="space-y-2">
        <Typography variant="h3" className="font-bold">
          Welcome to Lattice
        </Typography>
        <Typography variant="muted">
          Your personal AI coding agent for creating real watertight 3D models.
        </Typography>
      </div>

      <Button asChild variant="brand" className="w-full h-12 rounded-xl font-semibold shadow-lg shadow-blue-500/10">
        <Link href="/login">
          <LogIn className="w-5 h-5 mr-2" />
          Sign In to Get Started
        </Link>
      </Button>

      <p className="text-xs text-gray-400">
        By signing in, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-gray-900 transition-colors">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-gray-900 transition-colors">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
