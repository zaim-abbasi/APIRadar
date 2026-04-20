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
      title: "Analyze Credential Exposure Events",
      description: "Redacted previews and source links for deep investigation.",
      iconColor: "text-amber-500",
    },
    {
      icon: TrendingUp,
      title: "Identify Vulnerability Vectors",
      description: "Filter and sort to spot where leaks happen most.",
      iconColor: "text-amber-500",
    },
    {
      icon: GraduationCap,
      title: "Enterprise Security Awareness",
      description:
        "Train teams with real-world metadata to build defensive guardrails without exposing original source code.",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2
        id="about"
        className="text-base sm:text-2xl lg:text-3xl font-semibold text-foreground mb-3 sm:mb-4 scroll-mt-20 leading-tight"
      >
        Platform Capabilities
      </h2>
      <div className="space-y-2.5 flex-1">
        {items.map((item, index) => (
          <div
            key={index}
            className="p-3 sm:px-4 sm:py-2.5 rounded-lg border bg-card/50 backdrop-blur-sm border-border transition-all duration-200 ease-out sm:hover:border-border/80 sm:hover:bg-card/80 group"
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
    { icon: Cpu, text: "Provider" },
    { icon: Vault, text: "Redacted Key" },
    { icon: FolderGit2, text: "Repository" },
    { icon: Clock, text: "Timestamp" },
    { icon: Network, text: "Repository Reference" },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-foreground mb-3 sm:mb-4 leading-tight">
        Forensic Data Points
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
    { text: "Credential exposure occurs in public repos daily." },
    { text: "Exposure poses immediate risk. Visibility enables defense." },
    {
      title: "No Code Retention:",
      text: "Public metadata only. We never clone or store your code.",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-foreground mb-3 sm:mb-4 leading-tight">
        The Security Framework
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
      label: "More Providers",
      status: "PLANNED",
      dotColor: "bg-amber-500/80",
      active: true,
    },
    {
      label: "Private Monitoring",
      status: "COMING SOON",
      dotColor: "bg-emerald-500/80",
      active: true,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-base sm:text-2xl lg:text-3xl font-semibold text-foreground mb-3 sm:mb-4 leading-tight">
        Strategic Roadmap
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
                        ? "text-foreground/90"
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
            href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@apiradar.live"
            target="_blank"
            className="flex items-center justify-center gap-2 h-11 sm:h-12 px-4 rounded-md bg-amber-500 text-primary-foreground border border-amber-500/80 sm:hover:brightness-90 transition-all font-bold text-sm"
          >
            <Shield className="h-4 w-4" />
            <span>Partner with Us or Enterprise Inquiry</span>
          </Link>
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <Users className="h-3 w-3" />
            <span>Built for researchers, by researchers.</span>
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
