"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Radar, Github } from "lucide-react";

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
      className="border-t border-border/40 shadow-sm py-6 md:py-0 md:h-[50px] bg-background"
    >
      <div className="container mx-auto px-4 h-full flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
        {/* Left: Logo & Name */}
        <div className="flex items-center space-x-1.5 shrink-0 md:w-1/3 justify-start">
          <FooterLogo />
        </div>

        {/* Center: Copyright */}
        <div className="md:w-1/3 flex justify-center">
          <span
            id="footer-label"
            className="text-[10px] md:text-xs text-muted-foreground/60 text-center font-medium"
          >
            © 2026 APIRadar. Real-time API exposure intelligence.
          </span>
        </div>

        {/* Right: Links & Credit */}
        <div className="md:w-1/3 flex items-center justify-center md:justify-end text-xs font-medium text-muted-foreground tracking-wide gap-4 sm:gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="https://apiradar.live/privacy"
              className="hover:text-foreground transition-colors underline underline-offset-4 decoration-border/40"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/20">•</span>
            <Link
              href="https://apiradar.live/terms"
              className="hover:text-foreground transition-colors underline underline-offset-4 decoration-border/40"
            >
              Terms of Service
            </Link>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="opacity-60">Built by</span>
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
    </footer>
  );
};

export const Footer = React.memo(FooterComponent);
