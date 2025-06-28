"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Shield, Github, Linkedin } from 'lucide-react';

// Memoized Logo component
const FooterLogo = React.memo(() => (
  <Link href="/" className="flex items-center space-x-2">
    <div className="transition-transform duration-200 hover:rotate-180">
      <Shield className="h-5 w-5 text-primary" />
    </div>
    <span className="text-base font-bold text-foreground">
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Description */}
          <div className="flex items-center space-x-2">
            <FooterLogo />
          </div>

          {/* Horizontal Navigation */}
          <FooterNavigation />

          {/* Social Links */}
          <SocialLinks />
        </div>

        {/* Copyright */}
        <div className="mt-3 pt-3 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 API Radar. Built for security, designed for developers.
          </p>
        </div>
      </div>
    </footer>
  );
}

export const Footer = React.memo(FooterComponent);