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
  const isLoggedIn = !!session?.user;
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
                return (
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
    // Free users (unauthenticated) get exactly 6 tiles (fill with nulls if needed)
    visibleLeaks = filteredLeaks.slice(0, 6);
    while (visibleLeaks.length < 6) {
      visibleLeaks.push(null);
    }
    tileLimit = 6;
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
              className="text-sm font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center justify-center gap-2 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2 whitespace-nowrap w-full sm:w-auto"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
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
          {isUnauthenticated && filteredLeaks.length > 6 && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-10">
                {/* Gradient fade that keeps last row visible - starts transparent at top */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.98) 20%, hsl(var(--background) / 0.90) 40%, hsl(var(--background) / 0.70) 60%, hsl(var(--background) / 0.40) 75%, transparent 100%)' }} />
                {/* Subtle blur overlay - lighter at top to keep last row visible */}
                <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'linear-gradient(to top, hsl(var(--background) / 0.90) 0%, hsl(var(--background) / 0.75) 30%, hsl(var(--background) / 0.50) 55%, hsl(var(--background) / 0.25) 75%, transparent 100%)' }} />
              </div>
              {/* Sign in hint - outside pointer-events-none container */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
                <button
                  onClick={() => signIn('google', { callbackUrl: window.location.href })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary border border-border rounded-md shadow-sm hover:bg-secondary/80 hover:text-foreground transition-all duration-200 focus:outline-none"
                  aria-label="Sign in to view all leaks"
                >
                  <span>Sign in to View all</span>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
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
              <div className="text-xs text-green-700 dark:text-green-400 font-medium">
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