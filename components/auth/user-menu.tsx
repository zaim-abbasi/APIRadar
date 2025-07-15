"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { UserCircle, LogOut, Crown, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { plan, daysRemaining } = usePlanCheck();
  const { theme, setTheme } = require('next-themes').useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Optimized sign-in handler with immediate redirect
  const handleSignIn = useCallback(async () => {
    try {
      await signIn('github', { 
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
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  // Always show the profile icon (Avatar)
  let displayLetter = 'U';
  let userName: string | undefined = undefined;
  let userEmail: string | undefined = undefined;
  let userPlan = undefined;
  let userImage = '';
  if (session && session.user) {
    userName = session.user.name ?? undefined;
    userEmail = session.user.email ?? undefined;
    userPlan = plan;
    userImage = session.user.image || '';
    if (userName && typeof userName === 'string' && userName.length > 0) {
      displayLetter = userName.charAt(0).toUpperCase();
    } else if (typeof userEmail === 'string' && (userEmail as string).length > 0) {
      displayLetter = (userEmail as string).charAt(0).toUpperCase();
    }
  } else if (status === 'loading' && typeof session === 'undefined') {
    // If loading, try to use email from previous session (if available)
    if (typeof userEmail === 'string' && (userEmail as string).length > 0) {
      displayLetter = (userEmail as string).charAt(0).toUpperCase();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 md:h-9 md:w-9 rounded-full focus:ring-2 focus:ring-primary/60 focus:outline-none shadow-sm p-0 bg-transparent"
        >
          <Avatar className={cn(
            "h-8 w-8 md:h-9 md:w-9 border border-border/60",
            theme === 'dark' ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"
          )}>
            <AvatarFallback className={cn(
              "flex items-center justify-center h-full w-full text-base font-semibold select-none transition-colors",
              theme === 'dark'
                ? "bg-zinc-800 text-white"
                : "bg-zinc-100 text-zinc-900"
            )}>
              {session && userName
                ? displayLetter
                : <UserCircle className="h-5 w-5 text-muted-foreground" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56 max-w-xs rounded-lg shadow-lg border border-border/60 bg-background/95 dark:bg-zinc-900/95 p-0.5">
        {/* If signed in, show user info, else show Guest */}
        <DropdownMenuLabel className="font-semibold px-3 py-1.5 rounded-lg bg-primary/5 mb-1">
          <div className="flex flex-col space-y-0.5">
            {session && userName ? (
              <>
                <span className="text-base font-medium text-primary dark:text-white truncate leading-tight">{userName}</span>
                <span className="text-xs text-muted-foreground truncate leading-tight">{userEmail}</span>
              </>
            ) : (
                <span className="text-base font-medium text-primary dark:text-white leading-tight">Guest</span>
            )}
          </div>
        </DropdownMenuLabel>
        {!session && (
          <DropdownMenuItem onClick={handleSignIn} className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-pointer mb-1">
            <UserCircle className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Sign in with GitHub</span>
          </DropdownMenuItem>
        )}
        {session && (
          <>
            <DropdownMenuItem className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-default mt-0 mb-1">
              <div className="flex items-center gap-2 w-full">
                <Crown className={cn(
                  "h-4 w-4",
                  plan === 'pro' ? "text-yellow-500" : "text-muted-foreground"
                )} />
                <span className="font-medium text-sm leading-tight">Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                {plan === 'pro' && daysRemaining > 0 && (
                  <span className="ml-2 text-xs font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-md whitespace-nowrap">
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in Pro trial
                  </span>
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {/* Theme toggle inside dropdown */}
        {mounted && (
          <DropdownMenuItem
            className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-pointer"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-yellow-500" />
            ) : (
              <Moon className="h-4 w-4 text-blue-500" />
            )}
            <span className="font-medium text-sm">Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </DropdownMenuItem>
        )}
        {session && (
          <DropdownMenuItem 
            onClick={handleSignOut} 
            disabled={isSigningOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-none bg-transparent focus:bg-destructive/10 focus:text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-destructive" />
            <span className="font-medium text-sm">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 