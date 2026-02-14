"use client";

import React, { useState, useMemo, Suspense, useCallback, useEffect, useRef } from 'react';
import { ArrowDown, Calendar, ArrowUpDown, Chrome, RefreshCw, Loader2, LogIn, Rocket, Info, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue } from '@/components/ui/custom-select';
import { ProviderFilter } from '@/components/explore/provider-filter';
const LeakTable = React.lazy(() => import('@/components/explore/leak-table').then(m => ({ default: m.LeakTable })));
import { TIME_RANGES, SORT_OPTIONS, PROVIDERS } from '@/lib/constants';
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
}) => {
  const [showInstructions, setShowInstructions] = React.useState(true);
  
  return (
    <div className="mt-2 pt-2 border-t border-border/50 animate-fade-in-up opacity-0 animate-delay-10">
      <div className="mb-2 px-3 py-2.5 bg-coral/10 border border-coral/20 rounded-md">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center gap-2 text-sm text-foreground"
        >
          <Info className="h-4 w-4 text-coral flex-shrink-0" />
          <span className="font-medium flex-1 text-left">How to identify provider</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 flex-shrink-0 ${showInstructions ? 'rotate-180' : ''}`} />
        </button>
        {showInstructions && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            To identify the specific provider and available models, click the <span className="text-coral font-medium">repository name</span> and open the <span className="text-coral font-medium">Key path</span> to view how the key is placed. The code context will reveal the provider name and model configurations.
          </p>
        )}
      </div>
      <div className="flex flex-row items-center gap-2 flex-wrap">
        <div className="inline-flex items-center px-3 py-1 rounded-md bg-muted/40 border border-border/80 text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
          {isClient && !error && (
            <>
              <span className="block sm:hidden"><span className="font-bold">{total}</span> leaks found</span>
              <span className="hidden sm:inline">
                <span className="font-bold">{total}</span> leak{total !== 1 ? 's' : ''} found
                {selectedProvider !== 'all' && ` for ${getProviderLabel(selectedProvider)}`}
              </span>
            </>
          )}
          {error && (
            <span className="text-coral text-sm">
              Error loading data. Please try refreshing.
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 pl-2 pr-2 py-1 text-xs font-medium text-primary-foreground bg-coral border-none rounded-md flex items-center gap-1 transition-all duration-200 hover:bg-coral/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
});

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
  const isLoggedIn = !!session?.user;
  const [open, setOpen] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [message, setMessage] = useState('');

  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-md p-4 mb-6 animate-fade-in-up opacity-0 animate-delay-10">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Provider Filter */}
        <div className="flex-1 lg:w-[33.333%]">
          <ProviderFilter
            selectedProvider={selectedProvider}
            onProviderChange={onProviderChange}
          />
        </div>

        {/* Time Range */}
        <div className="flex-1 lg:w-[33.333%]">
          <CustomSelect value={timeRange} onValueChange={setTimeRange}>
            <CustomSelectTrigger className="w-full bg-card/50 backdrop-blur-sm border-border">
              <div className="flex items-center gap-2 w-full">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <CustomSelectValue className="flex-1 text-center">
                  {TIME_RANGES.find(r => r.value === timeRange)?.label || 'All'}
                </CustomSelectValue>
              </div>
            </CustomSelectTrigger>
            <CustomSelectContent>
              {TIME_RANGES.map((range) => {
                return (
                  <CustomSelectItem key={range.value} value={range.value}>
                    {range.label}
                  </CustomSelectItem>
                );
              })}
            </CustomSelectContent>
          </CustomSelect>
        </div>

        {/* Sort */}
        <div className="flex-1 lg:w-[33.333%]">
          <CustomSelect value={sortBy} onValueChange={setSortBy}>
            <CustomSelectTrigger className="w-full bg-card/50 backdrop-blur-sm border-border">
              <div className="flex items-center gap-2 w-full">
                <ArrowUpDown className="h-4 w-4 flex-shrink-0" />
                <CustomSelectValue className="flex-1 text-center">
                  {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Newest First'}
                </CustomSelectValue>
              </div>
            </CustomSelectTrigger>
            <CustomSelectContent>
              {SORT_OPTIONS.map((option) => (
                <CustomSelectItem key={option.value} value={option.value}>
                  {option.label}
                </CustomSelectItem>
              ))}
            </CustomSelectContent>
          </CustomSelect>
        </div>
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
  plan: 'free' | 'pro';
  error: string | null;
}) => {
  let visibleLeaks: (LeakedKey | null)[] = [];
  let tileLimit = 2;
  const isUnauthenticated = !session || !session.user;
  
  if (plan === 'pro') {
    // Pro users (authenticated) get all leaks
    visibleLeaks = filteredLeaks;
    tileLimit = filteredLeaks.length;
  } else {
    // Free users (unauthenticated) get exactly 4 tiles (fill with nulls if needed)
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
            <div className="text-coral text-lg font-semibold mb-2">
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
          <div key={i} className="animate-pulse bg-muted/40 rounded-md h-20 mb-4" />
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
              No leaks found?
            </div>
            <div className="text-muted-foreground text-sm">
              Probably the backend is offline or the system is under development for a while. Please come back later 🚧
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
              className="text-sm font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center justify-center gap-2 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2 whitespace-nowrap w-full sm:w-auto"
            >
              <Chrome className="h-4 w-4" aria-hidden="true" focusable="false" />
              <span>Continue with Google</span>
            </button>
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
        {/* Grid layout with fade-out effect for unauthenticated users */}
        <div className="relative">
          {/* Grid layout for leak cards only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {leakCards}
          </div>
          
          {/* Fade-out blur effect for unauthenticated users - suggests more content */}
          {isUnauthenticated && filteredLeaks.length > 4 && (
            <>

              {/* Sign in hint - outside pointer-events-none container */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
                <button
                  onClick={() => signIn('google', { callbackUrl: window.location.href })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary border border-border rounded-md shadow-sm hover:bg-secondary/80 hover:text-foreground transition-all duration-200 focus:outline-none"
                  aria-label="Sign in to view all leaks"
                >
                  <span>Sign in to View all</span>
                  <ArrowDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" focusable="false" />
                </button>
              </div>
            </>
          )}
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
  <div className="group animate-fade-in-up opacity-0" style={{ animationDelay: `150ms` }}>
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left section: Content */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Icon and Title */}
            <div className="flex flex-row items-center gap-2">
              <div className="flex-shrink-0">
                {icon}
              </div>
              <span className="text-base sm:text-lg font-semibold text-foreground">{title}</span>
            </div>
            
            {/* Description */}
            <div className="text-sm text-muted-foreground leading-relaxed">
              {subtitle}
            </div>
            
            {/* Benefit text */}
            {socialProof && (
              <div className="text-xs text-foreground/80 font-medium">
                {socialProof}
              </div>
            )}
          </div>
          
          {/* Right section: Button - vertically centered */}
          <div className="flex-shrink-0 sm:self-center">
            {button}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// In-memory cache for the first page of leaks (default filters)
const firstPageCache: { leaks: LeakedKey[]; timestamp: number } = { leaks: [], timestamp: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

export default function ExplorePage(props: any) {
  // Pass all props/state to ExploreClient
  return <ExploreClient {...props} />;
}