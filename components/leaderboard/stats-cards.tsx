"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Eye, Calendar, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderboardData } from '@/types';

interface StatsCardsProps {
  data: LeaderboardData;
}

interface AnimatedCounterProps {
  value: number;
  isPercentage?: boolean;
}

// Optimized animated counter using CSS transitions
const AnimatedCounter = React.memo(({ value, isPercentage = false }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Handle null value (loading state)
  if (value === null || value === undefined) {
    return (
      <span className="transition-all duration-600 ease-out">
        <span className="inline-block w-8 h-6 bg-muted animate-pulse rounded"></span>
      </span>
    );
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          animateValue(0, value);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    const element = document.getElementById('stats-container');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [value, isVisible]);

  // Handle value changes after initial animation
  useEffect(() => {
    if (isVisible && hasAnimated && displayValue !== value) {
      // If the value changes after initial animation, animate to new value
      animateValue(displayValue, value);
    }
  }, [value, isVisible, hasAnimated, displayValue]);

  const animateValue = (from: number, to: number) => {
    const duration = 600;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(from + (to - from) * easedProgress);
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setHasAnimated(true);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const formattedValue = useMemo(() => {
    if (isPercentage) {
      return `${displayValue.toFixed(1)}%`;
    }
    return displayValue.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }, [displayValue, isPercentage]);

  return (
    <span className="transition-all duration-600 ease-out">
      {formattedValue}
    </span>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';

// Memoized Stat Card component
const StatCard = React.memo(({ 
  stat, 
  index 
}: { 
  stat: any; 
  index: number; 
}) => {
  const IconComponent = useMemo(() => stat.icon, [stat.icon]);
  
  return (
    <div 
      className="group animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-all duration-200 hover:shadow-sm shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors tracking-tight">
            {stat.title}
          </CardTitle>
          <IconComponent className={`${stat.color} h-8 w-8`} />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-xl font-medium transition-all duration-500 ease-out text-foreground">
            {typeof stat.value === 'number' ? (
              stat.isPercentage ? (
                <AnimatedCounter value={stat.value} isPercentage />
              ) : (
                <AnimatedCounter value={stat.value} />
              )
            ) : (
              <span className="text-lg font-medium">{stat.value}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

StatCard.displayName = 'StatCard';

const StatsCardsComponent = React.memo(({ data }: StatsCardsProps) => {
  const stats = useMemo(() => [
    {
      title: 'Total Repos Scanned',
      value: data.totalLeaks,
      icon: Search,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Total Leaks Found',
      value: data.todayLeaks,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Repository Cutoff',
      value: 'June 1, 2025',
      icon: Calendar,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    }
  ], [data.totalLeaks, data.todayLeaks]);

  return (
    <div id="stats-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} stat={stat} index={index} />
      ))}
    </div>
  );
});

StatsCardsComponent.displayName = 'StatsCardsComponent';

export const StatsCards = StatsCardsComponent;