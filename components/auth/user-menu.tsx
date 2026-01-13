"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { Chrome, LogOut, ChevronDown } from 'lucide-react';
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
  const { isAuthenticated } = usePlanCheck();

  // Optimized sign-in handler with immediate redirect
  const handleSignIn = useCallback(async () => {
    try {
      await signIn('google', { 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }, []);

  // Optimized sign-out handler
  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return; // Prevent double-click
    setIsSigningOut(true);
    try {
      // Force complete session reset
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
      // Force page reload to ensure complete session reset
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  const { displayName, userName, userEmail } = useMemo(() => {
    let display = '';
    let name: string | undefined = undefined;
    let email: string | undefined = undefined;

    if (status === 'loading') {
      display = '';
    } else if (session && session.user) {
      name = session.user.name || undefined;
      email = session.user.email || undefined;
      if (name && typeof name === 'string' && name.length > 0) {
        display = name;
      } else if (email && typeof email === 'string' && email.length > 0) {
        display = email;
      } else {
        display = 'Sign in';
      }
    } else {
      display = 'Sign in';
    }
    return { displayName: display, userName: name, userEmail: email };
  }, [session, status]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "px-3.5 py-1.5 rounded-md border bg-card/50 backdrop-blur-sm border-border flex items-center justify-between min-w-[120px] max-w-[200px] text-sm font-medium transition-colors hover:text-coral focus-visible:outline-none text-left",
            "text-foreground"
          )}
        >
          <span className="truncate flex-1 min-w-0">{displayName || '\u00A0'}</span>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        sideOffset={4} 
        className="w-56 max-w-xs rounded-md border border-border/60 p-1"
      >
        {/* If signed in, show user info, else show Guest */}
        <DropdownMenuLabel className="font-medium px-2 py-1 rounded-md bg-coral/5 mb-0.5 transition-colors duration-200">
          <div className="flex flex-col space-y-0.5">
            {session && userName ? (
              <>
                <span className="text-sm font-medium text-foreground truncate leading-tight">{userName}</span>
                <span className="text-xs text-muted-foreground/80 truncate leading-tight">{userEmail}</span>
              </>
            ) : (
                <span className="text-sm font-medium text-foreground leading-tight">Sign in</span>
            )}
          </div>
        </DropdownMenuLabel>
        {!session && (
          <>
            <DropdownMenuItem 
              onClick={() => handleSignIn()} 
              className="flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 bg-transparent hover:bg-coral/10 hover:text-coral focus:bg-coral/10 focus:text-coral cursor-pointer active:scale-[0.98]"
            >
              <Chrome className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" focusable="false" />
              <span className="font-medium text-sm">Continue with Google</span>
            </DropdownMenuItem>
          </>
        )}
        {session && (
          <>
            <DropdownMenuSeparator className="my-0.5" />
          </>
        )}
        {session && (
          <DropdownMenuItem 
            onClick={handleSignOut} 
            disabled={isSigningOut}
            className="flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 bg-transparent hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4 text-destructive transition-transform duration-200 group-hover:scale-110" />
            <span className="font-medium text-sm">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 