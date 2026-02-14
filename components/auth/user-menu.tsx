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
  const { isAuthenticated } = usePlanCheck();

  // Optimized sign-in handler with immediate redirect
  const handleSignIn = useCallback(async () => {
    try {
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
          <div className="flex items-center flex-1 min-w-0 gap-2">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" focusable="false" />
            <span className="truncate">{displayName || '\u00A0'}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        sideOffset={4} 
        className="w-56 max-w-xs overflow-hidden rounded-md border border-border/60 bg-card text-popover-foreground shadow-sm p-1"
      >
        {/* If signed in, show user info, else show Guest */}
        <DropdownMenuLabel className="font-medium px-2 py-1.5 rounded-sm mb-0.5">
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
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <span className="font-medium">Continue with Google</span>
            </DropdownMenuItem>
          </>
        )}
        {session && (
          <>
            <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-muted" />
          </>
        )}
        {session && (
          <DropdownMenuItem 
            onClick={handleSignOut} 
            disabled={isSigningOut}
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="font-medium">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 