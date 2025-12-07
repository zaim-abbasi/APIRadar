"use client";

import { useEffect } from "react";

/**
 * Konami Code Listener Component
 * Detects the sequence: Up Up, Left Left, Down Down, Right Right
 * When detected, immediately redirects to TOTP setup page
 */
export function KonamiCodeListener() {
  useEffect(() => {
    // Expected sequence: Up, Up, Left, Left, Down, Down, Right, Right
    const expectedSequence = [
      "ArrowUp",
      "ArrowUp",
      "ArrowLeft",
      "ArrowLeft",
      "ArrowDown",
      "ArrowDown",
      "ArrowRight",
      "ArrowRight",
    ];

    let currentSequence: string[] = [];
    let lastKeyTime = 0;
    const SEQUENCE_TIMEOUT = 3000; // Reset if 3 seconds pass between keys

    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now();

      // Reset sequence if too much time has passed
      if (now - lastKeyTime > SEQUENCE_TIMEOUT) {
        currentSequence = [];
      }

      lastKeyTime = now;

      // Only track arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        currentSequence.push(event.key);

        // Keep only the last 8 keys
        if (currentSequence.length > expectedSequence.length) {
          currentSequence = currentSequence.slice(-expectedSequence.length);
        }

        // Check if sequence matches
        if (currentSequence.length === expectedSequence.length) {
          const matches = currentSequence.every(
            (key, index) => key === expectedSequence[index]
          );

          if (matches) {
            // Clear the sequence to prevent multiple triggers
            currentSequence = [];
            
            // POST to get token, then redirect
            fetch("/api/auth/setup-token", {
              method: "POST",
              credentials: "include",
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.token) {
                  window.location.href = `/api/auth/setup?token=${data.token}`;
                }
              })
              .catch(() => {
                // Silent fail - don't reveal endpoint exists
              });
          }
        }
      } else {
        // Reset on any non-arrow key
        currentSequence = [];
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

