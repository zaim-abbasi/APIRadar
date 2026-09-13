"use client";

import React, { Suspense, useState, useEffect } from "react";
import {
  LogIn,
  Rocket,
  Sparkles,
  Info,
  ChevronDown,
  Github,
  Linkedin,
  Check,
  Chrome,
  Twitter,
  Heart,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { ProviderSidebar } from "@/components/explore/provider-sidebar";
import {
  CustomSelect,
  CustomSelectContent,
  CustomSelectItem,
  CustomSelectTrigger,
  CustomSelectValue,
} from "@/components/ui/custom-select";
import { Badge } from "@/components/ui/badge";
import { LiveStats, FeatureRequestForm } from "@/components/explore/live-stats";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { LeakFeed } from "@/components/explore/leak-feed";
import { OverviewDashboard } from "@/components/explore/overview-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PROVIDERS, INTEL_PROVIDERS } from "@/lib/constants";
import { Provider } from "@/types";
import { LayoutGrid, Activity, ListFilter } from "lucide-react";

const ExploreHeader = React.memo(() => null);

// Memoize ActionCard to prevent unnecessary re-renders
const ActionCard = React.memo(({ onSignIn }: { onSignIn: () => void }) => (
  <div
    className="group animate-fade-in-up"
    style={{ animationDelay: `150ms` }}
  >
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
          {/* Left section: Content */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {/* Icon and Title */}
            <div className="flex flex-row items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <LogIn className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 flex-shrink-0" />
              </div>
              <span className="text-base sm:text-lg font-semibold text-foreground">
                Sign in with Google to unlock all exposures for free
              </span>
            </div>

            {/* Description */}
            <div className="text-sm text-muted-foreground/90 leading-relaxed">
              Unlock the full feed and access every active credential exposure discovered by our scanner.
            </div>

            {/* Benefit text */}
            <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
              <Check
                className="h-3.5 w-3.5 text-amber-500"
                aria-hidden="true"
                focusable="false"
              />
              <span>100% Free. Unlock access instantly.</span>
            </div>
          </div>

          {/* Right section: Button - vertically centered */}
          <div className="flex-shrink-0 sm:self-center">
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-primary-foreground bg-amber-500 border-none rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out sm:hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2.5 whitespace-nowrap w-full sm:w-auto"
              aria-label="Sign in with Google"
            >
              <Chrome
                className="h-4 w-4"
                aria-hidden="true"
                focusable="false"
              />
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
));
ActionCard.displayName = "ActionCard";

const ExploreSectionDesktop = React.memo(function ExploreSectionDesktop({
  leaks,
  isLoading,
  selectedProvider,
  plan,
  session,
  onProviderChange,
  total,
  error,
  loadingRef,
  hasMore,
  latestGlobalLeakAt,
  globalLeaks,
}: {
  leaks: any[];
  globalLeaks: any[];
  isLoading: boolean;
  selectedProvider: Provider;
  plan: "free" | "pro";
  session: any;
  onProviderChange: (provider: Provider) => void;
  total: number;
  error: string | null;
  loadingRef: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
  latestGlobalLeakAt?: string | Date;
}) {
  const isUnauthenticated = !session || !session.user;
  const [activeTab, setActiveTab] = useState<"overview" | "feed">(
    selectedProvider === "all" ? "overview" : "feed",
  );

  // Sync activeTab with selectedProvider if it changes from outside
  useEffect(() => {
    if (selectedProvider === "all") {
      setActiveTab("overview");
    } else {
      setActiveTab("feed");
      sessionStorage.setItem("radar_last_provider", selectedProvider);
    }
  }, [selectedProvider]);


  const handleMainTabChange = (value: string) => {
    const tab = value as "overview" | "feed";
    setActiveTab(tab);
    sessionStorage.setItem("radar_last_tab", tab);
    
    if (tab === "feed" && selectedProvider === "all") {
      let lastProvider = sessionStorage.getItem("radar_last_provider");
      if (!lastProvider || lastProvider === "all") {
        lastProvider = INTEL_PROVIDERS[0].value;
      }
      onProviderChange(lastProvider as Provider);
    } else if (tab === "overview" && selectedProvider !== "all") {
      onProviderChange("all");
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 pt-2 sm:pt-9 pb-6">
      {/* Structured Data for Explore Page */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Explore Credential Exposures",
            description:
              "Real-time feed of credential exposures discovered in public repositories. Track security incidents as they happen with detailed insights.",
            url: "https://apiradar.bot.nu/explore",
            mainEntity: {
              "@type": "CollectionPage",
              name: "Credential Exposure Database",
              description:
                "Comprehensive database of credential exposures from public repositories",
              provider: {
                "@type": "Organization",
                name: "APIRadar",
              },
            },
          }),
        }}
      />
      {/* Header */}
      <ExploreHeader />
      <Tabs
        value={activeTab}
        onValueChange={handleMainTabChange}
        className="w-full space-y-3 sm:space-y-6"
      >
        {/* Header Card Wrapper */}
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-lg p-2 sm:p-5 mb-2 sm:mb-6 animate-fade-in-up">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4 w-full">
            {/* Left: Tabs Section */}
            <div className="flex-grow w-full lg:w-auto">
              <div className="relative flex items-center p-1 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg gap-1.5 h-9 lg:h-11 w-full">
                <TabsList className="bg-transparent border-none p-0 h-full w-full flex items-center gap-1.5 transition-all">
                  <TabsTrigger
                    value="overview"
                    className="relative flex items-center justify-center py-2 px-3 text-sm transition-all duration-200 z-10 flex-auto sm:flex-1 min-w-[fit-content] rounded-md touch-manipulation text-muted-foreground font-medium sm:hover:text-foreground sm:hover:bg-muted/50 data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-border/50 data-[state=active]:rounded-md data-[state=active]:hover:bg-background data-[state=active]:hover:text-foreground h-full"
                  >
                    <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Global</span> Overview
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="feed"
                    className="relative flex items-center justify-center py-2 px-3 text-sm transition-all duration-200 z-10 flex-auto sm:flex-1 min-w-[fit-content] rounded-md touch-manipulation text-muted-foreground font-medium sm:hover:text-foreground sm:hover:bg-muted/50 data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-background data-[state=active]:border data-[state=active]:border-border/50 data-[state=active]:rounded-md data-[state=active]:hover:bg-background data-[state=active]:hover:text-foreground h-full"
                  >
                    <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Credential</span> Exposures
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Right: Stats & Action Section */}
            <div className="flex-shrink-0 flex items-center gap-2 sm:gap-6 lg:gap-8 w-full sm:w-auto">
              <div className="hidden sm:flex flex-row items-center justify-center sm:justify-start gap-4 sm:gap-6 text-sm text-muted-foreground whitespace-nowrap w-full sm:w-auto">
                <LiveStats latestLeakAt={latestGlobalLeakAt || leaks[0]?.leakDetectedAt} />
              </div>
              <div className="flex-1 sm:flex-initial">
                <FeatureRequestForm />
              </div>
            </div>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6 m-0 focus-visible:ring-0">
          <div className="animate-fade-in-up">
              <Suspense
                fallback={
                  <div className="min-h-[200px]" />
                }
              >
              <OverviewDashboard
                leaks={globalLeaks.length > 0 ? globalLeaks : leaks}
                isLoading={isLoading && globalLeaks.length === 0}
                onSignIn={
                  isUnauthenticated
                    ? () => {
                        sessionStorage.setItem("radar_restore_flag", "true");
                        signIn("google", {
                          callbackUrl: window.location.href,
                          redirect: true,
                        });
                      }
                    : undefined
                }
                plan={plan}
                isOffline={!!error}
                onProviderChange={onProviderChange}
              />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="feed" className="space-y-6 m-0 focus-visible:ring-0">
          <div className="flex flex-col lg:flex-row gap-6 animate-fade-in-up items-start">
            {/* Left Sidebar: Providers */}
            <aside className="w-full lg:w-64 flex-shrink-0 sticky top-24 hidden lg:block">
              <ProviderSidebar
                selectedProvider={selectedProvider}
                onProviderChange={onProviderChange}
                providers={INTEL_PROVIDERS}
              />
            </aside>

            {/* Mobile View: Inline Sidebar (or old filter style) */}
            <div className="w-full lg:hidden bg-card/40 border border-border/50 rounded-lg p-3">
              <ProviderSidebar
                selectedProvider={selectedProvider}
                onProviderChange={onProviderChange}
                providers={INTEL_PROVIDERS}
              />
            </div>

            {/* Right: Results */}
            <div className="flex-1 min-w-0 w-full">
              <div className="relative">
                <LeakFeed
                  leaks={leaks}
                  total={total}
                  isLoading={isLoading}
                  selectedProvider={selectedProvider}
                  plan={plan}
                  onSignIn={
                    isUnauthenticated
                      ? () => {
                          sessionStorage.setItem("radar_restore_flag", "true");
                          signIn("google", {
                            callbackUrl: window.location.href,
                            redirect: true,
                          });
                        }
                      : undefined
                  }
                  isOffline={!!error}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

ExploreSectionDesktop.displayName = "ExploreSectionDesktop";

export default ExploreSectionDesktop;
