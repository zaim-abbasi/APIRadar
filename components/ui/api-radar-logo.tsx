import React from 'react';
import { cn } from '@/lib/utils';

export interface ApiRadarLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const ApiRadarLogo = React.forwardRef<SVGSVGElement, ApiRadarLogoProps>(
  ({ className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        fill="currentColor"
        className={cn("h-7 w-7 flex-shrink-0", className)}
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {/* Left Semi-circle with center circular notch cutout */}
        <path d="M 50 10 A 40 40 0 0 0 50 90 L 50 56 A 6 6 0 0 1 50 44 Z" />

        {/* Right Horizontal Rectangle Bar (Aligned to outer radius x=90) */}
        <rect x="63" y="47" width="27" height="14" rx="0" />

        {/* 3 Top-Right Concentric Radar Arcs (Mathematically symmetric across 45° diagonal axis) */}
        <path
          d="M 55.263 32.787 A 18 18 0 0 1 67.213 44.737"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.4"
          strokeLinecap="butt"
        />
        <path
          d="M 58.479 22.267 A 29 29 0 0 1 77.733 41.521"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.4"
          strokeLinecap="butt"
        />
        <path
          d="M 61.695 11.748 A 40 40 0 0 1 88.252 38.305"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.4"
          strokeLinecap="butt"
        />
      </svg>
    );
  }
);

ApiRadarLogo.displayName = 'ApiRadarLogo';
