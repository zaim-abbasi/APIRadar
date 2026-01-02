"use client";

import React from 'react';
import { FileSearch, TrendingUp, GraduationCap, Github, Calendar, Key, ExternalLink, Lock, Linkedin, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const SectionCard = React.memo(({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  description: string;
}) => (
  <div className="p-3.5 rounded-lg border bg-card/50 backdrop-blur-sm border-border">
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-foreground mb-1">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  </div>
));

SectionCard.displayName = 'SectionCard';

const WhatYouCanDo = React.memo(() => {
  const items = [
    {
      icon: FileSearch,
      title: 'Explore real API key leaks',
      description: 'See a constantly updated list of leaked API keys from public GitHub code, with redacted values, repo links, and timestamps.'
    },
    {
      icon: TrendingUp,
      title: 'Understand leak patterns',
      description: 'Check which providers, file types, and languages are most commonly involved in leaks to inform your own security hygiene.'
    },
    {
      icon: GraduationCap,
      title: 'Use it as a training tool',
      description: 'Security and engineering teams can use the examples in API Radar to teach developers what not to commit.'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
        What You Can Do Here
      </h2>
      <div className="space-y-2 flex-1">
        {items.map((item, index) => (
          <SectionCard
            key={index}
            icon={item.icon}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>
    </div>
  );
});

WhatYouCanDo.displayName = 'WhatYouCanDo';

const WhatYouSee = React.memo(() => {
  const items = [
    { icon: Key, text: 'Provider (e.g., OpenAI, Google, Anthropic, etc.)' },
    { icon: Lock, text: 'Redacted key (first/last characters only)' },
    { icon: Github, text: 'Repository and file path' },
    { icon: Calendar, text: 'Detected at time' },
    { icon: ExternalLink, text: 'Link to the exact commit or file in GitHub' }
  ];

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
        What You See For Each Leak
      </h2>
      <div className="space-y-2.5 mb-4 flex-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-3 p-2.5 rounded-lg bg-card/50 border border-border/50">
            <item.icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/90 leading-relaxed">
              {item.text}
            </p>
          </div>
        ))}
      </div>
      <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
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
      <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
        Why This Tool Exists
      </h2>
      <div className="space-y-2.5 flex-1">
        {points.map((point, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-destructive mt-2" />
            <p className="text-sm text-foreground/90 leading-relaxed">
              {point}
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
      <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
        What's Next for API Radar?
      </h2>
      <div className="flex-1 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          API Radar is currently a public explorer for leaked API keys. Future plans include more providers, historical trends, and optional private monitoring for your own organizations.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="mailto:zaim.k.abbasi@gmail.com?subject=Feature%20Suggestion%20for%20API%20Radar"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-sm font-medium text-foreground transition-colors duration-200 flex-1"
          >
            <Lightbulb className="h-4 w-4 text-primary" />
            <span>Suggest a feature</span>
          </a>
          <a
            href="https://github.com/zaim-abbasi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-card/50 hover:bg-card/70 border border-border/50 text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label="Visit on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="https://www.linkedin.com/in/zaim-abbasi/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-card/50 hover:bg-card/70 border border-border/50 text-muted-foreground hover:text-foreground transition-colors duration-200"
            aria-label="Connect on LinkedIn"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
});

WhatsNext.displayName = 'WhatsNext';

export const ContentSections = React.memo(() => {
  return (
    <section className="pt-4 sm:pt-6 pb-8 sm:pb-10 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <WhatYouCanDo />
            <WhatYouSee />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <WhyThisExists />
            <WhatsNext />
          </div>
        </div>
      </div>
    </section>
  );
});

ContentSections.displayName = 'ContentSections';

