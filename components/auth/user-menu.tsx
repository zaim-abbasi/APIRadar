"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { UserCircle, LogOut, Crown, Sun, Moon } from 'lucide-react';
import { Github as GithubIcon } from 'lucide-react';
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
  const handleSignIn = useCallback(async (provider: 'github' | 'google') => {
    try {
      await signIn(provider, { 
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
          {mounted && (
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
          )}
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
                <span className="text-base font-medium text-primary dark:text-white leading-tight">Sign in</span>
            )}
          </div>
        </DropdownMenuLabel>
        {!session && (
          <>
            <DropdownMenuItem onClick={() => handleSignIn('google')} className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-pointer mb-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-sm">Continue with Google</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSignIn('github')} className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-pointer mb-1">
              <GithubIcon className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Continue with GitHub</span>
            </DropdownMenuItem>
          </>
        )}
        {session && (
          <>
            <DropdownMenuItem className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-default mt-0 mb-1">
              <div className="flex items-center gap-2 w-full flex-nowrap">
                <Crown className={cn(
                  "h-4 w-4",
                  plan === 'pro' ? "text-yellow-500" : "text-muted-foreground"
                )} />
                <span className="font-medium text-xs leading-tight whitespace-nowrap">
                  Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </span>
                {plan === 'pro' && daysRemaining > 0 && (
                  <span className="ml-2 text-[10px] font-semibold text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
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