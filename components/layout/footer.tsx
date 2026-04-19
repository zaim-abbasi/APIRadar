"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Radar, Github } from "lucide-react";

// Memoized Logo component
const FooterLogo = React.memo(() => (
  <Link href="/" className="flex items-center gap-1">
    <Radar
      className="h-5 w-5 md:h-6 md:w-6 text-coral"
      strokeWidth={1.5}
      aria-hidden="true"
      focusable="false"
    />
    <span className="text-lg md:text-xl font-semibold tracking-tighter font-heading">
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
      { href: "/#about", label: "About" },
      { href: "/explore", label: "Explore" },
      { href: "/threat-insights", label: "Threat Insights" },
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
  return (
    <footer
      role="contentinfo"
      aria-labelledby="footer-label"
      className="border-t border-border/40 py-4 md:py-0 md:h-[50px] bg-background"
    >
      <div className="container mx-auto px-4 h-full flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-0">
        {/* Row 1 (Mobile) / Left Section (Desktop) */}
        <div className="flex items-center justify-between w-full md:w-1/3 md:justify-start gap-4">
          <FooterLogo />
          {/* Mobile-only Built by */}
          <div className="md:hidden flex items-center gap-1 shrink-0 text-[10px] font-medium text-muted-foreground tracking-wide">
            <span className="opacity-60">Built by</span>
            <a
              href="https://github.com/zaim-abbasi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-semibold text-coral transition-colors duration-200 hover:underline underline-offset-4"
            >
              <Github className="h-3 w-3" />
              <span className="font-bold">Zaim Abbasi</span>
            </a>
          </div>
        </div>

        {/* Row 2 (Mobile) / Center & Right Sections (Desktop) */}
        <div className="flex items-center justify-between w-full md:contents gap-4">
          {/* Copyright: Center on desktop, left on mobile row 2 */}
          <div className="md:w-1/3 flex md:justify-center">
            <span
              id="footer-label"
              className="text-[9px] md:text-xs text-muted-foreground/60 font-medium whitespace-nowrap"
            >
              <span className="sm:inline hidden md:inline">© 2026 APIRadar. Real-time API exposure intelligence.</span>
              <span className="sm:hidden">© 2026 APIRadar</span>
            </span>
          </div>

          {/* Legal Links & Credit: Right on desktop, right on mobile row 2 */}
          <div className="md:w-1/3 flex items-center justify-end text-[10px] md:text-xs font-medium text-muted-foreground tracking-wide md:gap-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors underline underline-offset-4 decoration-border/40"
              >
                Privacy
              </Link>
              <span className="text-muted-foreground/20">•</span>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors underline underline-offset-4 decoration-border/40"
              >
                Terms
              </Link>
            </div>
            
            {/* Desktop-only Built by */}
            <div className="hidden md:flex items-center gap-1 shrink-0 ml-6">
              <span className="opacity-60 font-medium">Built by</span>
              <a
                href="https://github.com/zaim-abbasi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-semibold text-coral transition-colors duration-200 hover:underline underline-offset-4"
              >
                <Github className="h-3.5 w-3.5" />
                <span className="font-bold text-coral">Zaim Abbasi</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Footer = React.memo(FooterComponent);
