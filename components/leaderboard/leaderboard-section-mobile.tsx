import React, { useMemo } from "react";
import { StatsCards } from "@/components/leaderboard/stats-cards";
import dynamic from "next/dynamic";
import { Github, Linkedin, Mail } from "lucide-react";

// Optimize dynamic import with better loading state
const ProviderChart = dynamic(
  () => import("@/components/leaderboard/provider-chart").then(m => m.ProviderChart),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 w-full flex items-center justify-center text-muted-foreground animate-pulse">
        <div className="text-sm">Loading chart...</div>
      </div>
    )
  }
);

export const LeaderboardSectionMobile = React.memo(function LeaderboardSectionMobile({ statsData, chartData }: { statsData: any; chartData: any }) {
  // Memoize chart props to prevent unnecessary re-renders
  const chartProps = useMemo(() => ({
    topProviders: chartData?.topProviders || [],
    totalLeaks: chartData?.totalLeaks || 0
  }), [chartData?.topProviders, chartData?.totalLeaks]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-3 py-7 bg-background">
      {/* Header */}
      <div className="flex flex-col items-center mb-7 mt-2 z-10 w-full">
        <h1 className="text-4xl font-extrabold leading-tight text-center mb-3 text-primary tracking-tight z-10 drop-shadow-md">
          Security Leaderboard
        </h1>
        <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-foreground mx-auto mb-2 rounded-full opacity-60" />
      </div>
      {/* Stats Cards */}
      <div className="w-full max-w-md mx-auto mb-8 z-10">
        <StatsCards data={statsData} />
      </div>
      {/* Provider Chart */}
      <div className="w-full max-w-md mx-auto mb-10 z-10">
        <ProviderChart data={chartProps.topProviders} totalLeaks={chartProps.totalLeaks} />
      </div>
      {/* Social/Contact Icons (mobile only, above footer) */}
      <footer role="contentinfo" aria-labelledby="footer-label-mobile" className="w-full text-center mt-auto pt-7 pb-3 text-xs text-muted-foreground/80 z-10 tracking-wide">
        <div className="flex items-center justify-center gap-3">
          <span id="footer-label-mobile" className="font-semibold">API Radar</span>
          <a href="mailto:zaim.k.abbasi@gmail.com" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="Email" tabIndex={0}>
            <Mail className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="GitHub" tabIndex={0}>
            <Github className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="LinkedIn" tabIndex={0}>
            <Linkedin className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
        </div>
      </footer>
    </section>
  );
}); 