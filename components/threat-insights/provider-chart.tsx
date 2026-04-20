"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderStats } from '@/types';

interface ProviderChartProps {
  data: ProviderStats[];
}

const providerColors: Record<string, string> = {
  'anthropic': '#d97706',
  'cerebras': '#7c3aed',
  'google': '#3b82f6',
  'groq': '#ea580c',
  'openai': '#10b981',
  'openrouter': '#d946ef',
  'xai': '#64748b',
};

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

export const ProviderChart = React.memo(({ data }: ProviderChartProps) => {
  const safeData = useMemo(() => 
    [...data].sort((a, b) => b.count - a.count).slice(0, 8), 
    [data]
  );

  if (!safeData.length) {
    return (
      <Card className="border-border/40 bg-card/20 backdrop-blur-sm h-[320px] flex items-center justify-center">
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
        <div className="h-[130px] sm:h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={safeData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              barSize={16}
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
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(val) => getProviderDisplayName(val).substring(0, 10)}
                width={65}
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
                animationDuration={1500}
                animationEasing="ease-out"
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