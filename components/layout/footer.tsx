"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';

// Memoized Logo component
const FooterLogo = React.memo(() => (
  <Link href="/" className="flex items-center">
    <span className="text-2xl font-bold tracking-tighter font-heading">
      <span className="text-coral">API</span>
      <span className="text-foreground"> Radar</span>
    </span>
  </Link>
));

FooterLogo.displayName = 'FooterLogo';

// Memoized Navigation component
const FooterNavigation = React.memo(() => {
  const navItems = useMemo(() => [
    { href: '/', label: 'Home' },
    { href: '/explore', label: 'Explore' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ], []);

  return (
    <nav className="flex justify-center gap-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={true}
          className="text-sm text-muted-foreground hover:text-coral transition-colors duration-150"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
});

FooterNavigation.displayName = 'FooterNavigation';


const FooterComponent = () => {
  return (
    <footer role="contentinfo" aria-labelledby="footer-label" className="hidden md:block border-t border-border/40 shadow-sm" style={{ height: '50px' }}>
      <div className="container mx-auto px-4 h-full flex items-center">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full text-center">
          {/* Left: Logo & Name */}
          <div className="flex items-center space-x-1.5 w-full md:w-auto justify-center md:justify-start mb-2 md:mb-0">
            <FooterLogo />
          </div>

          {/* Center: Copyright */}
          <div className="w-full md:w-auto flex justify-center">
            <span id="footer-label" className="text-xs text-muted-foreground/80 text-center font-medium">
              © 2025 API Radar. Real-time detection and tracking of API key leaks.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export const Footer = React.memo(FooterComponent);