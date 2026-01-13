"use client";

import React from 'react';
import { FileSearch, TrendingUp, GraduationCap, Github, Calendar, Key, ExternalLink, Lock, Linkedin, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const WhatYouCanDo = React.memo(() => {
  const items = [
    {
      icon: FileSearch,
      title: 'Explore real API key leaks',
      description: 'See a constantly updated list of leaked API keys from public GitHub code, with redacted values, repo links, and timestamps.',
      iconColor: 'text-coral'
    },
    {
      icon: TrendingUp,
      title: 'Understand leak patterns',
      description: 'Check which providers, file types, and languages are most commonly involved in leaks to inform your own security hygiene.',
      iconColor: 'text-coral'
    },
    {
      icon: GraduationCap,
      title: 'Use it as a training tool',
      description: 'Security and engineering teams can use the examples in API Radar to teach developers what not to commit.',
      iconColor: 'text-coral'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-foreground mb-1.5 sm:mb-3">
        What You Can Do Here
      </h2>
      <div className="space-y-2 sm:space-y-5 flex-1">
        {items.map((item, index) => (
          <div key={index} className="p-2 sm:p-3.5 rounded-md border bg-card/50 backdrop-blur-sm border-border">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <item.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5", item.iconColor)} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-foreground mb-0.5 sm:mb-1">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <span className="lg:hidden">{item.description.split(',')[0]}.</span>
                  <span className="hidden lg:inline">{item.description}</span>
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
    { icon: Key, text: 'Provider (e.g., AI Key, etc.)', iconColor: 'text-muted-foreground/70' },
    { icon: Lock, text: 'Redacted key (first/last characters only)', iconColor: 'text-muted-foreground/70' },
    { icon: Github, text: 'Repository and file path', iconColor: 'text-muted-foreground/70' },
    { icon: Calendar, text: 'Detected at time', iconColor: 'text-muted-foreground/70' },
    { icon: ExternalLink, text: 'Link to the exact commit or file in GitHub', iconColor: 'text-muted-foreground/70' }
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-foreground mb-1.5 sm:mb-3">
        What You See For Each Leak
      </h2>
      <div className="space-y-1.5 sm:space-y-2.5 mb-2 sm:mb-4 flex-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 sm:gap-3 p-1.5 sm:p-2.5 rounded-md bg-card/50 backdrop-blur-sm border border-border/50">
            <item.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5", item.iconColor)} />
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {item.text}
            </p>
          </div>
        ))}
      </div>
      <div className="p-2 sm:p-2.5 rounded-md bg-card/50 backdrop-blur-sm border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          All keys are shown for educational and security-awareness purposes only. You should never attempt to misuse exposed credentials.
        </p>
      </div>
    </div>
  );
});

WhatYouSee.displayName = 'WhatYouSee';

const WhyThisExists = React.memo(() => {
  const points = [
    'Developers accidentally commit .env files and API keys to public repos every day.',
    'Attackers scan these repos to steal keys.',
    'API Radar surfaces real-world examples so teams can see the scale of the problem and take secrets management seriously.'
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-foreground mb-1.5 sm:mb-4">
        Why This Tool Exists
      </h2>
      <div className="space-y-1.5 sm:space-y-2.5 flex-1">
        {points.map((point, index) => (
          <div key={index} className="flex items-start gap-1.5 sm:gap-3">
            <div className="flex-shrink-0 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-coral mt-1.5 sm:mt-2" />
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              <span className="lg:hidden">{point.split('.')[0]}.</span>
              <span className="hidden lg:inline">{point}</span>
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
        What's Next for API Radar?
      </h2>
      <div className="flex-1 space-y-2 sm:space-y-4">
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <span className="lg:hidden">Public explorer for leaked API keys. More features coming soon.</span>
          <span className="hidden lg:inline">API Radar is currently a public explorer for leaked API keys. Future plans include more providers, historical trends, and optional private monitoring for your own organizations.</span>
        </p>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=zaim.k.abbasi@gmail.com&su=Contact%20API%20Radar%20Developer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md bg-coral text-white border border-coral/80 hover:brightness-90 hover:border-coral/70 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Contact the Developer</span>
          </a>
          <a
            href="https://github.com/zaim-abbasi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md bg-card/50 backdrop-blur-sm border border-border text-foreground hover:brightness-90 hover:border-coral/70 transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98]"
            aria-label="Visit on GitHub"
          >
            <Github className="h-4 w-4 sm:h-5 sm:w-5" />
          </a>
          <a
            href="https://www.linkedin.com/in/zaim-abbasi/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md bg-card/50 backdrop-blur-sm border border-border text-foreground hover:brightness-90 hover:border-coral/70 transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98]"
            aria-label="Connect on LinkedIn"
          >
            <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
          </a>
        </div>
      </div>
    </div>
  );
});

WhatsNext.displayName = 'WhatsNext';

export const ContentSections = React.memo(() => {
  return (
    <section className="pt-2 sm:pt-3 pb-6 sm:pb-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6 lg:space-y-10">
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

