"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Radar } from 'lucide-react';

// Memoized Logo component
const FooterLogo = React.memo(() => (
  <Link href="/" className="flex items-center gap-1">
    <Radar className="h-6 w-6 text-coral" strokeWidth={1.5} aria-hidden="true" focusable="false" />
    <span className="text-xl font-semibold tracking-tighter font-heading">
      <span className="text-coral">API</span>
      <span className="text-foreground">Radar</span>
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
          <div className="flex-1 flex justify-center">
            <span id="footer-label" className="text-xs text-muted-foreground/80 text-center font-medium">
              © 2026 APIRadar. Real-time detection and tracking of API key leaks.
            </span>
          </div>

          <div className="flex items-center justify-end w-full md:w-auto text-xs font-semibold text-foreground/70 tracking-wide">
            <span>Engineered by&nbsp;</span>
            <a 
              href="https://github.com/zaim-abbasi" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-coral hover:underline underline-offset-4 transition-all duration-200"
            >
              Zaim Abbasi
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export const Footer = React.memo(FooterComponent);