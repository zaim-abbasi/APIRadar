"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Shield, Moon, Sun, Menu, X, UserCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { UserMenu } from '@/components/auth/user-menu';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { memo } from 'react';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

const NavLinks = () => {
  const pathname = usePathname();
  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={true}
          className={cn(
            "relative px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
            pathname === item.href
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {item.label}
          {pathname === item.href && (
            <motion.div
              layoutId="navbar-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
              initial={false}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          )}
        </Link>
      ))}
    </>
  );
};

const MobileMenuDropdown = memo(({ onLinkClick, compact }: { onLinkClick: () => void; compact?: boolean }) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { plan, daysRemaining } = usePlanCheck();
  const { theme, setTheme } = useTheme();
  let displayLetter = 'U';
  let userName = undefined;
  let userEmail = undefined;
  if (session && session.user) {
    userName = session.user.name;
    userEmail = session.user.email;
    if (userName && typeof userName === 'string' && userName.length > 0) {
      displayLetter = userName.charAt(0).toUpperCase();
    } else if (userEmail && typeof userEmail === 'string' && userEmail.length > 0) {
      displayLetter = userEmail.charAt(0).toUpperCase();
    }
  }
  if (compact) {
    return (
      <nav className="flex flex-col min-h-[1px] gap-0.5 px-0.5 py-1 w-full">
        {/* Profile Section */}
        <div className="flex items-center gap-0.5 mb-0.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-primary/10 to-muted text-primary dark:bg-white/10 dark:text-white text-[13px] font-semibold">
            {displayLetter}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            {session && userName ? (
              <span className="text-[11px] font-semibold truncate">{userName}</span>
            ) : (
              <span className="text-[11px] font-semibold text-primary dark:text-white">Unauthorized</span>
            )}
            {session && userEmail && (
              <span className="text-[9px] text-muted-foreground truncate">{userEmail}</span>
            )}
            {session && plan === 'pro' && daysRemaining > 0 && (
              <span className="mt-0.5 text-[9px] font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 px-1 py-0.5 rounded-md">
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in Pro trial
              </span>
            )}
          </div>
          {session ? (
            <button onClick={() => signOut({ callbackUrl: '/', redirect: true })} className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/10 transition-colors" title="Sign out">
              <LogOut className="h-3.5 w-3.5 text-destructive" />
            </button>
          ) : (
            <button onClick={() => signIn('github', { callbackUrl: '/', redirect: true })} className="ml-0.5 p-0.5 rounded-full hover:bg-primary/10 transition-colors" title="Sign in">
              <UserCircle className="h-3.5 w-3.5 text-primary" />
            </button>
          )}
        </div>
        <div className="border-t border-border/40 my-0.5" />
        {/* Nav Links */}
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={onLinkClick}
              className={cn(
                "block px-1.5 py-1 rounded-lg text-[12px] font-medium transition-colors text-left",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-primary hover:bg-muted/50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {/* Spacer to push theme toggle to bottom if needed */}
        <div className="flex-1" />
        {/* Theme Toggle (as a row, consistent with nav items) */}
        <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors cursor-pointer select-none mt-1"
          role="button"
          tabIndex={0}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>Theme</span>
        </div>
      </nav>
    );
  }
  return (
    <div className={cn(
      "w-full max-w-xs mx-auto bg-background rounded-xl shadow-xl border border-border/60 animate-fade-in-up",
      compact ? "p-2 text-sm gap-1" : "p-4"
    )}>
      {/* Profile Section */}
      <div className={cn("flex items-center", compact ? "gap-1 mb-1" : "gap-3 mb-3")}>
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-muted text-primary dark:bg-white/10 dark:text-white text-lg font-semibold">
          {displayLetter}
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          {session && userName ? (
            <span className="text-sm font-semibold truncate">{userName}</span>
          ) : (
            <span className="text-sm font-semibold text-primary dark:text-white">Unauthorized</span>
          )}
          {session && userEmail && (
            <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
          )}
          {session && plan === 'pro' && daysRemaining > 0 && (
            <span className="mt-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-md">
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left in Pro trial
            </span>
          )}
        </div>
        {session ? (
          <button onClick={() => signOut({ callbackUrl: '/', redirect: true })} className="ml-1 p-1 rounded-full hover:bg-destructive/10 transition-colors" title="Sign out">
            <LogOut className="h-4 w-4 text-destructive" />
          </button>
        ) : (
          <button onClick={() => signIn('github', { callbackUrl: '/', redirect: true })} className="ml-1 p-1 rounded-full hover:bg-primary/10 transition-colors" title="Sign in">
            <UserCircle className="h-4 w-4 text-primary" />
          </button>
        )}
      </div>
      <div className={cn("border-t border-border/40", compact ? "my-1" : "my-2")} />
      {/* Nav Links */}
      <div className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={onLinkClick}
            className={cn(
              "block px-3 py-1 rounded-lg text-sm font-medium transition-colors text-left",
              pathname === item.href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-primary hover:bg-muted/50"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className={cn("border-t border-border/40", compact ? "my-1" : "my-2")} />
      {/* Email the Dev */}
      <a
        href="mailto:zaim.k.abbasi@gmail.com"
        className={cn(
          "block rounded-lg font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors text-left",
          compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
        )}
        onClick={onLinkClick}
      >
        Email the Dev
      </a>
    </div>
  );
});

const MobileMenuDrawer = ({ isOpen, onClose, anchorTop, children }: { isOpen: boolean; onClose: () => void; anchorTop: number; children: React.ReactNode }) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.13 }}
          ref={drawerRef}
          style={{ top: anchorTop, right: 4, position: 'absolute', zIndex: 100 }}
          className="w-[85vw] max-w-[200px] bg-background rounded-md shadow-lg border border-border/60 p-1 mt-0 animate-fade-in-up"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const NavbarComponent = () => {
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [drawerTop, setDrawerTop] = useState(64); // default navbar height

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (navRef.current) {
      setDrawerTop(navRef.current.getBoundingClientRect().bottom);
    }
  }, [navRef, isMenuOpen]);

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav ref={navRef} className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex h-16 items-center w-full">
          {/* Left: Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-1" onClick={handleNavClick}>
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative"
              >
                <Image src="/logo/logo-webp.webp" alt="API Radar Logo" height={36} width={36} className="max-h-9 max-w-9 object-contain" priority sizes="(max-width: 768px) 36px, 72px" />
              </motion.div>
              <span className="text-xl font-medium">
                <span className="text-red-600">API</span>
                <span className="text-zinc-900 dark:text-white"> Radar</span>
              </span>
            </Link>
          </div>

          {/* Center: Nav Links */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center space-x-8">
              <NavLinks />
            </div>
          </div>

          {/* Right: Theme Toggle, User Menu, Mobile Menu */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-auto md:ml-0">
            {/* User Menu (profile icon always visible) */}
            <div className="hidden md:block"><UserMenu /></div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-12 w-12"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Open menu"
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </motion.div>
            </Button>
          </div>
        </div>
        {/* Mobile Floating Menu Panel */}
        <MobileMenuDrawer isOpen={isMenuOpen} onClose={handleNavClick} anchorTop={drawerTop}>
          <MobileMenuDropdown onLinkClick={handleNavClick} compact />
        </MobileMenuDrawer>
      </div>
    </nav>
  );
}

export const Navbar = React.memo(NavbarComponent);