"use client";

import React from "react";
import { Zap, Eye, Globe, ArrowRight } from "lucide-react";
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
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-gradient-to-b from-background via-white/80 to-muted/60 dark:from-background dark:via-zinc-900/80 dark:to-muted/60">
      {/* Soft background tint for depth */}
      <div className="absolute inset-0 pointer-events-none z-0" />

      {/* Logo */}
      <div className="flex flex-col items-center mb-6 mt-2 z-10">
        <Image src="/logo/logo-webp.webp" alt="API Radar Logo" height={48} width={48} className="max-h-12 max-w-12 object-contain mb-2" priority />
        <span className="text-2xl font-extrabold tracking-tight flex items-center gap-1">
          <span className="text-red-600">API</span>
          <span className="text-primary">Radar</span>
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-3xl font-extrabold leading-tight text-center mb-2 text-primary tracking-tight z-10">
        Tracking Public <span className="text-red-600">API</span>
        <br />
        <span className="text-muted-foreground font-semibold">leaks Live</span>
      </h1>
      <div className="text-center text-xs font-semibold text-primary/70 mb-5 tracking-wider uppercase z-10">REAL-TIME API KEY LEAK DETECTION</div>

      {/* Subheading */}
      <div className="w-full max-w-md mx-auto mb-7 z-10">
        <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/90 px-5 py-4 text-sm text-muted-foreground text-center leading-snug shadow-lg border border-primary/10">
          See what’s leaking right now—API keys exposed in real time. Don’t miss the secrets spilling from public code. Explore the world’s live feed of credential leaks.
        </div>
      </div>

      {/* Feature Tags - premium vertical stack */}
      <div className="w-full max-w-xs mx-auto mb-10 flex flex-col gap-4 z-10">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/95 dark:bg-zinc-900/80 shadow-md border border-transparent hover:border-primary/10 transition-all duration-150 group"
            style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.06)" }}
          >
            <div className={cn("h-8 w-1.5 rounded-lg", feature.accent, "mr-2")}></div>
            <div className={cn("p-2 rounded-full bg-background", feature.color, "flex-shrink-0")}> 
              <feature.icon className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold text-foreground/90 text-left leading-tight pl-1">{feature.text}</span>
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs mx-auto mb-8 mt-6 z-10">
        <Link
          href="/explore"
          prefetch={true}
          className="flex items-center justify-center rounded-full h-12 px-6 text-base font-semibold w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 shadow-lg active:scale-[0.98] group"
          style={{ boxShadow: "0 6px 32px 0 rgba(239,68,68,0.10)" }}
        >
          <span className="flex items-center justify-center w-full">
            Explore Leaks
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
          </span>
        </Link>
        <Link
          href="/leaderboard"
          prefetch={true}
          className="flex items-center justify-center rounded-full h-12 px-6 text-base font-semibold w-full border border-primary/20 bg-background text-primary hover:bg-muted transition-colors duration-150 shadow-sm"
        >
          Leaderboard
        </Link>
      </div>

      {/* Footer (minimal for mobile) */}
      <footer className="w-full text-center mt-auto pt-6 pb-2 text-xs text-muted-foreground/80 z-10">
        © 2025 API Radar
      </footer>
    </section>
  );
});

HeroSectionMobile.displayName = "HeroSectionMobile"; 