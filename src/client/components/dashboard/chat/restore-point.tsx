"use client";

import { Bookmark } from "lucide-react";

interface RestorePointProps {
  versionNumber: number;
  onRestore: (version: number) => void;
}

export function RestorePoint({ versionNumber, onRestore }: RestorePointProps) {
  return (
    <div className="relative py-6 px-4">
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <Bookmark className="h-5 w-5 text-primary" />
      </div>
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors"
        onClick={() => onRestore(versionNumber)}
      >
        Restore
      </div>
      <div className="border-t-2 border-dotted border-muted-foreground/30" />
    </div>
  );
}
