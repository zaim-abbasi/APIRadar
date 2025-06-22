"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { PROVIDERS } from '@/lib/constants';
import { Provider } from '@/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';

interface ProviderFilterProps {
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
}

const ProviderFilterComponent = ({ selectedProvider, onProviderChange }: ProviderFilterProps) => {
  const [open, setOpen] = useState(false);

  const selectedProviderData = PROVIDERS.find(p => p.value === selectedProvider);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px] bg-card/50 backdrop-blur-sm hover:bg-card/80"
        >
          <div className="flex items-center gap-2 max-w-[120px] truncate">
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span className="truncate block max-w-[120px] text-left" title={selectedProviderData?.label}>
                    {selectedProviderData?.label || 'Select provider...'}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {selectedProviderData?.label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {selectedProvider !== 'all' && (
              <Badge variant="secondary" className="ml-1">
                {selectedProvider}
              </Badge>
            )}
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </motion.div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-card/95 backdrop-blur-sm border-border/50">
        <Command>
          <CommandInput placeholder="Search providers..." className="h-9" />
          <CommandList>
            <CommandEmpty>No provider found.</CommandEmpty>
            <CommandGroup>
              <AnimatePresence>
                {PROVIDERS.map((provider, index) => (
                  <motion.div
                    key={provider.value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <CommandItem
                      value={provider.value}
                      onSelect={() => {
                        onProviderChange(provider.value as Provider);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <span className="truncate block max-w-[120px] text-left" title={provider.label}>
                                {provider.label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {provider.label}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {provider.value !== 'all' && (
                          <Badge variant="outline" className="text-xs">
                            {provider.value}
                          </Badge>
                        )}
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ 
                          scale: selectedProvider === provider.value ? 1 : 0,
                          opacity: selectedProvider === provider.value ? 1 : 0
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Check className="h-4 w-4 text-primary" />
                      </motion.div>
                    </CommandItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const ProviderFilter = React.memo(ProviderFilterComponent);