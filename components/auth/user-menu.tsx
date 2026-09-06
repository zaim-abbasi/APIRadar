"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { LogOut, ChevronDown, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Optimized sign-in handler with immediate redirect
  const handleSignIn = useCallback(async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      sessionStorage.setItem("radar_restore_flag", "true");
      await signIn('google', { 
        callbackUrl: window.location.href,
        redirect: true 
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoggingIn(false);
    }
  }, [isLoggingIn]);

  // Optimized sign-out handler
  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  // If not authenticated, show a solid 1-click Sign In button matching homepage style
  if (status === 'unauthenticated' || (!session && status !== 'loading')) {
    return (
      <Button
        onClick={handleSignIn}
        disabled={isLoggingIn}
        size="sm"
        className="h-8 px-3 gap-1.5 text-sm font-medium bg-amber-500 text-primary-foreground hover:bg-amber-500/90 border border-amber-500/80 shrink-0"
      >
        <LogIn className="h-3.5 w-3.5 shrink-0 text-primary-foreground" strokeWidth={2.2} />
        <span>{isLoggingIn ? "Connecting..." : "Sign In"}</span>
      </Button>
    );
  }

  // Loading state (skeleton-like pill)
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 h-8 px-2 rounded-md border border-border/20 bg-card/30 animate-pulse">
        <div className="w-4 h-4 rounded-md bg-muted/40" />
        <div className="h-3 w-4 bg-muted/20 rounded-md" />
      </div>
    );
  }

  const firstName = session?.user?.name?.split(' ')[0] || 'User';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group flex items-center h-8 px-2.5 rounded-md border border-amber-500/20 bg-card/40 backdrop-blur-md hover:bg-card/50 transition-all duration-300 focus-visible:outline-none",
            "hover:border-amber-500/40 gap-1.5"
          )}
          aria-label="User account menu"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30 shrink-0">
            <User className="w-3.5 h-3.5 text-amber-500" />
          </div>

          <span className="text-sm font-medium text-foreground/90 group-hover:text-amber-500 transition-colors hidden sm:inline truncate max-w-[80px]">
            {firstName}
          </span>
          
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-amber-500 transition-colors duration-300" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        sideOffset={8} 
        className="w-56 overflow-hidden rounded-md border border-border/80 bg-background p-1"
      >
        <DropdownMenuLabel className="px-2 py-1.5 mb-0.5">
          <div className="flex flex-col space-y-0">
            <span className="text-sm font-bold text-foreground truncate tracking-tight">{session?.user?.name}</span>
            <span className="text-sm font-normal text-muted-foreground/80 truncate lowercase">{session?.user?.email}</span>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="-mx-1 my-0.5 h-px bg-muted/60" />
        
        <DropdownMenuItem 
          onClick={handleSignOut} 
          disabled={isSigningOut}
          className="group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive focus:text-destructive focus:bg-destructive/10 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}