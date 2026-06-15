"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

// Memoize provider to prevent unnecessary re-renders
export const AuthProvider = React.memo(function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
});
AuthProvider.displayName = 'AuthProvider'; 