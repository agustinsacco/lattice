"use client";

import React from "react";
import { useAnalysisStatus } from "@/client/hooks/use-analysis-status";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, Database, CheckCircle2, Loader2 } from "lucide-react";

interface AnalysisLoaderProps {
  sessionId: string;
}

/**
 * A premium, glassmorphic loading overlay that shows real-time PDF analysis progress.
 * Uses framer-motion for smooth transitions and Lucide icons for visual feedback.
 */
export const AnalysisLoader: React.FC<AnalysisLoaderProps> = ({ sessionId }) => {
  const analysis = useAnalysisStatus(sessionId);

  if (!analysis) return null;

  const getIcon = (progress: number) => {
    if (progress <= 15) return <Search className="w-6 h-6 text-blue-400" />;
    if (progress <= 35) return <Database className="w-6 h-6 text-purple-400" />;
    if (progress <= 85) return <Brain className="w-6 h-6 text-pink-400" />;
    if (progress < 100) return <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />;
    return <CheckCircle2 className="w-6 h-6 text-green-400" />;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed bottom-8 right-8 z-50 max-w-sm w-full"
      >
        <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:bg-black/50">
          {/* Animated Gradient Background */}
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-30 blur-lg transition-opacity duration-500 group-hover:opacity-50" />
          
          <div className="relative flex items-start gap-4">
            <div className="flex-shrink-0 p-3 rounded-xl bg-white/5 border border-white/10 shadow-inner">
              {getIcon(analysis.progress)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white tracking-tight uppercase opacity-60">
                  AI PDF Intelligence
                </h3>
                <span className="text-xs font-mono text-white/40">{analysis.progress}%</span>
              </div>
              
              <p className="text-sm font-medium text-white/90 truncate mb-4">
                {analysis.status}
              </p>

              {/* Progress Bar Container */}
              <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                {/* Progress Fill */}
                <motion.div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${analysis.progress}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                />
                
                {/* Pulse Effect */}
                <motion.div
                  className="absolute top-0 left-0 h-full w-full bg-white/20"
                  animate={{ 
                    x: ["-100%", "100%"] 
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "linear" 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Decorative Corner Lights */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 blur-2xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-pink-500/10 blur-2xl rounded-full" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
