"use client";

import { useEffect, useState } from "react";

// Optimize mobile detection with debouncing and media query listener
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    // SSR-safe initial state
    if (typeof window === 'undefined') return false;
    return window.matchMedia("(max-width: 1023px)").matches;
  });

  useEffect(() => {
    // Use MediaQueryList for better performance
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    
    // Debounce handler to prevent excessive updates
    let timeoutId: NodeJS.Timeout;
    const handleChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(mediaQuery.matches);
      }, 100); // 100ms debounce
    };
    
    // Use modern addEventListener if available, fallback to addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        clearTimeout(timeoutId);
        mediaQuery.removeEventListener('change', handleChange);
      };
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => {
        clearTimeout(timeoutId);
        mediaQuery.removeListener(handleChange);
      };
    }
  }, []);

  return isMobile;
} 