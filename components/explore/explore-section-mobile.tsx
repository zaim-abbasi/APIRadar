import React, { Suspense, memo } from "react";
import dynamic from "next/dynamic";
import {
  Heart,
  Github,
  Linkedin,
  Mail,
  LogIn,
  Rocket,
  Info,
  ChevronDown,
  Check,
  Chrome,
  Coffee,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { ProviderFilter } from "@/components/explore/provider-filter";
import {
  CustomSelect,
  CustomSelectContent,
  CustomSelectItem,
  CustomSelectTrigger,
  CustomSelectValue,
} from "@/components/ui/custom-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { LiveStats, FeatureRequestForm } from "@/components/explore/live-stats";
import { SponsorDialog } from "@/components/sponsor-dialog";

const LeakTable = dynamic(
  () => import("@/components/explore/leak-table").then((m) => m.LeakTable),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 w-full flex items-center justify-center text-muted-foreground/50">
        Loading…
      </div>
    ),
  },
);

// Memoized Action Card component
const ActionCard = memo(({ onSignIn }: { onSignIn: () => void }) => (
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
              className="text-sm font-medium text-primary-foreground bg-coral border-none rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-3 sm:py-2.5 whitespace-nowrap w-full sm:w-auto active:scale-[0.98] min-h-[44px] sm:min-h-0"
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

// Import the pro trial card button from the main Explore page

const ExploreSectionMobile = memo(function ExploreSectionMobile(props: any) {
  const {
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
  } = props;
  const [isSponsorOpen, setIsSponsorOpen] = React.useState(false);
  const isUnauthenticated = !session || !session.user;
  const isPro = plan === "pro";
  const isLoggedIn = !!session?.user;

  return (
    <section className="relative min-h-screen flex flex-col px-3 pt-3 pb-5 bg-background">
      {/* Header */}
      <div className="flex flex-col items-center mb-4 mt-1 z-10 w-full">
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-center mb-2 text-foreground tracking-tight z-10">
          Explore Leaked API Keys
        </h1>
        <div className="w-10 sm:w-12 h-0.5 bg-gradient-to-r from-coral to-foreground mx-auto mb-1 rounded-full opacity-60" />
      </div>
      {/* Filters */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-md p-2 sm:p-5 mb-3 w-full max-w-md mx-auto animate-fade-in-up opacity-0 animate-delay-10 shadow-sm transition-shadow duration-200">
        <div className="flex flex-col gap-3 sm:gap-4 w-full">
          <ProviderFilter
            selectedProvider={selectedProvider}
            onProviderChange={onProviderChange}
          />
        </div>
        {/* Results Count and Refresh */}
        <div className="mt-2 pt-2 border-t border-border/40">
          <div className="flex flex-row items-center justify-between gap-2 w-full">
            {/* Left side: Stats */}
            <div className="flex flex-row items-center gap-2 text-xs sm:text-sm text-muted-foreground/80 whitespace-nowrap font-medium overflow-x-auto custom-scrollbar pb-1">
              <LiveStats latestLeakAt={leaks[0]?.leakDetectedAt} />
            </div>

            {/* Right side: Links */}
            <FeatureRequestForm />
          </div>
        </div>
      </div>
      {/* Leak Table */}
      <div className="w-full max-w-md mx-auto mb-6 z-10">
        <Suspense
          fallback={
            <div
              className="h-32 w-full flex items-center justify-center text-muted-foreground/50"
              aria-busy="true"
              aria-live="polite"
            >
              Loading…
            </div>
          }
        >
          {/* Wrap in relative container for fade effect */}
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
            />
          </div>
        </Suspense>

        {/* Infinite scroll sentinel for pro users */}
        {plan === "pro" && hasMore && (
          <div ref={loadingRef} style={{ height: 1 }} />
        )}
      </div>
      {/* Social/Contact Icons (mobile only, above footer) */}
      <footer
        role="contentinfo"
        aria-labelledby="footer-label-mobile"
        className="w-full text-center mt-auto pt-4 pb-3 text-xs text-muted-foreground/80 z-10 tracking-wide"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setIsSponsorOpen(true)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Coffee className="h-3.5 w-3.5" />
            <span>Sponsor</span>
          </button>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span id="footer-label-mobile" className="font-semibold">
            APIRadar
          </span>
          <a
            href="mailto:zaim.k.abbasi@gmail.com"
            className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
            aria-label="Email"
            tabIndex={0}
          >
            <Mail className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
          <a
            href="https://github.com/zaim-abbasi"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
            aria-label="GitHub"
            tabIndex={0}
          >
            <Github className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
          <a
            href="https://www.linkedin.com/in/zaim-abbasi/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
            aria-label="LinkedIn"
            tabIndex={0}
          >
            <Linkedin className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
        </div>
      </footer>
      <SponsorDialog open={isSponsorOpen} onOpenChange={setIsSponsorOpen} />
    </section>
  );
});

export default ExploreSectionMobile;
