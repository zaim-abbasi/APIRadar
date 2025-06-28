"use client";

import React, { useMemo } from 'react';
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
  'google': '#3b82f6',
  'cohere': '#8b5cf6',
  'aws': '#f97316',
  'stripe': '#8b5cf6',
  'github': '#6b7280',
  'discord': '#6366f1',
  'twilio': '#ef4444',
  'sendgrid': '#06b6d4',
};

// Memoized Custom Tooltip component
const CustomTooltip = React.memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 p-3 rounded-lg shadow-lg animate-fade-in-up opacity-0 animate-delay-100">
        <p className="font-medium capitalize">{label}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{data.count.toLocaleString()}</span> leaks
        </p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

// Memoized Provider List Item component
const ProviderListItem = React.memo(({ 
  provider, 
  index 
}: { 
  provider: ProviderStats; 
  index: number; 
}) => {
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 30 + 150}ms` }}
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
    </div>
  );
});

ProviderListItem.displayName = 'ProviderListItem';

const ProviderChartComponent = React.memo(({ data }: ProviderChartProps) => {
  const chartData = useMemo(() => data.map(item => ({
    ...item,
    fill: providerColors[item.provider] || '#6b7280'
  })), [data]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-6">
      {/* Chart */}
      <div className="lg:col-span-2 animate-fade-in-up opacity-0 animate-delay-150 w-full">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm w-full">
          <CardHeader>
            <CardTitle>Leaks by Provider</CardTitle>
            <CardDescription>
              Distribution of leaked API keys across different providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full min-w-0">
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
      </div>

      {/* Provider List */}
      <div className="animate-fade-in-up opacity-0 animate-delay-200 w-full">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-fit w-full">
          <CardHeader>
            <CardTitle>Top Providers</CardTitle>
            <CardDescription>
              Most frequently leaked API providers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.slice(0, 5).map((provider, index) => (
              <ProviderListItem key={provider.provider} provider={provider} index={index} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

ProviderChartComponent.displayName = 'ProviderChartComponent';

export const ProviderChart = ProviderChartComponent;