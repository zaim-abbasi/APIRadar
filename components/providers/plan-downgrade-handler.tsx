"use client";

import { usePlanDowngrade } from '@/hooks/use-plan-downgrade';

export function PlanDowngradeHandler({ children }: { children: React.ReactNode }) {
  usePlanDowngrade();
  
  return <>{children}</>;
} 