"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const thinkingPhrases = [
  "Looking at your PDF...",
  "Reading the document...",
  "Thinking about the fields...",
  "Vibing with the data...",
  "Cooking up a response...",
  "Connecting the dots...",
];

export function ProgressiveThinking() {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((prev) => (prev + 1) % thinkingPhrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start w-full my-4">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full border text-sm font-medium bg-muted/30 border-gray-100 text-gray-500 shadow-sm overflow-hidden relative">
        {/* Shimmer effect background */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="animate-pulse tracking-wide">{thinkingPhrases[phraseIdx]}</span>
      </div>
    </div>
  );
}
