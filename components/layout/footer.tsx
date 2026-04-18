"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Radar, Github, Coffee } from "lucide-react";
import { SponsorDialog } from "@/components/sponsor-dialog";

// Memoized Logo component
const FooterLogo = React.memo(() => (
  <Link href="/" className="flex items-center gap-1">
    <Radar
      className="h-6 w-6 text-coral"
      strokeWidth={1.5}
      aria-hidden="true"
      focusable="false"
    />
    <span className="text-xl font-semibold tracking-tighter font-heading">
      <span className="text-coral">API</span>
      <span className="text-foreground">Radar</span>
    </span>
  </Link>
));

FooterLogo.displayName = "FooterLogo";

// Memoized Navigation component
const FooterNavigation = React.memo(() => {
  const navItems = useMemo(
    () => [
      { href: "/", label: "Home" },
      { href: "/explore", label: "Explore" },
      { href: "/leaderboard", label: "Leaderboard" },
    ],
    [],
  );

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

FooterNavigation.displayName = "FooterNavigation";

const FooterComponent = () => {
  const [isSponsorOpen, setIsSponsorOpen] = useState(false);
  return (
    <footer
      role="contentinfo"
      aria-labelledby="footer-label"
      className="border-t border-border/40 shadow-sm py-6 md:py-0 md:h-[50px] bg-background"
    >
      <div className="container mx-auto px-4 h-full flex flex-col md:flex-row items-center gap-4 md:gap-0 relative">
        {/* Left: Logo & Name */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <FooterLogo />
        </div>

        {/* Center: Copyright - Absolutely centered on desktop, hidden or stacked on mobile */}
        <div className="md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex">
          <span
            id="footer-label"
            className="text-[10px] md:text-xs text-muted-foreground/60 text-center font-medium"
          >
            © 2026 APIRadar. Real-time API leak intelligence.
          </span>
        </div>

        <div className="md:ml-auto flex items-center justify-center md:justify-end text-[10px] md:text-xs font-medium text-muted-foreground tracking-wide gap-3 sm:gap-4">
          <button
            onClick={() => setIsSponsorOpen(true)}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Coffee className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sponsor</span>
          </button>
          <Link
            href="/#about"
            className="hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <div className="flex items-center gap-1">
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
      </div>
      <SponsorDialog open={isSponsorOpen} onOpenChange={setIsSponsorOpen} />
    </footer>
  );
};

export const Footer = React.memo(FooterComponent);
