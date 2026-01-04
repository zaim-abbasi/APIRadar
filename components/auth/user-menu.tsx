"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { LogOut, ChevronDown } from 'lucide-react';
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="px-3.5 py-1.5 rounded-md border bg-card/50 backdrop-blur-sm border-border">
          <button
            className={cn(
              "flex items-center justify-between w-full text-sm font-medium transition-colors hover:text-coral focus-visible:outline-none text-left",
              "text-foreground"
            )}
          >
            <span>{displayName || '\u00A0'}</span>
            <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
          </button>
        </div>
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
              <svg className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
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