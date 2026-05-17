"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FileText, Sparkles, Zap, Lock, LogIn, Brain, Image as ImageIcon, Globe } from "lucide-react";
import { useAuth } from "@/client/hooks/use-auth";
import { Button } from "@/client/components/ui/button";
import { Typography } from "@/client/components/ui/typography";
import { Container } from "@/client/components/ui/container";
import { Section } from "@/client/components/ui/section";
import { Badge } from "@/client/components/ui/badge";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!user) {
      router.push("/login?redirect_to=/&upload_attempt=true");
      return;
    }

    setUploadError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        return router.push("/login");
      }

      if (!response.ok) {
        throw new Error("Failed to upload PDF");
      }

      const { sessionId } = await response.json();
      router.push(`/session/${sessionId}`);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero + Upload Section */}
      <Section spacing="large" className="relative overflow-visible">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-200/40 via-white to-white" />

        <Container size="small" className="text-center space-y-10">
          {/* Hero Copy */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Badge variant="brand" className="px-4 py-2 gap-2 h-auto text-sm">
              <Sparkles className="h-4 w-4" />
              Agentic 3D Modeler
            </Badge>
            
            <Typography variant="h1" className="leading-[1.1]">
              Build 3D models with AI.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600">
                Just describe it.
              </span>
            </Typography>
            
            <Typography variant="lead" className="max-w-xl mx-auto">
              While others just generate text, Lattice builds real 3D models (STLs) through natural conversation with a coding agent.
            </Typography>
          </div>

          {/* Start Session Button */}
          <div className="relative z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <Button size="lg" variant="brand" className="h-14 px-8 text-lg rounded-2xl" onClick={() => router.push('/session/new')}>
              <Sparkles className="w-5 h-5 mr-2" />
              Start Modeling Now
            </Button>
          </div>
        </Container>
      </Section>

      {/* Features Section */}
      <Section background="muted" border="top">
        <Container size="default" className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Feature List */}
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 delay-300">
            <Typography variant="h2">
              Chat with your documents
            </Typography>
            <div className="grid gap-8">
              {[
                {
                  icon: Brain,
                  title: "Smarter The More You Use It",
                  desc: "We securely save and reuse your personal info. Our agent learns your details, saving you more time with every form.",
                },
                {
                  icon: ImageIcon,
                  title: "Context Via Screenshots",
                  desc: "Have your info on another document? Upload a screenshot and our agent will magically extract and map the data for you.",
                },
                {
                  icon: Globe,
                  title: "Web-Enabled Research",
                  desc: "Stuck on a tricky question? Lattice searches the web to find the exact information you need and guides you through it.",
                },
                {
                  icon: Zap,
                  title: "Pixel-Perfect Writing",
                  desc: "We magically map coordinates and write directly on flat, scanned PDFs where traditional editors completely fail.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-5">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-secondary">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <Typography variant="large" className="mb-1">{item.title}</Typography>
                    <Typography variant="muted" className="leading-relaxed">{item.desc}</Typography>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup Chat Card */}
          <div className="relative group animate-in fade-in slide-in-from-right-8 duration-1000 delay-400">
            <div className="absolute inset-0 bg-yellow-200 rounded-3xl blur-3xl opacity-20 -rotate-3 transition-transform group-hover:rotate-3 duration-1000" />

            <div className="relative bg-white border border-gray-200 shadow-xl rounded-3xl p-6 space-y-5">
              {/* File header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="text-left">
                    <Typography variant="small" className="font-bold">Rental_Agreement.pdf</Typography>
                    <Typography variant="tiny">Ready to vibe</Typography>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>

              {/* Chat bubbles (decorative) */}
              <div className="space-y-3 opacity-40 select-none">
                <div className="flex justify-end">
                  <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[11px] font-medium text-gray-700 max-w-[85%]">
                    Here's a screenshot of my W-2. Can you fill this out?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-yellow-400 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[11px] font-medium text-gray-900 max-w-[85%]">
                    Done! I've extracted your details. I also searched the web for your state's tax code.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[11px] font-medium text-gray-700 max-w-[85%]">
                    Perfect. Use my saved address for the rest.
                  </div>
                </div>
              </div>

              {/* Login Gate Overlay */}
              {!user && (
                <div className="absolute inset-4 top-16 flex items-center justify-center z-20">
                  <div className="bg-white/95 backdrop-blur-md border border-yellow-200 p-8 rounded-2xl shadow-xl text-center space-y-4 max-w-[280px]">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6 text-brand-secondary" />
                    </div>
                    <Typography variant="h4">Login to start chatting</Typography>
                    <Typography variant="small" className="text-gray-500 leading-relaxed">
                      Receive your free credits and start filling forms in seconds.
                    </Typography>
                    <Button asChild variant="brand" className="w-full h-12 rounded-xl">
                      <Link href="/login">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In Now
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </Section>

      {/* Minimal Footer */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Lattice. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
