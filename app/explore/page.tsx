"use client";

import React, { useState, useMemo, Suspense, useCallback, useEffect, useRef } from 'react';
import { Filter, SortAsc, RefreshCw, Loader2, LogIn, Rocket } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderFilter } from '@/components/explore/provider-filter';
const LeakTable = React.lazy(() => import('@/components/explore/leak-table').then(m => ({ default: m.LeakTable })));
import { TIME_RANGES, SORT_OPTIONS, PROVIDERS, PROVIDER_API_MAP } from '@/lib/constants';
import { Provider } from '@/types';
import { LeakedKey } from '@/types';
import { fetchLeaks } from '@/lib/api';
import { useSession, signIn } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ExploreClient } from "@/components/explore/explore-client";
import UpgradeToProCardWithTrialButton from '@/components/explore/UpgradeToProCardWithTrialButton';


// Production constants
const PAGE_SIZE = 10;
const INFINITE_SCROLL_MARGIN = '0px 0px 600px 0px';

// Types for better type safety
interface LeaksResponse {
  leaks: LeakedKey[];
  total: number;
  hasMore: boolean;
}

interface FilterState {
  selectedProvider: Provider;
  timeRange: string;
  sortBy: string;
}

interface LoadingState {
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

interface PaginationState {
  page: number;
  hasMore: boolean;
  total: number;
  refreshIndex: number;
}

// Production-grade error handling
class ExplorePageError extends Error {
  constructor(message: string, public code: string, public context?: any) {
    super(message);
    this.name = 'ExplorePageError';
  }
}

// Memoized Header component
const ExploreHeader = React.memo(() => (
  <div className="mb-6 text-center">
    <h1 className="text-3xl md:text-4xl font-semibold mb-2 bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent tracking-tight">
      Explore Leaked API Keys
    </h1>
    <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-foreground mx-auto mb-3 rounded-full opacity-60" />
    <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
      Real-time database of API key leaks from public repositories. View detailed leak information and repository context to stay informed about the latest exposures.
    </p>
  </div>
));

ExploreHeader.displayName = 'ExploreHeader';

// Helper to get provider label from value
function getProviderLabel(value: string): string {
  const found = PROVIDERS.find((p) => p.value === value);
  return found ? found.label : value;
}

// Memoized Results Count component with improved error handling
const ResultsCount = React.memo(({ 
  filteredLeaks, 
  selectedProvider, 
  isClient, 
  isLoading, 
  onRefresh, 
  total,
  error
}: { 
  filteredLeaks: LeakedKey[]; 
  selectedProvider: Provider; 
  isClient: boolean; 
  isLoading: boolean; 
  onRefresh: () => void; 
  total: number;
  error: string | null;
}) => (
  <div className="flex flex-row sm:flex-row items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 animate-fade-in-up opacity-0 animate-delay-10">
    <div className="flex flex-1 items-center gap-2">
      <div className="flex-1 text-sm text-muted-foreground truncate">
        {isClient && !error && (
          <>
            <span className="block sm:hidden">{total} leaks found</span>
            <span className="hidden sm:inline">
              {total} leak{total !== 1 ? 's' : ''} found
              {selectedProvider !== 'all' && ` for ${getProviderLabel(selectedProvider)}`}
            </span>
          </>
        )}
        {error && (
          <span className="text-destructive text-sm">
            Error loading data. Please try refreshing.
          </span>
        )}
      </div>
    </div>
    <div className="flex-shrink-0">
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="h-8 pl-2 pr-2 py-1 text-xs font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center gap-1 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  </div>
));

ResultsCount.displayName = 'ResultsCount';

// Memoized Filters component with improved error handling
const FiltersSection = React.memo(({ 
  selectedProvider, 
  onProviderChange, 
  timeRange, 
  setTimeRange, 
  sortBy, 
  setSortBy, 
  filteredLeaks, 
  isClient, 
  isLoading, 
  onRefresh, 
  total,
  session,
  plan,
  error
}: { 
  selectedProvider: Provider; 
  onProviderChange: (provider: Provider) => void; 
  timeRange: string; 
  setTimeRange: (range: string) => void; 
  sortBy: string; 
  setSortBy: (sort: string) => void; 
  filteredLeaks: LeakedKey[]; 
  isClient: boolean; 
  isLoading: boolean; 
  onRefresh: () => void; 
  total: number;
  session: any;
  plan: string;
  error: string | null;
}) => {
  // Time filter gating logic
  const isPro = plan === 'pro';
  const isBasic = plan === 'basic';
  const isLoggedIn = !!session?.user;
  const requestedTrial = session?.user?.requestedTrial;
  const [open, setOpen] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [message, setMessage] = useState('');

  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-4 mb-6 animate-fade-in-up opacity-0 animate-delay-10">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Provider Filter */}
        <ProviderFilter
          selectedProvider={selectedProvider}
          onProviderChange={onProviderChange}
        />

        {/* Time Range */}
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-75 hover:bg-card/70 focus:ring-0 focus:ring-offset-0">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TooltipProvider>
              {TIME_RANGES.map((range) => {
                const is30d = range.value === '30d';
                const isDisabled = !isPro && is30d;
                let badge = null;
                if (isDisabled && is30d) {
                  if (!isLoggedIn) {
                    badge = <Badge variant="secondary" className="ml-2 text-xs">Sign in</Badge>;
                  } else if (isBasic) {
                    badge = <Badge variant="secondary" className="ml-2 text-xs">Pro</Badge>;
                  }
                }
                return isDisabled ? (
                  <Tooltip key={range.value} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <SelectItem value={range.value} disabled className="opacity-50 cursor-not-allowed flex items-center">
                          {range.label}
                          {badge}
                        </SelectItem>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-background text-foreground rounded px-3 py-2 text-xs shadow-lg">
                      {(!isLoggedIn) ? 'Sign in to access this range' : 'Upgrade to Pro to access this range'}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                );
              })}
            </TooltipProvider>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-75 hover:bg-card/70 focus:ring-0 focus:ring-offset-0">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <ResultsCount 
        filteredLeaks={filteredLeaks}
        selectedProvider={selectedProvider}
        isClient={isClient}
        isLoading={isLoading}
        onRefresh={onRefresh}
        total={total}
        error={error}
      />
    </div>
  );
});

