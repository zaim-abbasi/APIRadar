"use client";

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function usePlanDowngrade() {
  const { data: session, update } = useSession();

  useEffect(() => {
    if (session?.user?.planDowngraded) {
      // Show notification to user
      toast.info(
        "Your Pro trial has expired. You've been switched to Basic plan.",
        {
          duration: 5000,
          action: {
            label: "Refresh",
            onClick: () => window.location.reload(),
          },
        }
      );

      // Clear the downgrade flag and refresh session
      update({
        ...session,
        user: {
          ...session.user,
          planDowngraded: false,
        },
      });

      // Force page refresh after a short delay to show basic layout
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [session?.user?.planDowngraded, update]);

  return null;
} 