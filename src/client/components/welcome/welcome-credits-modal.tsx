"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";

interface WelcomeCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
}

/**
 * WelcomeCreditsModal
 *
 * A celebratory modal that welcomes new users and informs them
 * they've received free credits to start using Lattice.
 */
export function WelcomeCreditsModal({ isOpen, onClose, balance }: WelcomeCreditsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0 bg-white rounded-xl sm:rounded-xl border border-gray-200 shadow-2xl">
        {/* Header with celebration */}
        {/* Header with celebration */}
        <div className="bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-400 p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <DialogTitle className="text-3xl font-heading font-bold text-gray-900 mb-2">Welcome to Lattice!</DialogTitle>
          <DialogDescription className="text-lg font-sans text-gray-800 font-medium">
            You've received <span className="font-bold text-gray-900">{Math.floor(balance).toLocaleString()} free credits</span> to get started
          </DialogDescription>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Balance display - Clean Bordered Card style */}
          <div className="flex flex-col items-center justify-center py-4 space-y-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-sans text-muted-foreground uppercase tracking-wider font-medium">
              Your Current Balance
            </span>
            <span className="text-3xl font-heading font-bold text-gray-800 flex items-baseline gap-1.5">
              {Math.floor(balance).toLocaleString()} <span className="text-lg font-sans text-muted-foreground font-medium">Credits</span>
            </span>
          </div>

          {/* Information */}
          <div className="space-y-3 text-center font-sans">
            <p className="text-base text-gray-700">Start uploading and filling your PDFs immediately!</p>
            <p className="text-sm text-muted-foreground">
              Our AI assistant will guide you through any form, making paperwork effortless.
            </p>
          </div>

          {/* Call to action - Primary Button style */}
          <Button
            onClick={onClose}
            className="w-full h-12 text-lg font-sans bg-yellow-400 text-gray-900 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
            size="lg"
          >
            Start Filling PDFs ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
