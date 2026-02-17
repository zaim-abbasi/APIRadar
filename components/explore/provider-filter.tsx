"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/constants";
import { Provider } from "@/types";

interface ProviderFilterProps {
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
  className?: string;
}

export const ProviderFilter = React.memo(
  ({
    selectedProvider,
    onProviderChange,
    className,
  }: ProviderFilterProps) => {
    return (
      <div
        className={cn(
          "relative grid grid-cols-3 sm:flex sm:flex-wrap items-center w-full p-1 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg gap-1 sm:gap-0",
          className
        )}
      >
        {PROVIDERS.map((provider) => {
          const isSelected = selectedProvider === provider.value;
          return (
            <button
              key={provider.value}
              onClick={() => onProviderChange(provider.value as Provider)}
              className={cn(
                "relative flex items-center justify-center py-1.5 px-2 text-sm font-medium transition-all duration-200 z-10 sm:flex-1 min-w-[fit-content] rounded-md sm:rounded-none first:sm:rounded-l-md last:sm:rounded-r-md active:scale-95",
                isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeProvider"
                  className="absolute inset-0 bg-background rounded-md shadow-sm border border-border/50"
                  initial={false}
                  transition={{ duration: 0 }}
                />
              )}
              <span className="relative z-10 truncate px-1">
                {provider.label === "All Providers" ? "All" : provider.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }
);

ProviderFilter.displayName = "ProviderFilter";