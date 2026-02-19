"use client";

import React from 'react';
import { FileSearch, TrendingUp, GraduationCap, Github, Calendar, Key, ExternalLink, Lock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const WhatYouCanDo = React.memo(() => {
  const items = [
    {
      icon: FileSearch,
      title: 'Explore real API key leaks',
      description: 'Redacted previews and source links for deep investigation.',
      iconColor: 'text-coral'
    },
    {
      icon: TrendingUp,
      title: 'Understand leak patterns',
      description: 'Filter and sort to spot where leaks happen most.',
      iconColor: 'text-coral'
    },
    {
      icon: GraduationCap,
      title: 'Enterprise Security Awareness',
      description: 'Real-world leak patterns for secure DevOps training.',
      iconColor: 'text-coral'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 id="about" className="text-lg sm:text-2xl lg:text-3xl font-semibold text-foreground mb-1.5 sm:mb-3 scroll-mt-20">
        What You Can Do Here
      </h2>
      <div className="space-y-3 sm:space-y-3 flex-1">
        {items.map((item, index) => (
          <div key={index} className="p-3 sm:p-2.5 rounded-md border bg-card/50 backdrop-blur-sm border-border transition-all duration-200 ease-out hover:border-border/80 hover:-translate-y-0.5">
            <div className="flex items-start gap-3 sm:gap-2.5">
              <item.icon className={cn("h-5 w-5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5", item.iconColor)} />
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-base font-semibold text-foreground mb-1 sm:mb-1">
                  {item.title}
                </h3>
                <p className="hidden sm:block text-sm sm:text-sm text-muted-foreground leading-relaxed truncate">
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

WhatYouCanDo.displayName = 'WhatYouCanDo';

const WhatYouSee = React.memo(() => {
  const items = [
    { icon: Key, text: 'Provider', iconColor: 'text-muted-foreground/70' },
    { icon: Lock, text: 'Redacted Key', iconColor: 'text-muted-foreground/70' },
    { icon: Github, text: 'Repository', iconColor: 'text-muted-foreground/70' },
    { icon: Calendar, text: 'Timestamp', iconColor: 'text-muted-foreground/70' },
    { icon: ExternalLink, text: 'Source Link', iconColor: 'text-muted-foreground/70' }
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-foreground mb-1.5 sm:mb-3">
        What You See For Each Leak
      </h2>
      <div className="space-y-2.5 sm:space-y-2.5 mb-4 sm:mb-4 flex-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-3 sm:gap-3 p-2.5 sm:p-2.5 rounded-md bg-card/50 backdrop-blur-sm border border-border/50 transition-all duration-200 ease-out hover:border-border/80 hover:-translate-y-0.5">
            <item.icon className={cn("h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0", item.iconColor)} />
            <p className="text-sm sm:text-sm text-foreground/90 font-medium leading-none">
              {item.text}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
});

WhatYouSee.displayName = 'WhatYouSee';

const WhyThisExists = React.memo(() => {
  const points = [
    { text: 'Secrets leak to public repos daily.' },
    { text: 'Attackers exploit instantly. Visibility enables defense.' },
    { title: 'No Code Retention:', text: 'Public metadata only. We never clone or store your code.' }
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-foreground mb-1.5 sm:mb-4">
        The APIRadar Mission
      </h2>
      <div className="space-y-3 sm:space-y-2.5 flex-1">
        {points.map((point, index) => (
          <div key={index} className="flex items-start gap-3 sm:gap-3">
            <div className="flex-shrink-0 w-1.5 h-1.5 sm:w-1.5 sm:h-1.5 rounded-full bg-coral mt-2 sm:mt-2" />
            <p className="text-sm sm:text-sm text-foreground/90 leading-relaxed">
              {point.title && <span className="font-semibold text-foreground mr-1">{point.title}</span>}
              {point.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});

WhyThisExists.displayName = 'WhyThisExists';

const WhatsNext = React.memo(() => {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-foreground mb-1.5 sm:mb-4">
        What's Next for APIRadar?
      </h2>
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {['More providers', 'Trend views', 'Private monitoring'].map((tag) => (
              <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=apiradar.live@gmail.com&su=${encodeURIComponent("APIRadar: Platform Inquiry")}&body=${encodeURIComponent("Hi Zaim,\n\nI'm interested in APIRadar for [Company/Use Case].\nI'd like to know more about [Features/Pricing/Enterprise].\n\nBest,\n[Name]")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md bg-coral text-primary-foreground border border-coral/80 hover:brightness-90 hover:border-coral/70 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98] w-full sm:w-auto"
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Contact the Developer</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

WhatsNext.displayName = 'WhatsNext';

export const ContentSections = React.memo(() => {
  return (
    <section className="pt-2 sm:pt-3 pb-6 sm:pb-10">
      <div className="container mx-auto px-4">
        <div className="space-y-3 sm:space-y-6 lg:space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 lg:gap-12">
            <WhatYouCanDo />
            <WhatYouSee />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-12">
            <WhyThisExists />
            <WhatsNext />
          </div>
        </div>
      </div>
    </section>
  );
});

ContentSections.displayName = 'ContentSections';

