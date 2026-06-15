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
  { href: '/#about', label: 'About' },
  { href: '/explore', label: 'Explore' },
  { href: '/threat-insights', label: 'Threat Insights' },
];

// Memoize NavLinks to prevent unnecessary re-renders
const NavLinks = React.memo(({ isAboutInView }: { isAboutInView: boolean }) => {
  const pathname = usePathname();
  
  return (
    <>
      {navItems.map((item) => {
        const isActive = item.href === '/#about' 
          ? (pathname === '/' && isAboutInView)
          : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
});
NavLinks.displayName = 'NavLinks';

const MobileMenuOverlay = React.memo(({ isOpen, onClose, isAboutInView }: { isOpen: boolean; onClose: () => void; isAboutInView: boolean }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const initials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session?.user?.email?.[0].toUpperCase() || 'U';

  return (
    <div className="fixed inset-0 top-[50px] z-50 bg-background/98 backdrop-blur-2xl flex flex-col px-6 py-8 overflow-hidden lg:hidden animate-in fade-in slide-in-from-top-5 duration-200">
      <div className="flex flex-col gap-6 lg:gap-8 mt-4">
        {navItems.map((item) => {
          const isActive = item.href === '/#about' ? (pathname === '/' && isAboutInView) : pathname === item.href;
          return (
            <div key={item.href} className="relative py-1">
              <Link
              href={item.href}
              onClick={onClose}
              className={cn(
                "text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter transition-all flex items-center gap-4",
                isActive ? "text-amber-500" : "text-foreground hover:text-amber-500"
              )}
            >
              {isActive && <div className="h-1.5 w-6 bg-amber-500 rounded-md flex-shrink-0" />}
              {item.label}
            </Link>
          </div>
        );
      })}
    </div>

    <div className="mt-auto mb-8 border-t border-border/50 pt-8">
      {status === 'loading' ? (
        <div className="flex flex-col gap-4">
           <div className="flex items-center gap-3 p-3 rounded-lg border border-border/20 bg-card/40 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-muted/40" />
              <div className="flex flex-col gap-2">
                 <div className="h-4 w-32 bg-muted/30 rounded-md" />
                 <div className="h-3 w-40 bg-muted/20 rounded-md" />
              </div>
           </div>
        </div>
      ) : session ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-amber-500/20 bg-card/40">
            <div className="flex items-center gap-4">
              {session.user?.image ? (
                <img src={session.user.image} alt={session.user.name || "User"} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-sm font-bold text-amber-500 border border-amber-500/30 overflow-hidden shrink-0">
                  <span className="font-mono text-base">{initials}</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-base sm:text-lg font-bold text-foreground leading-tight tracking-tight">{session.user?.name}</span>
                <span className="text-[11px] sm:text-xs text-muted-foreground leading-tight font-mono lowercase opacity-70">{session.user?.email}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start h-12 text-[12px] font-black uppercase tracking-[0.2em] border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
            onClick={async () => {
              await signOut({ callbackUrl: '/', redirect: true });
              onClose();
            }}
          >
            <LogOut className="mr-4 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      ) : (
        <Button 
          className="w-full h-12 inline-flex items-center justify-center whitespace-nowrap rounded-md group text-[12px] font-black transition-all duration-200 ease-in-out border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 bg-amber-500 text-primary-foreground border-amber-500/80 sm:hover:brightness-90 sm:hover:border-amber-500/70 uppercase tracking-[0.2em] disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={isLoggingIn}
          onClick={async () => {
            if (isLoggingIn) return;
            setIsLoggingIn(true);
            try {
              sessionStorage.setItem('radar_restore_flag', 'true');
              await signIn('google');
              onClose();
            } catch (err) {
              console.error(err);
              setIsLoggingIn(false);
            }
          }}
        >
          {isLoggingIn ? "Connecting..." : "Sign in"}
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
  const [isAboutInView, setIsAboutInView] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const observer = new IntersectionObserver(
      ([entry]) => setIsAboutInView(entry.isIntersecting),
      { threshold: 0.4 }
    );

    const aboutSection = document.getElementById('about');
    if (aboutSection) observer.observe(aboutSection);

    return () => observer.disconnect();
  }, [pathname]);


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
    <>
      <nav ref={navRef} className={cn("fixed top-0 left-0 right-0 z-50 border-b border-border/40 transition-all duration-200 w-full", isScrolled && "bg-background/95 backdrop-blur-md")} style={{ minHeight: '50px', height: '50px' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center w-full h-full" style={{ height: '50px', minHeight: '50px' }}>
            {/* Left: Logo */}
            <div className="flex items-center flex-1 lg:flex-none lg:w-1/3 justify-start">
              <Link href="/" className="flex items-center gap-1" onClick={handleNavClick}>
                <Radar className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" strokeWidth={1.5} aria-hidden="true" focusable="false" />
                <span className="text-xl sm:text-2xl font-semibold tracking-tighter font-heading whitespace-nowrap leading-none">
                  <span className="text-amber-500">API</span>
                  <span className="text-foreground">Radar</span>
                </span>
              </Link>
            </div>

            {/* Center: Nav Links */}
            <div className="hidden lg:flex flex-1 justify-center">
              <div className="flex items-center space-x-8">
                <NavLinks isAboutInView={isAboutInView} />
              </div>
            </div>

            {/* Right: Theme Toggle, User Menu, Mobile Menu */}
            <div className="flex items-center space-x-2 flex-1 lg:flex-none lg:w-1/3 justify-end min-w-0">
              {/* User Menu (profile icon always visible) */}
              <div className="hidden lg:block min-w-0 flex-shrink-0"><UserMenu /></div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                tabIndex={0}
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5 transition-transform duration-200 rotate-90" />
                ) : (
                  <Menu className="h-5 w-5 transition-transform duration-200" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>
      {/* Mobile Floating Menu Panel - Moved OUTSIDE <nav> to decouple from backdrop-blur stacking context */}
      <MobileMenuOverlay isOpen={isMenuOpen} onClose={handleNavClick} isAboutInView={isAboutInView} />
    </>
  );
}

export const Navbar = React.memo(NavbarComponent);