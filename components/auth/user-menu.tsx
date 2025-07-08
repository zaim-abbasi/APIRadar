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
  let userName = undefined;
  let userEmail = undefined;
  let userPlan = undefined;
  let userImage = '';
  if (session && session.user) {
    userName = session.user.name;
    userEmail = session.user.email;
    userPlan = plan;
    userImage = session.user.image || '';
    if (userName && typeof userName === 'string' && userName.length > 0) {
      displayLetter = userName.charAt(0).toUpperCase();
    } else if (userEmail && typeof userEmail === 'string' && userEmail.length > 0) {
      displayLetter = userEmail.charAt(0).toUpperCase();
    }
  } else if (status === 'loading' && typeof session === 'undefined') {
    // If loading, try to use email from previous session (if available)
    if (userEmail && typeof userEmail === 'string' && userEmail.length > 0) {
      displayLetter = userEmail.charAt(0).toUpperCase();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-full focus:ring-2 focus:ring-primary/60 focus:outline-none shadow-sm"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="flex items-center justify-center h-full w-full text-base font-medium bg-gradient-to-br from-primary/10 to-muted text-primary dark:bg-white/10 dark:text-white select-none">
              {displayLetter}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-xl border-0 bg-gradient-to-br from-background via-background to-muted/40 p-1">
        {/* If signed in, show user info, else show Unauthorized */}
        <DropdownMenuLabel className="font-semibold px-3 py-1 rounded-lg bg-primary/5 mb-1">
          <div className="flex flex-col space-y-0.5">
            {session && userName ? (
              <>
                <span className="text-base font-semibold text-primary dark:text-white truncate">{userName}</span>
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
              </>
            ) : (
              <span className="text-base font-semibold text-primary dark:text-white">Unauthorized</span>
            )}
          </div>
        </DropdownMenuLabel>
        {session && (
          <>
            <DropdownMenuItem className="flex items-center gap-2 px-3 py-1 rounded-lg transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-default mt-0 mb-1">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Crown className={cn(
                  "h-4 w-4",
                  plan === 'pro' ? "text-yellow-500" : "text-muted-foreground"
                )} />
              </span>
              <span className="font-medium">Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {/* Theme toggle inside dropdown */}
        {mounted && (
          <DropdownMenuItem
            className="flex items-center gap-2 px-3 py-1 rounded-lg transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-pointer"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted/60">
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-yellow-500" />
              ) : (
                <Moon className="h-4 w-4 text-blue-500" />
              )}
            </span>
            <span className="font-medium">Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </DropdownMenuItem>
        )}
        {session && (
          <DropdownMenuItem 
            onClick={handleSignOut} 
            disabled={isSigningOut}
            className="flex items-center gap-2 px-3 py-1 rounded-lg transition-none bg-transparent focus:bg-destructive/10 focus:text-destructive cursor-pointer"
          >
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-destructive/10">
              <LogOut className="h-4 w-4 text-destructive" />
            </span>
            <span className="font-medium">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </DropdownMenuItem>
        )}
        {!session && (
          <DropdownMenuItem onClick={handleSignIn} className="flex items-center gap-2 px-3 py-1 rounded-lg transition-none bg-transparent focus:bg-primary/10 focus:text-primary cursor-pointer">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted/60">
              <UserCircle className="h-4 w-4 text-primary" />
            </span>
            <span className="font-medium">Sign in with GitHub</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 