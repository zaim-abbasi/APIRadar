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

interface AnimatedDateProps {
  dateString: string | null;
}

// Optimized animated counter using CSS transitions
const AnimatedCounter = React.memo(({ value, isPercentage = false }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          if (value !== null && value !== undefined) {
            animateValue(0, value);
          }
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
    if (isVisible && hasAnimated && displayValue !== value && value !== null && value !== undefined) {
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

  // Handle null value (loading state) - show skeleton instead of empty space
  if (value === null || value === undefined) {
    return (
      <span className="transition-all duration-600 ease-out">
        <span className="inline-block w-16 h-6 skeleton rounded"></span>
      </span>
    );
  }

  return (
    <span className="transition-all duration-600 ease-out">
      {formattedValue}
    </span>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';

// Optimized animated date component
const AnimatedDate = React.memo(({ dateString }: AnimatedDateProps) => {
  const [displayDate, setDisplayDate] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          if (dateString) {
            animateDate(dateString);
          }
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    const element = document.getElementById('stats-container');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateString, isVisible]);

  useEffect(() => {
    if (dateString && !displayDate) {
      // Initial date setting - animate immediately
      animateDate(dateString);
    } else if (isVisible && hasAnimated && displayDate !== dateString && dateString) {
      // If the date changes after initial animation, animate to new date
      animateDate(dateString);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateString, isVisible, hasAnimated, displayDate]);

  const animateDate = (targetDate: string) => {
    const duration = 600;
    const startTime = performance.now();
    const startDate = new Date(displayDate || targetDate);
    const endDate = new Date(targetDate);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate between dates
      const currentTimeStamp = startDate.getTime() + (endDate.getTime() - startDate.getTime()) * easedProgress;
      const currentDate = new Date(currentTimeStamp);
      
      // Format the date as YYYY-MM-DD (SSR-safe)
      const formattedDate = currentDate.toISOString().slice(0, 10);
      
      setDisplayDate(formattedDate);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setHasAnimated(true);
      }
    };
    
    requestAnimationFrame(animate);
  };

  // Only return null after all hooks have been called
  if (!dateString || isNaN(new Date(dateString).getTime())) {
    return null;
  }

  return (
    <span className="transition-all duration-600 ease-out">{displayDate}</span>
  );
});

AnimatedDate.displayName = 'AnimatedDate';

function AnimatedDateCounterInline({ dateString }: { dateString: string | null }) {
  const [mounted, setMounted] = useState(false);
  const [day, setDay] = useState(1);
  const [year, setYear] = useState(2000);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !dateString || isNaN(new Date(dateString).getTime())) return;
    const targetDate = new Date(dateString);
    const targetDay = targetDate.getUTCDate();
    const targetYear = targetDate.getUTCFullYear();
    let frame: number;
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 600, 1);
      setDay(Math.round(1 + (targetDay - 1) * progress));
      setYear(Math.round(2000 + (targetYear - 2000) * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [mounted, dateString]);

  if (!dateString || isNaN(new Date(dateString).getTime())) return null;
  const date = new Date(dateString);
  const month = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ][date.getUTCMonth()];

  // On first render (SSR), show the final value
  if (!mounted) {
    return (
      <span className="transition-all duration-600 ease-out">
        {date.getUTCDate()} {month}, {date.getUTCFullYear()}
      </span>
    );
  }

  return (
    <span className="transition-all duration-600 ease-out">
      {day} {month}, {year}
    </span>
  );
}

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
      className="group"
    >
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 hover:border-border/70 transition-all duration-200 hover:shadow-md hover:shadow-primary/5 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-5">
          <CardTitle className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors duration-200 tracking-tight">
            {stat.title}
          </CardTitle>
          <div className="p-1.5 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors duration-200">
            <IconComponent className={`${stat.color} h-6 w-6 transition-transform duration-200 group-hover:scale-110`} />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="text-2xl font-semibold text-foreground">
            {typeof stat.value === 'number' && stat.value !== null ? (
              stat.isPercentage ? (
                <span>{stat.value.toFixed(1)}%</span>
              ) : (
                <span>{stat.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              )
            ) : stat.isDate && stat.value ? (
              <span>{new Date(stat.value).toLocaleDateString('en-US', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            ) : (
              <span className="inline-block w-16 h-6 skeleton rounded"></span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

StatCard.displayName = 'StatCard';

function StatsErrorFallback() {
  return (
    <div className="text-center text-destructive my-4" role="alert">
      Failed to load stats. Please try refreshing the page.
    </div>
  );
}

export const StatsCards = React.memo(function StatsCards({ data }: StatsCardsProps) {
  // Defensive: fallback for missing/null data
  if (!data || typeof data !== 'object') {
    return <StatsErrorFallback />;
  }
  const {
    totalLeaks,
    todayLeaks,
    leaksFoundToday
    // repositoryCutoff
  } = data;

  // Defensive: fallback for all stats
  const safeTotalLeaks = typeof totalLeaks === 'number' && isFinite(totalLeaks) ? totalLeaks : 0;
  const safeTodayLeaks = typeof todayLeaks === 'number' && isFinite(todayLeaks) ? todayLeaks : 0;
  const safeLeaksFoundToday = typeof leaksFoundToday === 'number' && isFinite(leaksFoundToday) ? leaksFoundToday : 0;
  // const safeRepositoryCutoff = typeof repositoryCutoff === 'string' ? repositoryCutoff : null;

  const stats = useMemo(() => [
    {
      title: 'Leaks Found Today',
      value: safeLeaksFoundToday,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10'
    },
    {
      title: 'Total Leaks Found',
      value: safeTodayLeaks,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Total Repos Scanned',
      value: safeTotalLeaks,
      icon: Search,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    }
  ], [safeTotalLeaks, safeTodayLeaks, safeLeaksFoundToday]);

  return (
    <div
      id="stats-container"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-8"
    >
      {stats.map((stat, index) => (
        <StatCard key={stat.title} stat={stat} index={index} />
      ))}
    </div>
  );
});

StatsCards.displayName = 'StatsCards';