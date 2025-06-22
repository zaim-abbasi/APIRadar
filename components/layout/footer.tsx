"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Github, Twitter, Linkedin } from 'lucide-react';

const FooterComponent = () => {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Description */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Shield className="h-5 w-5 text-primary" />
              </motion.div>
              <span className="text-base font-bold text-foreground">
                API Radar
              </span>
            </Link>
          </div>

          {/* Horizontal Navigation */}
          <nav className="flex justify-center gap-6">
            {[
              { href: '/', label: 'Home' },
              { href: '/explore', label: 'Explore' },
              { href: '/leaderboard', label: 'Leaderboard' },
              { href: '/learn', label: 'Learn' }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Social Links */}
          <div className="flex space-x-3">
            {[
              { icon: Github, href: 'https://github.com', label: 'GitHub' },
              { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
              { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' }
            ].map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
              >
                <social.icon className="h-3.5 w-3.5" />
                <span className="sr-only">{social.label}</span>
              </motion.a>
            ))}
          </div>
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