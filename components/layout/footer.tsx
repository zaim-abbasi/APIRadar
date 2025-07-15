"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Shield, Github, Linkedin } from 'lucide-react';
import Image from 'next/image';

// Memoized Logo component
const FooterLogo = React.memo(() => (
  <Link href="/" className="flex items-center space-x-1">
    <div className="transition-transform duration-200 hover:rotate-180">
      <Image src="/logo/logo-webp.webp" alt="API Radar Logo" height={36} width={36} className="max-h-9 max-w-9 object-contain" priority sizes="(max-width: 768px) 36px, 72px" />
    </div>
    <span className="text-base font-medium">
      <span className="text-red-600">API</span>
      <span className="text-zinc-900 dark:text-white"> Radar</span>
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
    <footer className="hidden md:block border-t border-border/40 bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full text-center">
          {/* Left: Logo & Name */}
          <div className="flex items-center space-x-1 w-full md:w-auto justify-center md:justify-start mb-2 md:mb-0">
            <FooterLogo />
          </div>

          {/* Center: Copyright */}
          <div className="w-full md:w-auto flex justify-center mb-2 md:mb-0">
            <span className="text-xs text-muted-foreground text-center">
              © 2025 API Radar. Real-time detection and tracking of API key leaks.
            </span>
          </div>

          {/* Right: GitHub & Email */}
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 space-x-0 md:space-x-2 w-full md:w-auto justify-center md:justify-end">
            <a
              href="mailto:zaim.k.abbasi@gmail.com"
              className="text-sm text-muted-foreground hover:text-primary underline transition-colors duration-150"
            >
              Contact
            </a>
            <div className="flex items-center gap-2 p-1.5 rounded-md bg-muted/50">
              <a
                href="https://github.com/zaim-abbasi"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Zaim Abbasi on GitHub"
                className="text-muted-foreground hover:text-primary"
              >
                <Github className="h-3.5 w-3.5" />
                <span className="sr-only">GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/zaim-abbasi/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Connect with Zaim Abbasi on LinkedIn"
                className="text-muted-foreground hover:text-primary"
              >
                <Linkedin className="h-3.5 w-3.5" />
                <span className="sr-only">LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export const Footer = React.memo(FooterComponent);