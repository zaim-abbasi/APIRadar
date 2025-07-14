import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';

interface PlanData {
  plan: string;
  days_remaining_in_premium: number;
  requestedTrial: boolean;
}

export function usePlanCheck() {
  const { data: session, status } = useSession();
  const [planData, setPlanData] = useState<PlanData>({
    plan: 'basic',
    days_remaining_in_premium: 0,
    requestedTrial: false
  });
  const [isChecking, setIsChecking] = useState(false);

  const fetchPlan = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/user/check-plan');
      if (response.ok) {
        const data = await response.json();
        setPlanData({
          plan: data.plan,
          days_remaining_in_premium: data.days_remaining_in_premium,
          requestedTrial: data.requestedTrial
        });
      }
    } catch (error) {
      console.error('Error checking plan:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading' || !session?.user) {
      return;
    }
    fetchPlan();
  }, [session?.user?.email, status, fetchPlan]);

  return {
    plan: planData.plan,
    daysRemaining: planData.days_remaining_in_premium,
    requestedTrial: planData.requestedTrial,
    isChecking,
    isPro: planData.plan === 'pro',
    isBasic: planData.plan === 'basic',
    isAuthenticated: !!session?.user,
    refresh: fetchPlan, // expose refresh method
  };
} 