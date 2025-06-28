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

// Simplified animated counter using CSS transitions
const AnimatedCounter = React.memo(({ value, isPercentage = false }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Simple CSS-based animation
          const duration = 1000;
          const steps = 60;
          const increment = value / steps;
          let current = 0;
          
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setDisplayValue(value);
              clearInterval(timer);
            } else {
              setDisplayValue(Math.floor(current));
            }
          }, duration / steps);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('stats-container');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [value]);

  return (
    <span className="transition-all duration-1000 ease-out">
      {isPercentage 
        ? `${displayValue.toFixed(1)}%`
        : displayValue.toLocaleString("en-US", { maximumFractionDigits: 0 })
      }
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
}) => (
  <div 
    className="group animate-fade-in-up opacity-0"
    style={{ animationDelay: `${index * 50}ms` }}
  >
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {stat.title}
        </CardTitle>
        <stat.icon className={`${stat.color} h-7 w-7`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold transition-all duration-500 ease-out">
          {typeof stat.value === 'number' ? (
            stat.isPercentage ? (
              <AnimatedCounter value={stat.value} isPercentage />
            ) : (
              <AnimatedCounter value={stat.value} />
            )
          ) : (
            stat.value
          )}
        </div>
      </CardContent>
    </Card>
  </div>
));

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
  ], [data]);

  return (
    <div id="stats-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} stat={stat} index={index} />
      ))}
    </div>
  );
});

StatsCardsComponent.displayName = 'StatsCardsComponent';

export const StatsCards = StatsCardsComponent;