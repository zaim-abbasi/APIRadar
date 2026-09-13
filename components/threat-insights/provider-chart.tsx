"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProviderStats } from '@/types';
import { PROVIDER_LABELS } from '@/lib/constants';

interface ProviderChartProps {
  data: ProviderStats[];
  isLoading?: boolean;
}

const getProviderDisplayName = (provider: string): string => {
  if (!provider) return '';
  const normalized = provider.toLowerCase();

  if (normalized.startsWith('discord')) return 'Discord';
  if (normalized.startsWith('slack')) return 'Slack';
  if (normalized.startsWith('telegram')) return 'Telegram';
  if (normalized === 'xai') return 'xAI';
  if (normalized === 'openrouter') return 'OpenRouter';
  if (normalized === 'openai') return 'OpenAI';
  if (normalized === 'anthropic') return 'Anthropic';
  if (normalized === 'google') return 'Google';
  if (normalized === 'groq') return 'Groq';
  if (normalized === 'cerebras') return 'Cerebras';
  if (normalized === 'cohere') return 'Cohere';
  if (normalized === 'stripe') return 'Stripe';
  if (normalized === 'github') return 'GitHub';

  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

const CustomTooltip = React.memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border/50 p-2.5 rounded-lg shadow-xl ring-1 ring-black/5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
          {getProviderDisplayName(data.provider)}
        </p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-sm font-mono font-bold text-foreground">
            {data.count.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Exposures</p>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          {data.percentage.toFixed(1)}% of total volume
        </p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

export const ProviderChart = React.memo(({ data, isLoading }: ProviderChartProps) => {
  const safeData = useMemo(() => 
    [...data].sort((a, b) => b.count - a.count).slice(0, 8), 
    [data]
  );

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden h-full">
        <CardHeader className="pb-1 sm:pb-3 px-2.5 sm:px-5 pt-2 sm:pt-5">
          <Skeleton className="h-3 w-32 bg-amber-500/10" />
        </CardHeader>
        <CardContent className="pt-0 px-2.5 sm:px-5 pb-2.5 sm:pb-5">
          <div className="h-[180px] sm:h-[220px] w-full flex flex-col gap-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-12 bg-muted/20" />
                <Skeleton className="h-4 flex-1 bg-amber-500/5 rounded-sm" style={{ width: `${90 - i * 15}%`, maxWidth: '90%' }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!safeData.length) {
    return (
      <Card className="border-border/40 bg-card/20 backdrop-blur-sm h-[250px] flex items-center justify-center">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">No provider data</p>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden h-full">
      <CardHeader className="pb-1 sm:pb-3 px-2.5 sm:px-5 pt-2 sm:pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-amber-500 leading-none">
              Exposure Volume by Provider
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-2.5 sm:px-5 pb-2.5 sm:pb-5">
        <div className="h-[180px] sm:h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={safeData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
              barSize={14}
            >
              <CartesianGrid 
                horizontal={false} 
                vertical={true} 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.15} 
              />
              <XAxis 
                type="number"
                hide
              />
              <YAxis
                dataKey="provider"
                type="category"
                interval={0}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(val) => getProviderDisplayName(val)}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
              />
              <Bar 
                dataKey="count" 
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              >
                {safeData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill="#f59e0b" // Amber-500
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

ProviderChart.displayName = 'ProviderChart';