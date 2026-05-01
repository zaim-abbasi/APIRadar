"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Provider } from "@/types";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
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
  discord_token: Icons.DiscordIcon,
  discord_webhook: Icons.DiscordIcon,
  google: Icons.GoogleIcon,
  groq: Icons.Groq,
  openai: Icons.OpenAI,
  openrouter: Icons.OpenRouter,
  slack_token: Icons.SlackIcon,
  slack_webhook: Icons.SlackIcon,
  telegram_bot: Icons.TelegramIcon,
  xai: Icons.XIcon,
};

export const ProviderSidebar = React.memo(
  ({
    selectedProvider,
    onProviderChange,
    providers,
    className,
  }: ProviderSidebarProps) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
      if (typeof window !== "undefined") {
        try {
          const stored = sessionStorage.getItem("radar_sidebar_expanded");
          if (stored) return JSON.parse(stored);
        } catch (e) {}
      }
      return { discord: false, slack: false };
    });

    const handleGroupClick = (id: string, groupItems: any[]) => {
      setExpanded(prev => {
        const next = { ...prev, [id]: !prev[id] };
        if (typeof window !== "undefined") {
          sessionStorage.setItem("radar_sidebar_expanded", JSON.stringify(next));
        }
        return next;
      });

      const hasChildSelected = groupItems.some(child => child.value === selectedProvider);
      if (!hasChildSelected && groupItems.length > 0) {
        onProviderChange(groupItems[0].value);
      }
    };

    const groupedItems = useMemo(() => {
      const groups: any[] = [];
      const discordGroup: any = { id: 'discord', label: 'Discord', isGroup: true, items: [] };
      const slackGroup: any = { id: 'slack', label: 'Slack', isGroup: true, items: [] };

      providers.forEach(p => {
        if (p.value.startsWith('discord_')) discordGroup.items.push(p);
        else if (p.value.startsWith('slack_')) slackGroup.items.push(p);
        else groups.push(p);
      });

      if (discordGroup.items.length) groups.push(discordGroup);
      if (slackGroup.items.length) groups.push(slackGroup);

      return groups.sort((a, b) => a.label.localeCompare(b.label));
    }, [providers]);

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
          {groupedItems.map((item) => {
            if (item.isGroup) {
              const Icon = ProviderIconMap[`${item.id}_token`] || ProviderIconMap[`${item.id}_webhook`];
              const isGroupExpanded = expanded[item.id];
              return (
                <div key={item.id} className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleGroupClick(item.id, item.items)}
                    className="group relative flex items-center gap-2 sm:gap-3 px-2 py-1 sm:py-2.5 rounded-md transition-all duration-200 text-left text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                  >
                    <div className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0 transition-colors duration-200 text-muted-foreground group-hover:text-foreground">
                      {Icon ? <Icon className="w-full h-full" /> : <div className="w-2 h-2 rounded-md bg-current opacity-40" />}
                    </div>
                    <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest truncate flex-1">
                      {item.label}
                    </span>
                  </button>
                  {isGroupExpanded && (
                    <div className="flex flex-col gap-0.5 ml-4 sm:ml-5 pl-2 border-l border-border/40">
                      {item.items.map((child: any) => {
                        const isSelected = selectedProvider === child.value;
                        const childLabel = child.label.replace(/Discord |Slack /i, '');
                        return (
                          <button
                            key={child.value}
                            onClick={() => onProviderChange(child.value as Provider)}
                            className={cn(
                              "group relative flex items-center gap-2 sm:gap-3 px-2 py-1 sm:py-2 rounded-md transition-all duration-200 text-left",
                              isSelected
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                            )}
                          >
                            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest truncate">
                              {childLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isSelected = selectedProvider === item.value;
            const Icon = ProviderIconMap[item.value];

            return (
              <button
                key={item.value}
                onClick={() => onProviderChange(item.value as Provider)}
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
                  {item.label}
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
