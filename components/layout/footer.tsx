"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Radar, Github } from 'lucide-react';

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
      <div className="container mx-auto px-4 h-full flex items-center relative">
        {/* Left: Logo & Name */}
        <div className="flex items-center space-x-1.5 ">
          <FooterLogo />
        </div>

        {/* Center: Copyright - Absolutely centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
          <span id="footer-label" className="text-xs text-muted-foreground/80 text-center font-medium">
            © 2026 APIRadar. Real-time detection and tracking of API key leaks.
          </span>
        </div>

        {/* Right: Built by */}
        <div className="ml-auto flex items-center justify-end text-xs font-medium text-muted-foreground tracking-wide gap-1">
          <span>Built by</span>
          <a
            href="https://github.com/zaim-abbasi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold text-coral transition-colors duration-200 hover:underline underline-offset-4"
          >
            <Github className="h-3.5 w-3.5" />
            <span className="font-bold">Zaim Abbasi</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

export const Footer = React.memo(FooterComponent);