FiltersSection.displayName = 'FiltersSection';

// Memoized Results component with improved error handling
const ResultsSection = React.memo(({ 
  filteredLeaks, 
  isLoading, 
  selectedProvider, 
  session, 
  plan,
  error
}: { 
  filteredLeaks: LeakedKey[]; 
  isLoading: boolean; 
  selectedProvider: Provider; 
  session: any;
  plan: 'free' | 'basic' | 'pro';
  error: string | null;
}) => {
  let visibleLeaks: (LeakedKey | null)[] = [];
  let tileLimit = 2;
  const isUnauthenticated = !session || !session.user;
  
  if (plan === 'pro') {
    visibleLeaks = filteredLeaks;
    tileLimit = filteredLeaks.length;
  } else if (plan === 'basic') {
    // Always show up to 6 leaks
    visibleLeaks = filteredLeaks.slice(0, 6);
    tileLimit = 6;
  } else {
    // For unauthorized users, show exactly 4 tiles (fill with nulls if needed)
    visibleLeaks = filteredLeaks.slice(0, 4);
    while (visibleLeaks.length < 4) {
      visibleLeaks.push(null);
    }
    tileLimit = 4;
  }

  // Show error state
  if (error) {
    return (
      <div className="animate-fade-in-up opacity-0 animate-delay-10">
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-destructive text-lg font-semibold mb-2">
              Failed to load data
            </div>
            <div className="text-muted-foreground text-sm">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading skeleton if loading and no leaks yet
  if (isLoading && filteredLeaks.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted/40 rounded-lg h-20 mb-4" />
        ))}
      </div>
    );
  }

  // Show empty state only if not loading and no leaks
  if (!isLoading && filteredLeaks.length === 0) {
    return (
      <div className="animate-fade-in-up opacity-0 animate-delay-10">
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">
              No leaks found
            </div>
            <div className="text-muted-foreground text-sm">
              No leaked keys match your current filters.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare grid items: leaks only
  const leakCards = visibleLeaks.map((leak, idx) => (
    <LeakTable
      key={leak ? leak.id : `skeleton-${idx}`}
      leaks={[leak]}
      isLoading={isLoading && !leak}
      selectedProvider={selectedProvider}
      plan={plan}
    />
  ));

  // Action card (out of grid, but styled like a grid item)
  let actionCard: React.ReactNode = null;
  if (isUnauthenticated) {
    actionCard = (
      <div className="mt-4 w-full sm:w-[calc(50%-0.5rem)] mx-auto">
        <ActionCard
          icon={<LogIn className="h-8 w-8 text-primary" />}
          title="Sign in to unlock full access"
          subtitle="Sign in to view all API key leaks, copy full keys, and access advanced features."
          socialProof="No payment needed. Explore for free."
          button={
            <button
              onClick={() => signIn('google', { callbackUrl: window.location.href })}
              className="text-sm font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center gap-1 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full px-5 py-2"
            >
              Sign in with Google
            </button>
          }
        />
      </div>
    );
  } else if (plan === 'basic') {
    actionCard = (
      <div className="mt-4 w-full sm:w-[calc(50%-0.5rem)] mx-auto">
        <ActionCard
          icon={<Rocket className="h-8 w-8 text-yellow-500" />}
          title="Try Pro — Free Trial"
          subtitle="Unlock unlimited access to all leaks and advanced analytics. No payment required."
          socialProof="Limited time offer. Cancel anytime."
          button={
            <UpgradeToProCardWithTrialButton session={session} onlyButton buttonClassName="text-sm font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center gap-1 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full px-5 py-2" />
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up opacity-0 animate-delay-10">
      <Suspense fallback={
        <div className="min-h-[200px] flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading results…</span>
        </div>
      }>
        {/* Grid layout for leak cards only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {leakCards}
        </div>
        {/* Action card below the grid, styled to match grid items */}
        {actionCard}
      </Suspense>
    </div>
  );
});

ResultsSection.displayName = 'ResultsSection';

// Memoized Loading Indicator component for infinite scroll
const LoadingIndicator = React.memo(() => (
  <div className="h-1" />
));

LoadingIndicator.displayName = 'LoadingIndicator';

// Shared ActionCard component for consistent sizing
type ActionCardProps = {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  button: React.ReactNode;
  icon: React.ReactNode;
  socialProof?: React.ReactNode;
};

const ActionCard = ({ title, subtitle, button, icon, socialProof }: ActionCardProps) => (
  <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-[100px] flex flex-col justify-center">
    <CardContent className="p-3 flex items-center gap-3 min-h-0 h-full">
      <div className="flex flex-col items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0 text-left">
        <span className="font-semibold text-base text-foreground truncate">{title}</span>
        <span className="text-muted-foreground text-xs leading-tight whitespace-normal">{subtitle}</span>
        {socialProof && (
          <span className="block text-xs text-green-700 dark:text-green-400 mt-1 font-medium">{socialProof}</span>
        )}
      </div>
      <div className="flex-shrink-0 flex flex-col items-end">
        {button}
      </div>
    </CardContent>
  </Card>
);

// In-memory cache for the first page of leaks (default filters)
const firstPageCache: { leaks: LeakedKey[]; timestamp: number } = { leaks: [], timestamp: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

export default function ExplorePage(props: any) {
  // Pass all props/state to ExploreClient
  return <ExploreClient {...props} />;
}