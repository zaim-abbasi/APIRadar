"use client";

import { Radar } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center flex-1">
      <div className="flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.15)]">
          <Radar className="h-8 w-8 text-amber-500 animate-pulse relative z-10" />
        </div>
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground animate-pulse">
          Connecting to Radar
        </span>
      </div>
    </div>
  );
}
