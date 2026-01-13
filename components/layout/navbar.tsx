"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
// Optimize icon imports - only import what's needed
import { Menu, X, LogOut, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/auth/user-menu';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { memo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

// Memoize NavLinks to prevent unnecessary re-renders
const NavLinks = React.memo(() => {
  const pathname = usePathname();
  return (
    <>
          {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={true}
          className={cn(
            "px-3 py-2 text-base font-medium transition-colors hover:text-coral whitespace-nowrap",
            pathname === item.href
              ? "text-coral"
              : "text-muted-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
});
NavLinks.displayName = 'NavLinks';

const MobileMenuDropdown = React.memo(function MobileMenuDropdown({ onLinkClick, compact }: { onLinkClick: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isAuthenticated } = usePlanCheck();
  let firstName = 'U';
  let userName = undefined;
  let userEmail = undefined;
  if (session && session.user) {
    userName = session.user.name;
    userEmail = session.user.email;
    if (userName && typeof userName === 'string' && userName.length > 0) {
      const spaceIndex = userName.indexOf(' ');
      firstName = spaceIndex > 0 ? userName.substring(0, spaceIndex) : userName;
    } else if (userEmail && typeof userEmail === 'string' && userEmail.length > 0) {
      const atIndex = userEmail.indexOf('@');
      firstName = atIndex > 0 ? userEmail.substring(0, atIndex) : userEmail;
    }
  }
  if (compact) {
    return (
      <nav className="flex flex-col min-h-[1px] gap-1 px-0.5 py-1 w-full">
        {/* Profile Section */}
        <div className="flex items-center gap-1 mb-1 min-h-[40px]">
          <div className="flex flex-col flex-1 min-w-0">
            {session && userName ? (
              <span className="text-[13px] font-medium truncate text-foreground">{userName}</span>
            ) : (
              <span className="text-[13px] font-medium text-muted-foreground">Unauthorized</span>
            )}
            {session && userEmail && (
              <span className="text-[11px] text-muted-foreground truncate">{userEmail}</span>
            )}
          </div>
          {session ? (
            <button onClick={async () => {
              await signOut({ callbackUrl: '/', redirect: true });
              window.location.reload();
            }} className="ml-1 p-1.5 rounded-md hover:bg-destructive/10 transition-colors focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2" title="Sign out" aria-label="Sign out" tabIndex={0}>
              <LogOut className="h-4.5 w-4.5 text-destructive" />
            </button>
          ) : null}
        </div>
        <div className="border-t border-border/50 my-1" />
        {/* Nav Links */}
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={e => {
                e.preventDefault();
                router.replace(item.href);
                onLinkClick();
              }}
              className={cn(
                "flex items-center gap-2 px-2 py-2.5 sm:py-2 rounded-md text-[14px] font-medium transition-colors text-left min-h-[44px] sm:min-h-[40px] focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2",
                pathname === item.href
                  ? "bg-coral/10 text-coral"
                  : "text-muted-foreground hover:text-coral hover:bg-muted/40"
              )}
              aria-label={item.label}
              tabIndex={0}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    );
  }
  // ... (non-compact fallback if needed)
  return null;
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
          initial={{ opacity: 0, x: 32, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 32, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          ref={drawerRef}
          style={{ top: anchorTop, right: 4, position: 'absolute', zIndex: 100, willChange: 'transform, opacity' }}
          className="w-[85vw] max-w-[200px] rounded-md shadow-lg border border-border/50 p-1 mt-0 bg-background/97 backdrop-blur-md"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const NavbarComponent = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [drawerTop, setDrawerTop] = useState(50); // default navbar height
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (navRef.current) {
      setDrawerTop(navRef.current.getBoundingClientRect().bottom);
    }
  }, [navRef, isMenuOpen]);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on route change for mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [pathname]);

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav ref={navRef} className={cn("fixed top-0 left-0 right-0 z-50 border-b border-border/40 shadow-sm transition-all duration-200 w-full", isScrolled && "bg-beige/95 backdrop-blur-md")} style={{ minHeight: '50px', height: '50px' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center w-full h-full" style={{ height: '50px', minHeight: '50px' }}>
          {/* Left: Logo */}
          <div className="flex items-center flex-1 md:flex-none md:w-1/3 justify-start">
            <Link href="/" className="flex items-center gap-1" onClick={handleNavClick}>
              <Radar className="h-6 w-6 sm:h-7 sm:w-7 text-coral" strokeWidth={2.5} aria-hidden="true" focusable="false" />
              <span className="text-2xl sm:text-3xl font-semibold tracking-tighter font-heading whitespace-nowrap leading-none">
                <span className="text-coral">API</span>
                <span className="text-foreground"> Radar</span>
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
          <div className="flex items-center space-x-2 flex-1 md:flex-none md:w-1/3 justify-end min-w-0">
            {/* User Menu (profile icon always visible) */}
            <div className="hidden md:block min-w-0 flex-shrink-0"><UserMenu /></div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-12 w-12 focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Open menu"
              tabIndex={0}
              // Removed unused dynamic imports that cause unnecessary chunks
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ willChange: 'transform' }}
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