"use client";

import React from "react";
import {
  FileSearch,
  TrendingUp,
  GraduationCap,
  Cpu,
  Vault,
  FolderGit2,
  Clock,
  Network,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const WhatYouCanDo = React.memo(() => {
  const items = [
    {
      icon: FileSearch,
      title: "Real-Time Leak Telemetry",
      description: "Instantly detect exposed OpenAI, Anthropic, Google & Cloud keys with zero-latency streaming detection.",
      iconColor: "text-amber-500",
    },
    {
      icon: TrendingUp,
      title: "Vulnerability & Trend Analytics",
      description: "Track systemic leak patterns, high-risk provider spikes, and repository exposure heatmaps.",
      iconColor: "text-amber-500",
    },
    {
      icon: GraduationCap,
      title: "Defensive Risk Guardrails",
      description: "Equip security engineering teams with real-world exposure benchmarks to prevent secret spillage in production.",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2
        id="about"
        className="text-base sm:text-2xl lg:text-3xl font-semibold text-foreground mb-3 sm:mb-4 scroll-mt-20 leading-tight font-heading"
      >
        Platform Capabilities
      </h2>
      <div className="space-y-2.5 flex-1">
        {items.map((item, index) => (
          <div
            key={index}
            className="p-3 sm:px-4 sm:py-3 rounded-lg border bg-card/50 backdrop-blur-sm border-border transition-all duration-200 ease-out sm:hover:border-amber-500/30 sm:hover:bg-card/80 group"
          >
            <div className="flex items-start gap-3.5">
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 mt-1 transition-transform sm:group-hover:scale-110",
                  item.iconColor,
                )}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

WhatYouCanDo.displayName = "WhatYouCanDo";

const WhatYouSee = React.memo(() => {
  const items = [
    { icon: Cpu, text: "AI / Cloud Service Provider" },
    { icon: Vault, text: "Redacted Key Fingerprint" },
    { icon: FolderGit2, text: "Target Repository Metadata" },
    { icon: Clock, text: "Detection Timestamp (ISO)" },
    { icon: Network, text: "Direct Commit Verification Link" },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-foreground mb-3 sm:mb-4 leading-tight font-heading">
        Forensic Intelligence Points
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 flex-1">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50 transition-all duration-200 sm:hover:border-amber-500/40 group"
          >
            <item.icon className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <p className="text-sm text-foreground/90 font-bold leading-none tracking-tight">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

WhatYouSee.displayName = "WhatYouSee";

const WhyThisExists = React.memo(() => {
  const points = [
    { text: "Thousands of API keys are accidentally committed to public repositories every single hour." },
    { text: "Exposed keys lead to unauthorized compute abuse, data exfiltration, and massive cloud bills." },
    {
      title: "Zero Code Retention Guarantee:",
      text: "APIRadar operates purely on public metadata. We never clone, download, or store your private codebase.",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-foreground mb-3 sm:mb-4 leading-tight font-heading">
        Security Architecture
      </h2>
      <div className="space-y-4 flex-1">
        <div className="space-y-3">
          {points.map((point, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
              <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                {point.title && (
                  <span className="font-bold text-amber-500 block mb-0.5">
                    {point.title}
                  </span>
                )}
                {point.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

WhyThisExists.displayName = "WhyThisExists";

const WhatsNext = React.memo(() => {
  const items = [
    {
      label: "Custom Secret Signatures",
      status: "PLANNED",
      dotColor: "bg-amber-500/80",
      active: true,
    },
    {
      label: "Enterprise Organization Auditing",
      status: "COMING SOON",
      dotColor: "bg-emerald-500/80",
      active: true,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-foreground mb-3 sm:mb-4 leading-tight font-heading">
        Enterprise Vision
      </h2>
      <div className="flex-1 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 p-3 rounded-lg bg-secondary/30 border border-border/50 transition-all duration-300"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  {item.active && (
                    <span className="sr-only">Active</span>
                  )}
                  <span
                    className={cn(
                      "text-[9px] font-black tracking-widest",
                      item.active
                        ? "text-amber-500"
                        : "text-muted-foreground/40",
                    )}
                  >
                    [{item.status}]
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="https://mail.google.com/mail/?view=cm&fs=1&to=zaim.k.abbasi@gmail.com&su=API%20Radar%20Enterprise%20Inquiry"
            target="_blank"
            className="flex items-center justify-center gap-2 h-11 sm:h-12 px-4 rounded-md bg-amber-500 text-primary-foreground border border-amber-500/80 sm:hover:brightness-90 transition-all font-bold text-sm"
          >
            <Shield className="h-4 w-4" />
            <span>Partner with Us or Enterprise Inquiry</span>
          </Link>
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <Users className="h-3 w-3" />
            <span>Built by security researchers for modern dev teams.</span>
          </div>
        </div>
      </div>
    </div>
  );
});

WhatsNext.displayName = "WhatsNext";

export const ContentSections = React.memo(() => {
  return (
    <section className="pt-4 sm:pt-10 pb-10 sm:pb-16">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="space-y-8 sm:space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-14">
            <WhatYouCanDo />
            <WhatYouSee />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-14">
            <WhyThisExists />
            <WhatsNext />
          </div>
        </div>
      </div>
    </section>
  );
});

ContentSections.displayName = "ContentSections";
