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
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg group h-10 sm:h-11 px-4 sm:px-6 text-sm sm:text-base font-semibold transition-all duration-200 ease-in-out w-[140px] sm:w-[160px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 animate-fade-in-up active:scale-[0.98]",
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
    { icon: Globe, text: 'Global Coverage', color: 'text-blue-500', shouldSpin: false }
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





// Memoized Right Column Content
const RightColumn = React.memo(() => {
  const features = useMemo(() => [
    { 
      icon: FileSearch, 
      text: 'Explore Real Leaks', 
      description: 'See a constantly updated list of leaked API keys from public GitHub code',
      color: 'text-coral'
    },
    { 
      icon: Shield, 
      text: 'Understand Patterns', 
      description: 'Check which providers and file types are most commonly involved in leaks',
      color: 'text-foreground'
    },
    { 
      icon: BookOpen, 
      text: 'Training Tool', 
      description: 'Use examples to teach developers what not to commit',
      color: 'text-blue-500'
    }
  ], []);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Feature Cards - Single column layout */}
      <div className="space-y-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className={cn(
              "p-4 rounded-lg border bg-card/50 backdrop-blur-sm animate-fade-in-up border-border"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <feature.icon className={cn("h-[18px] w-[18px] flex-shrink-0 mt-0.5", feature.color)} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {feature.text}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Buttons - Vertical Stack */}
      <div className="flex flex-col gap-3 pt-2">
        <Link
          href="/explore"
          prefetch={true}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-lg group h-11 px-6 text-base font-semibold transition-all duration-200 ease-in-out w-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98]",
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
            "inline-flex items-center justify-center whitespace-nowrap rounded-lg group h-11 px-6 text-base font-semibold transition-all duration-200 ease-in-out w-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98]",
            "bg-card/50 backdrop-blur-sm text-foreground border-border hover:brightness-90 hover:border-coral/70"
          )}
        >
          View Leaderboard
        </Link>
      </div>
    </div>
  );
});
RightColumn.displayName = 'RightColumn';

export const HeroSection = React.memo(() => {
  return (
    <section className="relative h-auto min-h-[85vh] sm:min-h-screen overflow-hidden">

      <div className="container mx-auto relative z-10 h-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="min-h-[85vh] sm:min-h-screen flex items-center justify-center w-full max-w-7xl mx-auto pt-2 sm:pt-4 lg:pt-6 pb-8 sm:pb-12 lg:pb-16">
          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 w-full items-center">
            {/* Left Column - Content */}
            <div className="flex flex-col justify-center space-y-6 lg:space-y-8 text-left lg:text-left">
              {/* Headline */}
              <div className="animate-fade-in-up">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight mb-4">
                  <span className="text-foreground">Real-Time{' '}</span>
                  <span className="text-coral">API Key</span>
                  <br />
                  <span className="text-foreground">Leak Detection</span>
                </h1>
              </div>

              {/* Subheading */}
              <div className="space-y-2 animate-fade-in-up">
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Browse a live feed of API keys accidentally exposed in public GitHub repositories.
                </p>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                  API Radar helps you understand how often keys leak and where the risks come from.
                </p>
              </div>

              {/* Key Benefits List */}
              <div className="space-y-3 pt-2 animate-fade-in-up">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-coral mt-2" />
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                    View newly discovered API keys from public repos in real time
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-coral mt-2" />
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                    Filter by provider (AI Key, etc.) and see where leaks come from
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-coral mt-2" />
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                    Learn from real incidents to improve your own secrets-management practices
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Features & CTAs */}
            <div className="flex flex-col justify-center animate-fade-in-up">
              <RightColumn />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';