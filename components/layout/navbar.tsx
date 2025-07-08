"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Shield, Moon, Sun, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { UserMenu } from '@/components/auth/user-menu';

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

const MobileNavLinks = ({ onLinkClick }: { onLinkClick: () => void }) => {
  const pathname = usePathname();
  return (
    <>
      {navItems.map((item, index) => (
        <motion.div
          key={item.href}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05, duration: 0.2, ease: 'easeOut' }}
        >
          <Link
            href={item.href}
            prefetch={true}
            onClick={onLinkClick}
            className={cn(
              "block px-3 py-2 text-sm font-medium rounded-md transition-colors",
              pathname === item.href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-primary hover:bg-muted/50"
            )}
          >
            {item.label}
          </Link>
        </motion.div>
      ))}
    </>
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
      <div className="container mx-auto px-4">
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
          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-8">
              <NavLinks />
            </div>
          </div>

          {/* Right: Theme Toggle, User Menu, Mobile Menu */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* User Menu (profile icon always visible) */}
            <UserMenu />

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
              className="md:hidden border-t border-border/40 py-4"
            >
              <div className="space-y-2">
                <MobileNavLinks onLinkClick={handleNavClick} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

export const Navbar = React.memo(NavbarComponent);