'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { pageview } from '@/lib/ga';

// Memoize Analytics component and debounce pageview calls
export default function Analytics() {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    // Only track if pathname actually changed
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      // Debounce pageview to avoid rapid-fire tracking
      const timeoutId = setTimeout(() => {
        pageview(pathname);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [pathname]);

  return null;
} 