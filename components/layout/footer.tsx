"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Shield, Github, Linkedin } from 'lucide-react';

// Memoized Logo component
const FooterLogo = React.memo(() => (
  <Link href="/" className="flex items-center space-x-2">
    <div className="transition-transform duration-200 hover:rotate-180">
      <img src="/logo/logo.ico" alt="API Radar Logo" className="h-5 w-auto object-contain" />
    </div>
    <span className="text-base font-bold text-red-500">
      API Radar
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
    { href: '/learn', label: 'Learn' }
  ], []);

  return (
    <nav className="flex justify-center gap-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm text-muted-foreground hover:text-primary transition-colors duration-150"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
});

FooterNavigation.displayName = 'FooterNavigation';

// Memoized Social Links component
const SocialLinks = React.memo(() => {
  const socialLinks = useMemo(() => [
    { 
      icon: Github, 
      href: 'https://github.com/zaim-abbasi', 
      label: 'GitHub',
      ariaLabel: 'Visit Zaim Abbasi on GitHub'
    },
    { 
      icon: Linkedin, 
      href: 'https://www.linkedin.com/in/zaim-abbasi/', 
      label: 'LinkedIn',
      ariaLabel: 'Connect with Zaim Abbasi on LinkedIn'
    }
  ], []);

  return (
    <div className="flex space-x-3">
      {socialLinks.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.ariaLabel}
          className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150 hover:scale-110"
        >
          <social.icon className="h-3.5 w-3.5" />
          <span className="sr-only">{social.label}</span>
        </a>
      ))}
    </div>
  );
});

SocialLinks.displayName = 'SocialLinks';

const FooterComponent = () => {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          {/* Left: Logo & Name */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-center md:justify-start">
            <FooterLogo />
          </div>

          {/* Center: Copyright */}
          <div className="w-full md:w-auto flex justify-center">
            <span className="text-xs text-muted-foreground text-center">
              © 2025 API Radar. Real-time detection and tracking of API key leaks.
            </span>
          </div>

          {/* Right: GitHub & Email */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-center md:justify-end">
            <a
              href="https://github.com/zaim-abbasi"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Zaim Abbasi on GitHub"
              className="p-1.5 rounded-md bg-muted/50 text-muted-foreground"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="sr-only">GitHub</span>
            </a>
            <a
              href="mailto:zaim.k.abbasi@gmail.com"
              className="px-3 py-1.5 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
            >
              Email the Dev
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export const Footer = React.memo(FooterComponent);