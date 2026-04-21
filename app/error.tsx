"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route Logic Error:", error);
  }, [error]);

  return (
    <div className="min-h-[400px] w-full flex items-center justify-center p-4 flex-1">
      <div className="w-full max-w-md bg-card/40 backdrop-blur-md border border-red-500/20 rounded-xl p-6 sm:p-8 text-center space-y-5 animate-fade-in-up">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
        </div>
        
        <div className="space-y-2.5">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">System Exception</h2>
          <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed font-medium">
            The application layout encountered an unhandled logic fault.
          </p>
        </div>

        <div className="pt-3 sm:pt-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-6 py-2.5 sm:py-3 text-[13px] sm:text-sm font-bold text-amber-500 uppercase tracking-widest transition-all hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            Attempt Recovery
          </button>
        </div>
      </div>
    </div>
  );
}
