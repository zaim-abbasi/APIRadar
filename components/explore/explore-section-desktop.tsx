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
const LeakTable = React.lazy(() =>
  import("@/components/explore/leak-table").then((m) => ({
    default: m.LeakTable,
  })),
);
const OverviewDashboard = React.lazy(() =>
  import("@/components/explore/overview-dashboard").then((m) => ({
    default: m.OverviewDashboard,
  })),
);
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PROVIDERS, INTEL_PROVIDERS } from "@/lib/constants";
import { Provider } from "@/types";
import { LayoutGrid, Activity, ListFilter } from "lucide-react";

const ExploreHeader = React.memo(() => null);

// Memoize ActionCard to prevent unnecessary re-renders
const ActionCard = React.memo(({ onSignIn }: { onSignIn: () => void }) => (
  <div
    className="group animate-fade-in-up opacity-0"
    style={{ animationDelay: `150ms` }}
  >
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
          {/* Left section: Content */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {/* Icon and Title */}
            <div className="flex flex-row items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-coral/10">
                <LogIn className="h-5 w-5 sm:h-6 sm:w-6 text-coral flex-shrink-0" />
              </div>
              <span className="text-base sm:text-lg font-semibold text-foreground">
                Sign in to unlock full access
              </span>
            </div>

            {/* Description */}
            <div className="text-sm text-muted-foreground/90 leading-relaxed">
              Sign in to view all API key leaks and access advanced features.
            </div>

            {/* Benefit text */}
            <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
              <Check
                className="h-3.5 w-3.5 text-coral"
                aria-hidden="true"
                focusable="false"
              />
              <span>No payment needed. Explore for free.</span>
            </div>
          </div>

          {/* Right section: Button - vertically centered */}
          <div className="flex-shrink-0 sm:self-center">
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-primary-foreground bg-coral border-none rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out sm:hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2.5 whitespace-nowrap w-full sm:w-auto active:scale-[0.98]"
              aria-label="Sign in with Google"
            >
              <Chrome
                className="h-4 w-4"
                aria-hidden="true"
                focusable="false"
              />
              <span>Continue with Google</span>
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
}: {
  leaks: any[];
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
    }
  }, [selectedProvider]);

  const handleMainTabChange = (value: string) => {
    const newTab = value as "overview" | "feed";
    setActiveTab(newTab);
    if (newTab === "overview") {
      onProviderChange("all");
    } else if (selectedProvider === "all") {
      // If switching to feed from all, default to openai
      onProviderChange("openai");
    }
  };

  return (
    <div className="container mx-auto px-4 pt-9 pb-6">
      {/* Structured Data for Explore Page */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Explore Leaked Keys",
            description:
              "Real-time feed of API key leaks discovered in public repositories. Track security incidents as they happen with detailed insights.",
            url: "https://apiradar.live/explore",
            mainEntity: {
              "@type": "CollectionPage",
              name: "API Key Leak Database",
              description:
                "Comprehensive database of API key leaks from public repositories",
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
        className="w-full space-y-6"
      >
        {/* Header Card Wrapper */}
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-md p-4 sm:p-5 mb-6 animate-fade-in-up shadow-sm transition-shadow duration-200">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 w-full">
            {/* Left: Tabs Section */}
            <div className="flex-grow">
              <div className="relative flex items-center p-1 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg gap-1.5 h-11 w-full">
                <TabsList className="bg-transparent border-none p-0 h-full w-full flex items-center gap-1.5 transition-all shadow-none">
                  <TabsTrigger
                    value="overview"
                    className="relative flex items-center justify-center py-2 px-3 text-sm transition-all duration-200 z-10 flex-auto sm:flex-1 min-w-[fit-content] rounded-md active:scale-95 touch-manipulation text-muted-foreground font-medium sm:hover:text-foreground sm:hover:bg-muted/50 data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 data-[state=active]:rounded-md data-[state=active]:hover:bg-background data-[state=active]:hover:text-foreground h-full"
                  >
                    <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Global Overview
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="feed"
                    className="relative flex items-center justify-center py-2 px-3 text-sm transition-all duration-200 z-10 flex-auto sm:flex-1 min-w-[fit-content] rounded-md active:scale-95 touch-manipulation text-muted-foreground font-medium sm:hover:text-foreground sm:hover:bg-muted/50 data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 data-[state=active]:rounded-md data-[state=active]:hover:bg-background data-[state=active]:hover:text-foreground h-full"
                  >
                    <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      API Leaks
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Right: Stats & Action Section */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-center gap-6 lg:gap-8">
              <div className="flex flex-row items-center gap-6 text-sm text-muted-foreground whitespace-nowrap">
                <LiveStats latestLeakAt={latestGlobalLeakAt || leaks[0]?.leakDetectedAt} />
              </div>
              <FeatureRequestForm />
            </div>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6 m-0 focus-visible:ring-0">
          <div className="animate-fade-in-up">
            <Suspense
              fallback={
                <div className="min-h-[200px] flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">
                    Loading overview…
                  </span>
                </div>
              }
            >
              <OverviewDashboard
                leaks={leaks}
                isLoading={isLoading}
                onSignIn={
                  isUnauthenticated
                    ? () =>
                        signIn("google", {
                          callbackUrl: window.location.href,
                          redirect: true,
                        })
                    : undefined
                }
                plan={plan}
                isOffline={!!error}
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
            <div className="w-full lg:hidden bg-card/40 border border-border/50 rounded-md p-4">
              <ProviderSidebar
                selectedProvider={selectedProvider}
                onProviderChange={onProviderChange}
                providers={INTEL_PROVIDERS}
              />
            </div>

            {/* Right: Results */}
            <div className="flex-1 min-w-0 w-full">
              <Suspense
                fallback={
                  <div className="min-h-[200px] flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">
                      Loading results…
                    </span>
                  </div>
                }
              >
                <div className="relative">
                  <LeakTable
                    leaks={leaks}
                    isLoading={isLoading}
                    selectedProvider={selectedProvider}
                    plan={plan}
                    onSignIn={
                      isUnauthenticated
                        ? () =>
                            signIn("google", {
                              callbackUrl: window.location.href,
                              redirect: true,
                            })
                        : undefined
                    }
                    isOffline={!!error}
                  />
                </div>
              </Suspense>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

ExploreSectionDesktop.displayName = "ExploreSectionDesktop";

export default ExploreSectionDesktop;
