"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Layout Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card/50 backdrop-blur-sm border border-red-500/20 rounded-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Critical Architecture Error</h1>
            <p className="text-sm text-muted-foreground/80">
              The application engine encountered an unrecoverable boundary failure.
            </p>
          </div>

          <div className="pt-4 border-t border-border/50">
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              Reboot Engine
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
