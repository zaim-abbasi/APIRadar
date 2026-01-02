"use client";

import React from 'react';
import { Layers } from 'lucide-react';
import { CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue } from '@/components/ui/custom-select';
import { Badge } from '@/components/ui/badge';
import { PROVIDERS } from '@/lib/constants';
import { Provider } from '@/types';

interface ProviderFilterProps {
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
}

export const ProviderFilter = React.memo(({ selectedProvider, onProviderChange }: ProviderFilterProps) => {
  const selectedProviderLabel = PROVIDERS.find(p => p.value === selectedProvider)?.label || 'All Providers';

  const handleValueChange = (value: string) => {
    onProviderChange(value as Provider);
  };

  return (
    <CustomSelect value={selectedProvider} onValueChange={handleValueChange}>
      <CustomSelectTrigger className="w-full bg-card/60 backdrop-blur-sm border-border/60 shadow-sm">
        <div className="flex items-center gap-2 w-full">
          <Layers className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
          <CustomSelectValue className="flex-1 text-center">
            <span className="truncate block">{selectedProviderLabel}</span>
          </CustomSelectValue>
        </div>
      </CustomSelectTrigger>
      <CustomSelectContent>
        {PROVIDERS.map((provider) => (
          <CustomSelectItem key={provider.value} value={provider.value}>
            <div className="flex items-center gap-2">
              <span className="truncate block text-left">{provider.label}</span>
              {provider.value !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {provider.value}
                </Badge>
              )}
            </div>
          </CustomSelectItem>
        ))}
      </CustomSelectContent>
    </CustomSelect>
  );
});

ProviderFilter.displayName = 'ProviderFilter';