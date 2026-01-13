"use client";

import React, { useMemo } from 'react';
import { ArrowRight, Zap, Eye, Globe, Radar, Crosshair, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LiveScanTerminal } from '@/components/home/LiveScanTerminal';

const WorkflowPipeline = React.memo(() => (
  <div className="flex items-center justify-center lg:justify-start">
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-2 rounded-md border bg-card border-border px-3 py-2">
        <Radar className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
        <span className="text-xs font-bold tracking-widest text-muted-foreground">SCAN</span>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" focusable="false" />
      <div className="inline-flex items-center gap-2 rounded-md border bg-card border-border px-3 py-2">
        <Crosshair className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
        <span className="text-xs font-bold tracking-widest text-muted-foreground">DETECT</span>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" focusable="false" />
      <div className="inline-flex items-center gap-2 rounded-md border bg-coral text-white border-coral/80 animate-pulse px-3 py-2">
        <Radio className="h-4 w-4 text-white" aria-hidden="true" focusable="false" />
        <span className="text-xs font-bold tracking-widest text-white">LIVE FEED</span>
      </div>
    </div>
  </div>
));

WorkflowPipeline.displayName = 'WorkflowPipeline';

// Memoized Feature Tag component
const FeatureTag = React.memo(({ 
  icon: Icon, 
  text, 
  color, 
  delayClass,
  shouldSpin = false
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  text: string; 
  color: string; 
  delayClass: string; 
  shouldSpin?: boolean;
}) => (
  <div 
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full border glass-card border-border/50 shadow-sm",
      "transition-all duration-200 ease-in-out animate-fade-in-up opacity-0",
      delayClass
    )}
  >
    <div className={cn(color, "animate-pulse-slow", shouldSpin && "animate-spin-slow")}> 
      <Icon className="h-4 w-4" />
    </div>
    <span className="text-xs sm:text-sm font-medium text-foreground/90">{text}</span>
  </div>
));

FeatureTag.displayName = 'FeatureTag';

// Memoized CTA Button component
const CTAButton = React.memo(({ 
  href, 
  icon: Icon, 
  children, 
  variant = "default",
  secondaryIcon: SecondaryIcon
}: { 
  href: string; 
  icon?: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode; 
  variant?: "default" | "outline";
  secondaryIcon?: React.ComponentType<{ className?: string }>;
}) => (
  <Link 
    href={href} 
    prefetch={true}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md group h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base font-semibold transition-all duration-200 ease-in-out w-[140px] sm:w-[160px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 animate-fade-in-up active:scale-[0.98]",
      variant === "default" 
        ? "bg-coral text-white border-coral/80 hover:brightness-90 hover:border-coral/70 shadow-sm hover:shadow-md hover-glow"
        : "bg-background text-foreground border-border hover:bg-secondary/80 hover:border-coral/60 shadow-sm hover:shadow-md"
    )}
  >
    {Icon && <Icon className="mr-2 h-5 w-5" />}
    <span className="text-center">{children}</span>
    {SecondaryIcon && (
      <SecondaryIcon className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
    )}
  </Link>
));

CTAButton.displayName = 'CTAButton';



// Memoized Feature Tags component (for left column)
const FeatureTags = React.memo(() => {
  const features = useMemo(() => [
    {       icon: Zap, text: 'Real-Time Monitoring', color: 'text-coral', shouldSpin: true },
    { icon: Eye, text: 'Comprehensive Detection', color: 'text-foreground', shouldSpin: false },
    { icon: Globe, text: 'Global Coverage', color: 'text-coral', shouldSpin: false }
  ], []);

  return (
    <>
      {features.map((feature, index) => (
        <FeatureTag
          key={index}
          icon={feature.icon}
          text={feature.text}
          color={feature.color}
          delayClass=""
          shouldSpin={feature.shouldSpin}
        />
      ))}
    </>
  );
});

FeatureTags.displayName = 'FeatureTags';





export const HeroSection = React.memo(() => {
  return (
    <section className="relative min-h-screen flex items-center py-8 md:py-12 lg:py-0 lg:h-screen overflow-hidden">
      <div className="container mx-auto relative z-10 w-full px-4">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 xl:gap-16 w-full items-center">
            <div className="flex flex-col justify-center space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-9 text-center lg:text-left">
              <div className="animate-fade-in-up">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] tracking-tight mb-3 sm:mb-4">
                  <span className="text-foreground">Real-Time{' '}</span>
                  <span className="text-coral">API Key</span>
                  <br />
                  <span className="text-foreground">Leak Detection</span>
                </h1>
              </div>

              <div className="space-y-2 sm:space-y-2.5 animate-fade-in-up">
                <p className="text-xs sm:text-sm md:text-base lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Monitor public GitHub repositories in real-time to see exactly when, where, and how often API keys are exposed.
                </p>
              </div>

              <div className="hidden md:block pt-1 sm:pt-2 animate-fade-in-up">
                <WorkflowPipeline />
              </div>
              <div className="hidden lg:flex pt-2 justify-center lg:justify-start animate-fade-in-up">
                <a
                  href="https://www.producthunt.com/products/api-radar?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-api-radar-2"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="API Radar on Product Hunt"
                  className="inline-flex"
                >
                  <img
                    alt="API Radar - See your leaked API keys before attackers do | Product Hunt"
                    width="250"
                    height="54"
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1058833&theme=light&t=1767693440061"
                  />
                </a>
              </div>
            </div>

            <div className="flex flex-col justify-center animate-fade-in-up mt-6 lg:mt-0">
              <LiveScanTerminal />
              <div className="mt-4 flex flex-col gap-4 sm:gap-4.5">
                <Link
                  href="/explore"
                  prefetch={true}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md group h-10 sm:h-11 px-5 sm:px-6 text-sm sm:text-base font-semibold transition-all duration-200 ease-in-out w-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98]",
                    "bg-coral text-white border-coral/80 hover:brightness-90 hover:border-coral/70"
                  )}
                >
                  <span className="flex items-center justify-center w-full">
                    Explore Leaks
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
                  </span>
                </Link>
                <Link
                  href="/leaderboard"
                  prefetch={true}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md group h-10 sm:h-11 px-5 sm:px-6 text-sm sm:text-base font-semibold transition-all duration-200 ease-in-out w-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98]",
                    "bg-card/50 backdrop-blur-sm text-foreground border-border hover:brightness-90 hover:border-coral/70"
                  )}
                >
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';