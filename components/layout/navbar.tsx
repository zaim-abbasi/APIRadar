"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

const MobileMenuOverlay = React.memo(({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { data: session } = useSession();
  const router = useRouter();

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 top-[50px] z-40 bg-background/95 backdrop-blur-xl flex flex-col px-6 py-8 overflow-hidden md:hidden animate-in fade-in slide-in-from-top-5 duration-200">
      <div className="flex flex-col gap-6 mt-4">
        {navItems.map((item, idx) => (
          <div key={item.href}>
            <Link
              href={item.href}
              onClick={onClose}
              className="text-3xl font-medium tracking-tight text-foreground hover:text-coral transition-colors flex items-center gap-3"
            >
              {item.label}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-auto mb-8 border-t border-border/50 pt-8">
        {session ? (
           <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-coral">
                  {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{session.user?.name}</span>
                  <span className="text-sm text-muted-foreground">{session.user?.email}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-start h-12 text-base font-medium border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                onClick={async () => {
                  await signOut({ callbackUrl: '/', redirect: true });
                  onClose();
                }}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
           </div>
        ) : (
          <Button 
            className="w-full h-12 text-base font-semibold bg-coral text-primary-foreground hover:bg-coral/90"
            onClick={() => {
              sessionStorage.setItem('radar_restore_flag', 'true');
              signIn('google');
              onClose();
            }}
          >
            Sign In
          </Button>
        )}
      </div>
    </div>
  );
});
MobileMenuOverlay.displayName = 'MobileMenuOverlay';

const NavbarComponent = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);


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
    <nav ref={navRef} className={cn("fixed top-0 left-0 right-0 z-50 border-b border-border/40 shadow-sm transition-all duration-200 w-full", isScrolled && "bg-background/95 backdrop-blur-md")} style={{ minHeight: '50px', height: '50px' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center w-full h-full" style={{ height: '50px', minHeight: '50px' }}>
          {/* Left: Logo */}
          <div className="flex items-center flex-1 md:flex-none md:w-1/3 justify-start">
            <Link href="/" className="flex items-center gap-1" onClick={handleNavClick}>
              <Radar className="h-6 w-6 sm:h-7 sm:w-7 text-coral" strokeWidth={1.5} aria-hidden="true" focusable="false" />
              <span className="text-xl sm:text-2xl font-semibold tracking-tighter font-heading whitespace-nowrap leading-none">
                <span className="text-coral">API</span>
                <span className="text-foreground">Radar</span>
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
              {isMenuOpen ? (
                <X className="h-6 w-6 transition-transform duration-200 rotate-90" />
              ) : (
                <Menu className="h-6 w-6 transition-transform duration-200" />
              )}
            </Button>
          </div>
        </div>
        {/* Mobile Floating Menu Panel */}
        <MobileMenuOverlay isOpen={isMenuOpen} onClose={handleNavClick} />
      </div>
    </nav>
  );
}

export const Navbar = React.memo(NavbarComponent);