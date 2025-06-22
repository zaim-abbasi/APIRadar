"use client";

import React, { useEffect } from 'react';
import { motion, useSpring, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderboardData } from '@/types';

interface StatsCardsProps {
  data: LeaderboardData;
}

interface AnimatedCounterProps {
  value: number;
  isPercentage?: boolean;
}

function AnimatedCounter({ value, isPercentage = false }: AnimatedCounterProps) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, {
    damping: 50,
    stiffness: 200,
    mass: 2
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [spring, value, isInView]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (ref.current) {
        (ref.current as any).textContent = isPercentage 
          ? `${latest.toFixed(1)}%`
          : latest.toLocaleString("en-US", { maximumFractionDigits: 0 });
      }
    });
  }, [spring, isPercentage]);

  return <span ref={ref} />;
}

const StatsCardsComponent = ({ data }: StatsCardsProps) => {
  const stats = [
    {
      title: 'Total Leaks Found',
      value: data.totalLeaks,
      icon: Shield,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      title: 'Leaks Today',
      value: data.todayLeaks,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Weekly Growth',
      value: data.weeklyGrowth,
      icon: data.weeklyGrowth > 0 ? TrendingUp : data.weeklyGrowth < 0 ? TrendingDown : Minus,
      color: data.weeklyGrowth > 0 ? 'text-red-500' : data.weeklyGrowth < 0 ? 'text-green-500' : 'text-gray-500',
      bgColor: data.weeklyGrowth > 0 ? 'bg-red-500/10' : data.weeklyGrowth < 0 ? 'bg-green-500/10' : 'bg-gray-500/10',
      isPercentage: true
    },
    {
      title: 'Providers Tracked',
      value: data.topProviders.length,
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 0.2, 
            delay: index * 0.03,
            ease: "easeOut"
          }}
          whileHover={{ y: -5, scale: 1.02 }}
          className="group"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {stat.title}
              </CardTitle>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}
              >
                <stat.icon className="h-4 w-4" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2, type: "spring", stiffness: 400, damping: 25 }}
                className="text-2xl font-bold"
              >
                {stat.isPercentage ? (
                  <AnimatedCounter value={stat.value} isPercentage />
                ) : (
                  <AnimatedCounter value={stat.value} />
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export const StatsCards = React.memo(StatsCardsComponent);