"use client";

import React, { useState, useMemo, Suspense, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, SortAsc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderFilter } from '@/components/explore/provider-filter';
const LeakTable = React.lazy(() => import('@/components/explore/leak-table').then(m => ({ default: m.LeakTable })));
import { mockLeaks } from '@/lib/mock-data';
import { TIME_RANGES, SORT_OPTIONS } from '@/lib/constants';
import { Provider } from '@/types';

export default function ExplorePage() {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredLeaks = useMemo(() => {
    let filtered = [...mockLeaks];

    // Filter by provider
    if (selectedProvider !== 'all') {
      filtered = filtered.filter(leak => leak.provider === selectedProvider);
    }

    // Filter by time range
    const now = new Date();
    const timeFilters: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    if (timeFilters[timeRange]) {
      const cutoff = new Date(now.getTime() - timeFilters[timeRange]);
      filtered = filtered.filter(leak => new Date(leak.timestamp) >= cutoff);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
      case 'oldest':
        filtered = filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case 'provider':
        filtered = filtered.sort((a, b) => a.provider.localeCompare(b.provider));
        break;
    }

    return filtered;
  }, [selectedProvider, timeRange, sortBy]);

  const handleProviderChange = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Explore Leaked Keys
        </h1>
        <p className="text-lg text-muted-foreground">
          Real-time feed of API key leaks discovered in public repositories.
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
        className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-6 mb-6"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Provider Filter */}
          <ProviderFilter
            selectedProvider={selectedProvider}
            onProviderChange={handleProviderChange}
          />

          {/* Time Range */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm">
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex items-center justify-between mt-4 pt-4 border-t border-border/50"
        >
          <div className="text-sm text-muted-foreground">
            {isClient && (
              <>
                {filteredLeaks.length} leak{filteredLeaks.length !== 1 ? 's' : ''} found
                {selectedProvider !== 'all' && ` for ${selectedProvider}`}
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 1000);
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </motion.div>
      </motion.div>

      {/* Results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
      >
        <Suspense fallback={<div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="text-muted-foreground text-sm">Loading results…</span></div>}>
          <LeakTable 
            leaks={filteredLeaks} 
            isLoading={isLoading}
            selectedProvider={selectedProvider}
          />
        </Suspense>
      </motion.div>
    </div>
  );
}