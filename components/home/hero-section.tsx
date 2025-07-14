"use client";

import React, { useMemo } from 'react';
import { Shield, ArrowRight, FileSearch, Zap, Lock, BookOpen, Eye, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
      "flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card dark:bg-card/60 border-primary/30 shadow-sm backdrop-blur-md",
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
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg group h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base font-semibold transition-all duration-200 ease-in-out w-[140px] sm:w-[160px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 animate-fade-in-up",
      variant === "default" 
        ? "bg-primary text-primary-foreground border-primary/80 hover:bg-primary/90 hover:border-primary shadow-sm"
        : "bg-background text-foreground border-border hover:bg-secondary/80 hover:border-primary/60 shadow-sm"
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

// Memoized Hero Headline component
const HeroHeadline = React.memo(() => (
  <div className="mb-6 animate-fade-in-up">
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold leading-[0.95] tracking-tight drop-shadow-sm">
      {/* First Line */}
      <div className="mb-2 sm:mb-3 md:mb-4 animate-fade-in-up">
        <span className="text-foreground">Tracking Exposed{' '}</span>
        <span className="text-red-600 drop-shadow-md">API</span>
      </div>
      {/* Second Line */}
      <div className="text-muted-foreground/80 animate-fade-in-up drop-shadow-sm">
        leaks Live
      </div>
    </h1>
  </div>
));

HeroHeadline.displayName = 'HeroHeadline';

// Memoized Feature Tags component
const FeatureTags = React.memo(() => {
  const features = useMemo(() => [
    { icon: Zap, text: 'Leaks as They Happen', color: 'text-yellow-500', shouldSpin: true },
    { icon: Eye, text: 'See Everything Exposed', color: 'text-green-500', shouldSpin: false },
    { icon: Globe, text: 'Global Leak Radar', color: 'text-blue-500', shouldSpin: false }
  ], []);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 animate-fade-in-up">
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
    </div>
  );
});

FeatureTags.displayName = 'FeatureTags';

// Memoized Subheading component
const HeroSubheading = React.memo(() => (
  <p className="text-base md:text-lg text-muted-foreground leading-snug mb-6 sm:mb-8 px-4 animate-fade-in-up">
    See what’s leaking right now—API keys exposed in real time.<br className="hidden sm:block" />
    Don’t miss the secrets spilling from public code. Explore the world’s live feed of credential leaks.
  </p>
));

HeroSubheading.displayName = 'HeroSubheading';

// Memoized CTA Buttons component
const CTAButtons = React.memo(() => (
  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-8 sm:mb-12">
    <CTAButton href="/leaderboard" variant="outline">
      Leaderboard
    </CTAButton>
    <CTAButton href="/explore">
      <span className="flex items-center justify-center w-full">
        Explore Leaks
        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
      </span>
    </CTAButton>
  </div>
));

CTAButtons.displayName = 'CTAButtons';

export const HeroSection = React.memo(() => {
  return (
    <section className="relative h-auto min-h-[80vh] sm:h-screen overflow-hidden">
      {/* Clean Background - No Grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/5">
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/10" />
      </div>

      <div className="container mx-auto relative z-10 h-full flex items-center justify-center px-3 sm:px-0">
        <div className="min-h-[80vh] sm:min-h-screen flex flex-col justify-center text-center max-w-7xl mx-auto w-full py-4 sm:py-0">
          {/* Main Headline - Optimized Layout */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold leading-tight tracking-tight drop-shadow-sm">
              <div className="mb-1 sm:mb-3 md:mb-4 animate-fade-in-up">
                <span className="text-foreground">Tracking Exposed{' '}</span>
                <span className="text-red-600 drop-shadow-md">API</span>
              </div>
              <div className="text-muted-foreground/80 animate-fade-in-up drop-shadow-sm">leaks Live</div>
            </h1>
          </div>

          {/* Feature Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-6 animate-fade-in-up">
          <FeatureTags />
          </div>

          {/* Subheading */}
          <div className="mb-5 sm:mb-8 px-2 animate-fade-in-up">
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-snug">
              See what’s leaking right now—API keys exposed in real time.<br className="hidden sm:block" />
              Don’t miss the secrets spilling from public code. Explore the world’s live feed of credential leaks.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center mb-4 sm:mb-12">
            <CTAButton href="/leaderboard" variant="outline">
              Leaderboard
            </CTAButton>
            <CTAButton href="/explore">
              <span className="flex items-center justify-center w-full">
                Explore Leaks
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
              </span>
            </CTAButton>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';