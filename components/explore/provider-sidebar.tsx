"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Provider } from "@/types";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Activity } from "lucide-react";
import * as Icons from "./provider-icons";

interface ProviderSidebarProps {
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
  providers: readonly { value: string; label: string }[];
  className?: string;
}

const ProviderIconMap: Record<string, React.ComponentType<any>> = {
  anthropic: Icons.Anthropic,
  cerebras: Icons.Cerebras,
  google: Icons.GoogleIcon,
  groq: Icons.Groq,
  openai: Icons.OpenAI,
  openrouter: Icons.OpenRouter,
  xai: Icons.XIcon,
};

export const ProviderSidebar = React.memo(
  ({
    selectedProvider,
    onProviderChange,
    providers,
    className,
  }: ProviderSidebarProps) => {
    return (
      <Card
        className={cn(
          "border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col h-fit",
          className
        )}
      >
        <div className="p-1.5 sm:p-4 border-b border-border/40 bg-card/60 backdrop-blur-xl">
          <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 sm:gap-2 text-amber-500">
            <ShieldCheck className="w-3 h-3 sm:w-4 h-4" />
            Currently Monitoring
          </h3>
        </div>

        <div className="p-1 sm:p-2 flex flex-col gap-0.5 sm:gap-1 max-h-[70vh] lg:max-h-none overflow-y-auto custom-scrollbar">
          {providers.map((provider) => {
            const isSelected = selectedProvider === provider.value;
            const Icon = ProviderIconMap[provider.value];

            return (
              <button
                key={provider.value}
                onClick={() => onProviderChange(provider.value as Provider)}
                className={cn(
                  "group relative flex items-center gap-2 sm:gap-3 px-2 py-1 sm:py-2.5 rounded-md transition-all duration-200 text-left",
                  isSelected
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                )}
              >
                <div className={cn(
                  "w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                  isSelected ? "text-amber-500" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {Icon ? <Icon className="w-full h-full" /> : <div className="w-2 h-2 rounded-md bg-current opacity-40" />}
                </div>
                <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest truncate">
                  {provider.label}
                </span>
              </button>
            );
          })}
        </div>

      </Card>
    );
  }
);

ProviderSidebar.displayName = "ProviderSidebar";
