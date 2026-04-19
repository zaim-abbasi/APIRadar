"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { LogOut, ChevronDown, User } from 'lucide-react';
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

  // Optimized sign-in handler with immediate redirect
  const handleSignIn = useCallback(async () => {
    try {
      sessionStorage.setItem("radar_restore_flag", "true");
      await signIn('google', { 
        callbackUrl: window.location.href,
        redirect: true 
      });
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }, []);

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
        className="h-7 md:h-8 px-4 sm:px-5 inline-flex items-center justify-center whitespace-nowrap rounded-md group text-[10px] sm:text-[11px] font-bold transition-all duration-200 ease-in-out border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-95 bg-coral text-primary-foreground border-coral/80 sm:hover:brightness-90 sm:hover:border-coral/70 uppercase tracking-[0.18em]"
      >
        Sign in
      </Button>
    );
  }

  // Loading state (skeleton-like pill)
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 h-7 md:h-8 px-2 rounded-md border border-border/20 bg-card/30 animate-pulse">
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-muted/40" />
        <div className="h-3 w-3 bg-muted/20 rounded-md" />
      </div>
    );
  }

  const initials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session?.user?.email?.[0].toUpperCase() || 'U';

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group flex items-center gap-2 h-7 md:h-8 px-2 rounded-md border border-coral/10 bg-card/30 backdrop-blur-md hover:bg-card/50 transition-all duration-300 focus-visible:outline-none",
            "hover:border-coral/40"
          )}
          aria-label="User account menu"
        >
          {/* User Avatar / Initials */}
          <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-coral/10 text-coral overflow-hidden shrink-0 border border-coral/30">
            {session?.user?.image ? (
              <img 
                src={session.user.image} 
                alt={session.user.name || "User"} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[10px] sm:text-xs font-bold font-mono">{initials}</span>
            )}
          </div>
          
          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-coral transition-colors duration-300" />
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