import { useSession } from 'next-auth/react';

/**
 * Simplified hook - just checks if user is authenticated
 * If authenticated: user has "Pro" access
 * If not authenticated: user has "Free" access
 */
export function usePlanCheck() {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;

  return {
    plan: isAuthenticated ? 'pro' : 'free',
    daysRemaining: 0,
    requestedTrial: false,
    isChecking: status === 'loading',
    isPro: isAuthenticated,
    isBasic: false,
    isAuthenticated: isAuthenticated,
    refresh: () => {}, // No-op, no longer needed
  };
} 