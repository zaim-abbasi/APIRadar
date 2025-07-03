"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { UserCircle, LogOut, Crown } from 'lucide-react';
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
  const [showLoading, setShowLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Optimized loading state - shorter delay for production
  useEffect(() => {
    if (status === 'loading') {
      setShowLoading(true);
    } else {
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 100); // Reduced from 200ms to 100ms for faster response
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Optimized sign-in handler with immediate redirect
  const handleSignIn = useCallback(async () => {
    try {
      // Immediate redirect without loading state for faster UX
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

  // Show optimized loading state
  if (status === 'loading' || showLoading) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse flex items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  // Show optimized sign in button
  if (!session) {
    return (
      <Button
        onClick={handleSignIn}
        variant="outline"
        size="sm"
        className="h-9 px-4 font-medium"
      >
        <UserCircle className="mr-2 h-4 w-4" />
        Sign in with GitHub
      </Button>
    );
  }

  // Show optimized user avatar with dropdown
  const user = session.user as any;
  const plan = user?.plan || 'basic';
  const daysRemaining = user?.days_remaining_in_premium || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-full transition-all duration-150 hover:scale-[1.02]"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
            <AvatarFallback className="text-sm font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center justify-between">
          <span className="flex items-center">
            <Crown className={cn(
              "mr-2 h-4 w-4",
              plan === 'pro' ? "text-yellow-500" : "text-muted-foreground"
            )} />
            Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </span>
          {plan === 'pro' && daysRemaining > 0 && (
            <span className="text-xs text-muted-foreground">
              {daysRemaining} days left
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut} 
          disabled={isSigningOut}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 