"use client";

import React from 'react';
import { Check, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PROVIDERS } from '@/lib/constants';
import { Provider } from '@/types';

interface ProviderFilterProps {
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
}

export const ProviderFilter = React.memo(({ selectedProvider, onProviderChange }: ProviderFilterProps) => {
  return (
    <Select value={selectedProvider} onValueChange={onProviderChange}>
      <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 min-w-[150px] bg-card/60 backdrop-blur-sm transition-all duration-200 hover:bg-card/80 hover:border-border focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 shadow-sm">
        <Filter className="h-4 w-4 mr-2 text-muted-foreground/70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="w-[--radix-select-trigger-width] min-w-[150px]">
        {PROVIDERS.map((provider) => (
          <SelectItem key={provider.value} value={provider.value}>
            <div className="flex items-center gap-2">
              <span className="truncate block text-left">{provider.label}</span>
              {provider.value !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {provider.value}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

ProviderFilter.displayName = 'ProviderFilter';