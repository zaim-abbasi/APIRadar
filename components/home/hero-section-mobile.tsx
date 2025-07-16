"use client";

import React from "react";
import { Zap, Eye, Globe, ArrowRight, Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const features = [
  { icon: Zap, text: "Leaks as They Happen", color: "text-yellow-500", accent: "bg-yellow-400/80" },
  { icon: Eye, text: "See Everything Exposed", color: "text-green-500", accent: "bg-green-400/80" },
  { icon: Globe, text: "Global Leak Radar", color: "text-blue-500", accent: "bg-blue-400/80" },
];

export const HeroSectionMobile = React.memo(() => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-7 bg-gradient-to-b from-background via-white/90 to-muted/60 dark:from-background dark:via-zinc-900/80 dark:to-muted/60">
      {/* Soft background tint for depth */}
      <div className="absolute inset-0 pointer-events-none z-0" />

      {/* Logo */}
      <div className="flex flex-col items-center mb-7 mt-2 z-10">
        <Image src="/logo/logo-webp.webp" alt="API Radar Logo" height={52} width={52} className="max-h-14 max-w-14 object-contain mb-2 drop-shadow-md" priority />
        <span className="text-2xl font-extrabold tracking-tight flex items-center gap-1">
          <span className="text-red-600">API</span>
          <span className="text-primary">Radar</span>
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl font-extrabold leading-tight text-center mb-3 text-primary tracking-tight z-10 drop-shadow-md">
        Tracking Public <span className="text-red-600">API</span>
        <br />
        <span className="text-muted-foreground font-semibold">leaks Live</span>
      </h1>
      <div className="text-center text-xs font-semibold text-primary/70 mb-6 tracking-wider uppercase z-10">REAL-TIME API KEY LEAK DETECTION</div>

      {/* Subheading */}
      <div className="w-full max-w-md mx-auto mb-8 z-10 px-1">
        <div className="rounded-2xl bg-white/95 dark:bg-zinc-900/95 px-6 py-4 text-base text-muted-foreground text-center leading-snug shadow-xl border border-primary/10">
          Live API key leaks from public code. Track secrets as they happen.
        </div>
      </div>

      {/* Feature Tags - premium vertical stack */}
      <div className="w-full max-w-xs mx-auto mb-8 flex flex-col gap-2 z-10">
        {[
          { icon: Zap, text: "Live Leaks", color: "text-yellow-500", accent: "bg-yellow-400/80" },
          { icon: Eye, text: "All Exposed", color: "text-green-500", accent: "bg-green-400/80" },
          { icon: Globe, text: "Global Radar", color: "text-blue-500", accent: "bg-blue-400/80" },
        ].map((feature, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/100 dark:bg-zinc-900/90 shadow-md border border-transparent hover:border-primary/10 transition-all duration-150 group"
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
          className="flex items-center justify-center rounded-full h-14 px-7 text-lg font-semibold w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 shadow-xl active:scale-[0.98] group focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
          style={{ boxShadow: "0 8px 32px 0 rgba(239,68,68,0.13)" }}
        >
          <span className="flex items-center justify-center w-full">
            Explore Leaks
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </span>
        </Link>
        <Link
          href="/leaderboard"
          prefetch={true}
          className="flex items-center justify-center rounded-full h-14 px-7 text-lg font-semibold w-full border border-primary/20 bg-background text-primary hover:bg-muted transition-colors duration-150 shadow-md focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
        >
          Leaderboard
        </Link>
      </div>

      {/* Social/Contact Icons (mobile only, above footer) */}
      {/* This section is now moved to the footer */}

      {/* Footer (minimal for mobile, now with inline social/contact icons) */}
      <footer className="w-full text-center mt-auto pt-7 pb-3 text-xs text-muted-foreground/80 z-10 tracking-wide">
        <div className="flex items-center justify-center gap-3">
          <span className="font-semibold">API Radar</span>
          <a href="mailto:zaim.k.abbasi@gmail.com" className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150" aria-label="Email">
            <Mail className="h-4 w-4" />
          </a>
          <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150" aria-label="GitHub">
            <Github className="h-4 w-4" />
          </a>
          <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150" aria-label="LinkedIn">
            <Linkedin className="h-4 w-4" />
          </a>
        </div>
      </footer>
    </section>
  );
});

HeroSectionMobile.displayName = "HeroSectionMobile"; 