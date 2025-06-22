"use client";

import { m, LazyMotion, domAnimation } from 'framer-motion';
import { Shield, ArrowRight, FileSearch, Zap, Lock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function HeroSection() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section className="relative h-screen overflow-hidden">
        {/* Clean Background - No Grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/5">
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/10" />
        </div>

        <div className="container mx-auto px-4 relative z-10 h-full flex items-center justify-center">
          <div className="text-center max-w-5xl mx-auto w-full">
            {/* Main Headline - Optimized Layout */}
            <m.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mb-6"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[0.95] tracking-tight">
                {/* First Line */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
                  className="mb-2 sm:mb-3 md:mb-4"
                >
                  <span className="text-foreground">
                    Beautifully{' '}
                  </span>
                  <span className="text-red-500">
                    Exposed
                  </span>
                </m.div>
                
                {/* Second Line */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
                  className="text-muted-foreground/80"
                >
                  API Keys
                </m.div>
              </h1>
            </m.div>

            {/* Feature Tags */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
              className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8"
            >
              <m.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.25, ease: 'easeOut' }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-card/40 backdrop-blur-sm border border-border/40 hover:bg-card/60 transition-all duration-200 ease-in-out"
              >
                <m.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                </m.div>
                <span className="text-xs sm:text-sm font-medium text-foreground/90">Real-time monitoring</span>
              </m.div>
              
              <m.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-card/40 backdrop-blur-sm border border-border/40 hover:bg-card/60 transition-all duration-200 ease-in-out"
              >
                <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                <span className="text-xs sm:text-sm font-medium text-foreground/90">Privacy-first approach</span>
              </m.div>
              
              <m.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.35, ease: 'easeOut' }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-card/40 backdrop-blur-sm border border-border/40 hover:bg-card/60 transition-all duration-200 ease-in-out"
              >
                <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                <span className="text-xs sm:text-sm font-medium text-foreground/90">Educational insights</span>
              </m.div>
            </m.div>

            {/* Subheading */}
            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
              className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-10 px-4"
            >
              Real-time intelligence on leaked secrets from public GitHub repositories.{' '}
              <br className="hidden sm:block" />
              Explore live incidents, learn from common mistakes, and secure your code before attackers do.
            </m.p>

            {/* CTA Buttons */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8"
            >
              <Button 
                asChild 
                size="lg" 
                className="group h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-medium bg-primary hover:bg-primary/90 transition-all duration-200 ease-in-out min-w-[140px] sm:min-w-[160px] hover:scale-[1.02]"
              >
                <Link href="/explore" className="flex items-center justify-center">
                  <FileSearch className="mr-2 h-5 w-5" />
                  Explore Leaks
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:translate-x-1" />
                </Link>
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-medium border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 ease-in-out min-w-[140px] sm:min-w-[160px] hover:scale-[1.02]"
              >
                <Link href="/learn" className="flex items-center justify-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Learn Security
                </Link>
              </Button>
            </m.div>
          </div>
        </div>
      </m.section>
    </LazyMotion>
  );
}