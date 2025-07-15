'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pageview } from '@/lib/ga';

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    pageview(pathname);
  }, [pathname]);

  return null;
} 