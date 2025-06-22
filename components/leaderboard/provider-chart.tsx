"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProviderStats } from '@/types';

interface ProviderChartProps {
  data: ProviderStats[];
}

const providerColors: Record<string, string> = {
  'openai': '#10b981',
  'anthropic': '#d97706',
  'google-ai': '#3b82f6',
  'cohere': '#8b5cf6',
  'aws': '#f97316',
  'stripe': '#8b5cf6',
  'github': '#6b7280',
  'discord': '#6366f1',
  'twilio': '#ef4444',
  'sendgrid': '#06b6d4',
};

const ProviderChartComponent = ({ data }: ProviderChartProps) => {
  const chartData = data.map(item => ({
    ...item,
    fill: providerColors[item.provider] || '#6b7280'
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/95 backdrop-blur-sm border border-border/50 p-3 rounded-lg shadow-lg"
        >
          <p className="font-medium capitalize">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{data.count.toLocaleString()}</span> leaks
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{data.percentage}%</span> of total
          </p>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
        className="lg:col-span-2"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Leaks by Provider</CardTitle>
            <CardDescription>
              Distribution of leaked API keys across different providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="provider" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => value.replace('-', ' ')}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Provider List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-fit">
          <CardHeader>
            <CardTitle>Top Providers</CardTitle>
            <CardDescription>
              Most frequently leaked API providers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.slice(0, 5).map((provider, index) => {
              const TrendIcon = provider.trend === 'up' ? TrendingUp : 
                              provider.trend === 'down' ? TrendingDown : Minus;
              const trendColor = provider.trend === 'up' ? 'text-red-500' : 
                               provider.trend === 'down' ? 'text-green-500' : 'text-gray-500';

              return (
                <motion.div
                  key={provider.provider}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut', delay: index * 0.03 + 0.15 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: providerColors[provider.provider] }}
                    />
                    <div>
                      <div className="font-medium capitalize group-hover:text-primary transition-colors">
                        {provider.provider.replace('-', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {provider.count.toLocaleString()} leaks
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {provider.percentage}%
                    </Badge>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={trendColor}
                    >
                      <TrendIcon className="h-4 w-4" />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export const ProviderChart = React.memo(ProviderChartComponent);