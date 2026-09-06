"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Github } from "lucide-react";
import { ApiRadarLogo } from "@/components/ui/api-radar-logo";

// Memoized Logo component
const FooterLogo = React.memo(() => (
  <Link href="/" className="flex items-center gap-1.5">
    <ApiRadarLogo
      className="h-6 w-6 md:h-7 md:w-7 text-amber-500"
      aria-hidden="true"
      focusable="false"
    />
    <span className="text-lg md:text-xl font-semibold tracking-tighter font-heading">
      <span className="text-amber-500">API</span>
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
          className="text-sm text-muted-foreground hover:text-amber-500 transition-colors duration-150"
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
      className="border-t border-border/40 py-3 md:py-0 md:h-[50px] bg-background"
    >
      <div className="container mx-auto px-4 h-full flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
        {/* Row 1 (Mobile) / Left Section (Desktop) */}
        <div className="flex items-center justify-between w-full md:w-1/3 md:justify-start gap-4">
          <FooterLogo />
          
          {/* Mobile Legal Links */}
          <div className="md:hidden flex items-center gap-3 text-[10px] font-medium text-muted-foreground tracking-wide">
            <a
              href="https://github.com/zaim-abbasi"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-500 transition-colors underline underline-offset-4 decoration-border/40 inline-flex items-center gap-1 font-semibold text-amber-500"
            >
              <Github className="h-3 w-3 flex-shrink-0" />
              <span>@zaim-abbasi</span>
            </a>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors underline underline-offset-4 decoration-border/40"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors underline underline-offset-4 decoration-border/40"
            >
              Terms
            </Link>
          </div>
        </div>

        {/* Row 2 (Mobile) / Center & Right Sections (Desktop) */}
        <div className="flex items-center justify-between w-full md:contents gap-4">
          {/* Mobile Row 2: Copyright */}
          <div className="md:w-1/3 flex items-center justify-center w-full">
            <span
              id="footer-label"
              className="text-[9px] md:text-xs text-muted-foreground/50 font-medium whitespace-nowrap"
            >
              <span className="sm:inline hidden md:inline">© 2026 APIRadar. Real-time API exposure intelligence.</span>
              <span className="sm:hidden">© 2026 APIRadar</span>
            </span>
          </div>

          {/* Legal Links & Credit (Desktop Only alignment) */}
          <div className="hidden md:flex md:w-1/3 items-center justify-end text-[10px] md:text-xs font-medium text-muted-foreground tracking-wide gap-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <a
                href="https://github.com/zaim-abbasi"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-500 transition-colors underline underline-offset-4 decoration-border/40 inline-flex items-center gap-1 font-semibold text-amber-500/90 hover:text-amber-500"
              >
                <Github className="h-3.5 w-3.5 flex-shrink-0" />
                <span>@zaim-abbasi</span>
              </a>
              <span className="text-muted-foreground/20">•</span>
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
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Footer = React.memo(FooterComponent);
