"use client";

import React, { useState, useEffect } from 'react';
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

const MobileMenuDropdown = ({ onLinkClick }: { onLinkClick: () => void }) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { plan, daysRemaining } = usePlanCheck();
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
  return (
    <div className="w-full max-w-xs mx-auto bg-background rounded-xl shadow-xl border border-border/60 p-2 mt-2 animate-fade-in-up">
      {/* Profile Section */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-primary/10 to-muted text-primary dark:bg-white/10 dark:text-white text-base font-semibold">
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
      <div className="border-t border-border/40 my-1" />
      {/* Nav Links */}
      <div className="flex flex-col gap-0.5">
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
      <div className="border-t border-border/40 my-1" />
      {/* Email the Dev */}
      <a
        href="mailto:zaim.k.abbasi@gmail.com"
        className="block px-3 py-1 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors text-left"
        onClick={onLinkClick}
      >
        Email the Dev
      </a>
    </div>
  );
};

const NavbarComponent = () => {
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                <Image src="/logo/logo-png.png" alt="API Radar Logo" height={36} width={36} className="max-h-9 max-w-9 object-contain" priority />
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
              className="md:hidden h-9 w-9"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {isMenuOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </motion.div>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="md:hidden flex justify-center border-0 py-2 bg-transparent"
            >
              <MobileMenuDropdown onLinkClick={handleNavClick} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

export const Navbar = React.memo(NavbarComponent);