"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

// Memoize provider to prevent unnecessary re-renders
export const AuthProvider = React.memo(function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
});
AuthProvider.displayName = 'AuthProvider'; 