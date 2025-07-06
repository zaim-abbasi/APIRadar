"use client";

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading' || !session?.user) {
      return;
    }

    const checkPlan = async () => {
      try {
        const response = await fetch('/api/user/check-plan');
        if (response.ok) {
          const data = await response.json();
          // The plan will be updated in the session automatically through the JWT callback
          console.log('Plan checked:', data.plan);
        }
      } catch (error) {
        console.error('Error checking plan:', error);
      }
    };

    checkPlan();
  }, [session?.user?.email, status]);

  return <>{children}</>;
} 