"use client";

import React, { useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProviderStats } from '@/types';

interface ProviderChartProps {
  data: ProviderStats[];
  totalLeaks?: number;
}

// Static provider colors object - using chart tokens
const providerColors: Record<string, string> = {
  'ai-key': 'hsl(var(--chart-2))',
};

// Function to map database provider names to display names
const getProviderDisplayName = (provider: string): string => {
  const displayNames: Record<string, string> = {
    'ai-key': 'AI Key',
    'cohere': 'Cohere',
    'stripe': 'Stripe',
    'github': 'GitHub',
    'discord': 'Discord',
    'twilio': 'Twilio',
    'sendgrid': 'SendGrid'
  };
  return displayNames[provider] || provider;
};

// Memoized Custom Tooltip component
const CustomTooltip = React.memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 p-3 rounded-lg shadow-lg">
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
  const providerColor = useMemo(() => providerColors[provider.provider] || 'hsl(var(--muted-foreground))', [provider.provider]);
  const formattedCount = useMemo(() => provider.count.toLocaleString(), [provider.count]);
  const formattedPercentage = useMemo(() => provider.percentage.toFixed(1), [provider.percentage]);
  const formattedName = useMemo(() => getProviderDisplayName(provider.provider), [provider.provider]);

  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-2.5 h-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: providerColor }}
        />
        <div>
          <div className="font-medium capitalize text-sm text-foreground">
            {formattedName}
          </div>
          <div className="text-xs text-muted-foreground">
            {formattedCount} leaks
          </div>
        </div>
      </div>
      <div className="text-xs font-medium text-muted-foreground">
        {formattedPercentage}%
      </div>
    </div>
  );
});

ProviderListItem.displayName = 'ProviderListItem';

const ProviderChartComponent = React.memo(({ data, totalLeaks }: ProviderChartProps) => {
  // Defensive: fallback for missing/null/empty data
  const safeData = Array.isArray(data) ? data : [];
  const safeTotalLeaks = typeof totalLeaks === 'number' && isFinite(totalLeaks) ? totalLeaks : 0;

  if (!safeData.length) {
    return (
      <div className="w-full text-center text-muted-foreground my-8" role="status">
        No provider data available.
      </div>
    );
  }

  const chartData = useMemo(() => safeData.map(item => ({
    ...item,
    fill: providerColors[item.provider] || 'hsl(var(--muted-foreground))'
  })), [safeData]);

  const topProviders = useMemo(() => safeData.slice(0, 5), [safeData]);

  // Calculate y-axis domain with professional tick marks
  const yAxisDomain = useMemo(() => {
    if (safeData.length === 0) return [0, 1];
    const minBar = Math.min(...safeData.map(item => item.count));
    const maxBar = Math.max(...safeData.map(item => item.count));
    // Crop aggressively: min just below the smallest bar, max just above the largest
    const minValue = Math.max(0, minBar - Math.ceil((maxBar - minBar) * 0.8));
    const maxValue = Math.ceil(maxBar * 1.05);
    return [minValue, maxValue];
  }, [safeData]);

  // Custom tick formatter for professional number display
  const formatYAxisTick = useCallback((value: number) => {
    if (value === 0) return '0';
    if (value < 1000) return value.toString();
    return value.toLocaleString();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-4" aria-live="polite">
      {/* Chart */}
      <div className="lg:col-span-2 w-full">
        <Card className="border-border/50 glass-card w-full shadow-sm" aria-label="Leaks by Provider">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-lg font-semibold tracking-tight">Leaks by Provider</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80 mt-1">
              Distribution of leaked API keys across different providers
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="provider" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(value) => getProviderDisplayName(value)}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    domain={yAxisDomain}
                    tickFormatter={formatYAxisTick}
                    tickCount={6}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider List */}
      <div className="w-full">
        <Card className="border-border/50 glass-card h-fit w-full shadow-sm" aria-label="Top Providers">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-lg font-semibold tracking-tight">Top Providers</CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80 mt-1">
              Most frequently leaked API providers
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-5 space-y-2">
            {topProviders.length ? (
              topProviders.map((provider, index) => (
                <ProviderListItem key={provider.provider} provider={provider} index={index} />
              ))
            ) : (
              <div className="text-muted-foreground text-center">No providers to display.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

ProviderChartComponent.displayName = 'ProviderChartComponent';

export const ProviderChart = ProviderChartComponent;