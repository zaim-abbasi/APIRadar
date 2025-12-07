"use client";

import React from "react";
import { Zap, Eye, Globe, ArrowRight, Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const HeroSectionMobile = React.memo(() => {
  // Memoize features array to prevent recreation on every render
  const features = React.useMemo(() => [
    { icon: Zap, text: "Real-Time Monitoring", color: "text-yellow-500", accent: "bg-yellow-400/80" },
    { icon: Eye, text: "Comprehensive Detection", color: "text-green-500", accent: "bg-green-400/80" },
    { icon: Globe, text: "Global Coverage", color: "text-blue-500", accent: "bg-blue-400/80" },
  ], []);
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-7 bg-background">
      {/* Soft background tint for depth */}
      <div className="absolute inset-0 pointer-events-none z-0" />

      {/* Logo */}
      <div className="flex flex-col items-center mb-7 mt-2 z-10">
        <Image src="/logo/logo-webp.webp" alt="API Radar Logo" height={52} width={52} className="max-h-14 max-w-14 object-contain mb-2 drop-shadow-md" priority />
        <span className="text-2xl font-extrabold tracking-tight flex items-center gap-1">
          <span className="text-destructive">API</span>
          <span className="text-primary">Radar</span>
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl font-semibold leading-tight text-center mb-4 text-foreground tracking-tight z-10">
        Real-Time <span className="text-destructive">API Key</span>
        <br />
        <span className="text-foreground">Leak Detection</span>
      </h1>

      {/* Subheading */}
      <div className="w-full max-w-md mx-auto mb-8 z-10 px-1">
        <div className="rounded-lg bg-card/95 px-6 py-4 text-base text-muted-foreground text-center leading-relaxed shadow-xl border border-primary/10">
          Monitor API key exposures across millions of public repositories. Track security incidents as they happen with detailed insights.
        </div>
      </div>

      {/* Feature Tags - premium vertical stack */}
      <div className="w-full max-w-xs mx-auto mb-8 flex flex-col gap-2 z-10">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/90 shadow-md border border-transparent hover:border-primary/10 transition-all duration-150 group"
            style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.07)" }}
          >
            <div className={cn("h-6 w-1 rounded-lg", feature.accent, "mr-1")}></div>
            <div className={cn("p-1.5 rounded-full bg-background", feature.color, "flex-shrink-0")}> 
              <feature.icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground/90 text-left leading-tight pl-1">{feature.text}</span>
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs mx-auto mb-10 mt-4 z-10">
        <Link
          href="/explore"
          prefetch={true}
          aria-label="Explore Leaks"
          className="flex items-center justify-center rounded-lg h-14 px-7 text-lg font-semibold w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] group focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
          tabIndex={0}
        >
          <span className="flex items-center justify-center w-full">
            Explore Leaks
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </span>
        </Link>
        <Link
          href="/leaderboard"
          prefetch={true}
          aria-label="View Leaderboard"
          className="flex items-center justify-center rounded-lg h-14 px-7 text-lg font-semibold w-full border border-primary/20 bg-background text-primary hover:bg-muted/80 hover:border-primary/30 transition-all duration-200 shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 active:scale-[0.98]"
          tabIndex={0}
        >
          View Leaderboard
        </Link>
      </div>

      {/* Social/Contact Icons (mobile only, above footer) */}
      {/* This section is now moved to the footer */}

      {/* Footer (minimal for mobile, now with inline social/contact icons) */}
      <footer role="contentinfo" aria-labelledby="footer-label-mobile" className="w-full text-center mt-auto pt-9 pb-5 text-xs text-muted-foreground/80 z-10 tracking-wide">
        <div className="flex items-center justify-center gap-3">
          <span id="footer-label-mobile" className="font-semibold">API Radar</span>
          <a href="mailto:zaim.k.abbasi@gmail.com" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="Email" tabIndex={0}>
            <Mail className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="GitHub" tabIndex={0}>
            <Github className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="LinkedIn" tabIndex={0}>
            <Linkedin className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
        </div>
      </footer>
    </section>
  );
});

HeroSectionMobile.displayName = "HeroSectionMobile"; 