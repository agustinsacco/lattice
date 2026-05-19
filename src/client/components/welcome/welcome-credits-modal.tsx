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
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 p-8 text-center text-white">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <DialogTitle className="text-3xl font-heading font-bold text-white mb-2">Welcome to Lattice!</DialogTitle>
          <DialogDescription className="text-lg font-sans text-white/90 font-medium">
            You've received <span className="font-bold text-white">{Math.floor(balance).toLocaleString()} free credits</span> to get started
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
            <p className="text-base text-gray-700">Start generating and previewing your 3D models immediately!</p>
            <p className="text-sm text-muted-foreground">
              Our AI assistant will build 3D CAD models from your text descriptions.
            </p>
          </div>

          {/* Call to action - Primary Button style */}
          <Button
            onClick={onClose}
            className="w-full h-12 text-lg font-sans bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
            size="lg"
          >
            Start Modeling in 3D ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
