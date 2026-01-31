"use client";

import React from "react";
import { ArrowRight, Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

export const HeroSectionMobile = React.memo(() => {
  return (
    <section className="relative min-h-screen flex flex-col items-center py-4 sm:py-8 px-4">
      <div className="absolute inset-0 pointer-events-none z-0" />

      <h1 className="text-3xl sm:text-4xl font-semibold leading-tight text-center mb-3 sm:mb-5 text-foreground tracking-tight z-10 px-2 mt-4 sm:mt-8">
        Real-Time <span className="text-coral">API Key</span>
        <br />
        <span className="text-foreground">Leak Detection</span>
      </h1>

      <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 sm:mb-8 z-10 px-2 max-w-sm mx-auto">
        Browse leaked API keys from public GitHub repositories.
      </p>

      <div className="flex flex-col gap-3 sm:gap-5 w-full max-w-sm mx-auto mb-6 sm:mb-10 z-10 px-2">
        <Link
          href="/explore"
          prefetch={true}
          aria-label="Explore Leaks"
          className="flex items-center justify-center rounded-md h-11 sm:h-14 px-5 sm:px-7 text-base sm:text-lg font-semibold w-full bg-coral text-primary-foreground hover:bg-coral/90 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2"
          tabIndex={0}
        >
          <span className="flex items-center justify-center w-full">
            Explore Leaks
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </span>
        </Link>
        <Link
          href="/leaderboard"
          prefetch={true}
          aria-label="View Leaderboard"
          className="flex items-center justify-center rounded-md h-11 sm:h-14 px-5 sm:px-7 text-base sm:text-lg font-semibold w-full border border-border bg-background text-foreground hover:bg-muted/80 hover:border-coral/30 transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98]"
          tabIndex={0}
        >
          View Leaderboard
        </Link>
      </div>

      <footer role="contentinfo" aria-labelledby="footer-label-mobile" className="w-full text-center mt-auto pt-4 sm:pt-8 pb-3 sm:pb-5 text-xs text-muted-foreground/80 z-10 tracking-wide">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span id="footer-label-mobile" className="font-semibold">APIRadar</span>
          <a href="mailto:zaim.k.abbasi@gmail.com" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="Email" tabIndex={0}>
            <Mail className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="GitHub" tabIndex={0}>
            <Github className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="LinkedIn" tabIndex={0}>
            <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 hover:scale-110" />
          </a>
        </div>
      </footer>
    </section>
  );
});

HeroSectionMobile.displayName = "HeroSectionMobile"; 