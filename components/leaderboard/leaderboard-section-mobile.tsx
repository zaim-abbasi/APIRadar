import React from "react";
import { StatsCards } from "@/components/leaderboard/stats-cards";
import { Github, Linkedin, Mail } from "lucide-react";
import { ActivityChart } from "@/components/leaderboard/activity-chart";
import { HallOfShame } from "@/components/leaderboard/hall-of-shame";

export const LeaderboardSectionMobile = React.memo(function LeaderboardSectionMobile({ statsData }: { statsData: any }) {

  return (
    <section className="relative min-h-screen flex flex-col items-center px-3 pt-3 pb-5 bg-background">
      {/* Header */}
      <div className="flex flex-col items-center mb-3 mt-1 z-10 w-full">
        <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight text-center mb-1.5 text-foreground tracking-tight z-10">
          Security Leaderboard
        </h1>
        <div className="w-10 sm:w-12 h-0.5 bg-gradient-to-r from-coral to-foreground mx-auto mb-0.5 rounded-full opacity-60" />
      </div>
      {/* Stats Cards */}
      <div className="w-full max-w-md mx-auto mb-3 z-10">
        <StatsCards data={statsData} />
      </div>
      <div className="w-full max-w-md mx-auto mb-5 z-10">
        <ActivityChart />
      </div>
      <div className="w-full max-w-md mx-auto mb-5 z-10">
        <HallOfShame />
      </div>
      {/* Social/Contact Icons (mobile only, above footer) */}
      <footer role="contentinfo" aria-labelledby="footer-label-mobile" className="w-full text-center mt-auto pt-4 pb-3 text-xs text-muted-foreground/80 z-10 tracking-wide">
        <div className="flex items-center justify-center gap-3">
          <span id="footer-label-mobile" className="font-semibold">API Radar</span>
          <a href="mailto:zaim.k.abbasi@gmail.com" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="Email" tabIndex={0}>
            <Mail className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="GitHub" tabIndex={0}>
            <Github className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="LinkedIn" tabIndex={0}>
            <Linkedin className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
        </div>
      </footer>
    </section>
  );
}); 