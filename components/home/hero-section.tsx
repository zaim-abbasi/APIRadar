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
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode; 
  variant?: "default" | "outline";
  secondaryIcon?: React.ComponentType<{ className?: string }>;
}) => (
  <Link 
    href={href} 
    prefetch={true}
    className="inline-flex items-center justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-primary-foreground rounded-md group h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-medium bg-primary hover:bg-primary/90 transition-all duration-200 ease-in-out min-w-[140px] sm:min-w-[160px] hover:scale-[1.02] flex items-center justify-center animate-fade-in-up opacity-0 animate-delay-450"
  >
    <Icon className="mr-2 h-5 w-5" />
    {children}
    {SecondaryIcon && (
      <SecondaryIcon className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
    )}
  </Link>
));

CTAButton.displayName = 'CTAButton';

// Memoized Hero Headline component
const HeroHeadline = React.memo(() => (
  <div className="mb-6 animate-fade-in-up opacity-0 animate-delay-100">
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold leading-[0.95] tracking-tight drop-shadow-sm">
      {/* First Line */}
      <div className="mb-2 sm:mb-3 md:mb-4 animate-fade-in-up opacity-0 animate-delay-100">
        <span className="text-foreground">
          Exposing{' '}
        </span>
        <span className="text-red-600 drop-shadow-md">
          GitHub
        </span>
      </div>
      {/* Second Line */}
      <div className="text-muted-foreground/80 animate-fade-in-up opacity-0 animate-delay-150 drop-shadow-sm">
        API Leaks
      </div>
    </h1>
  </div>
));

HeroHeadline.displayName = 'HeroHeadline';

// Memoized Feature Tags component
const FeatureTags = React.memo(() => {
  const features = useMemo(() => [
    { icon: Zap, text: 'Real-time detection', color: 'text-yellow-500', delayClass: 'animate-delay-250', shouldSpin: true },
    { icon: Eye, text: 'Instant visibility', color: 'text-green-500', delayClass: 'animate-delay-300', shouldSpin: false },
    { icon: Globe, text: 'Global coverage', color: 'text-blue-500', delayClass: 'animate-delay-350', shouldSpin: false }
  ], []);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6 animate-fade-in-up opacity-0 animate-delay-200">
      {features.map((feature, index) => (
        <FeatureTag
          key={index}
          icon={feature.icon}
          text={feature.text}
          color={feature.color}
          delayClass={feature.delayClass}
          shouldSpin={feature.shouldSpin}
        />
      ))}
    </div>
  );
});

FeatureTags.displayName = 'FeatureTags';

// Memoized Subheading component
const HeroSubheading = React.memo(() => (
  <p className="text-base md:text-lg text-muted-foreground leading-snug mb-6 sm:mb-8 px-4 animate-fade-in-up opacity-0 animate-delay-400">
    Live tracking of exposed API keys from millions of GitHub repositories.<br className="hidden sm:block" />
    Discover leaks as they happen, with unmatched detail and speed.
  </p>
));

HeroSubheading.displayName = 'HeroSubheading';

// Memoized CTA Buttons component
const CTAButtons = React.memo(() => (
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-4">
    <CTAButton href="/explore" icon={FileSearch} secondaryIcon={ArrowRight}>
      Explore Leaks
    </CTAButton>
  </div>
));

CTAButtons.displayName = 'CTAButtons';

export const HeroSection = React.memo(() => {
  return (
    <section className="relative h-screen overflow-hidden">
      {/* Clean Background - No Grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/5">
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/10" />
      </div>

      <div className="container mx-auto relative z-10 h-full flex items-center justify-center">
        <div className="text-center max-w-7xl mx-auto w-full">
          {/* Main Headline - Optimized Layout */}
          <HeroHeadline />

          {/* Feature Tags */}
          <FeatureTags />

          {/* Subheading */}
          <HeroSubheading />

          {/* CTA Buttons */}
          <CTAButtons />
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';