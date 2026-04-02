"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";

export function LiveStats({ latestLeakAt }: { latestLeakAt?: string | Date }) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [researchers, setResearchers] = useState(142); // Initial value between 90-150

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  useEffect(() => {
    // Timer Effect
    const updateTimer = () => {
      if (!latestLeakAt) {
        setSecondsAgo(0);
        return;
      }
      const diff = Math.floor(
        (Date.now() - new Date(latestLeakAt).getTime()) / 1000,
      );
      setSecondsAgo(Math.max(0, diff));
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    // Researchers fake oscillation Effect
    const researchersInterval = setInterval(() => {
      setResearchers((prev) => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        return Math.min(150, Math.max(90, prev + change));
      });
    }, 4500); // adjust every 4.5s

    return () => {
      clearInterval(timerInterval);
      clearInterval(researchersInterval);
    };
  }, [latestLeakAt]);

  return (
    <>
      <div className="hidden sm:inline-flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-50"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-coral"></span>
        </span>
        <span className="font-medium text-foreground/90">
          Latest Detection: {formatTime(secondsAgo)}
        </span>
      </div>
      <div className="hidden sm:inline-flex items-center gap-2 text-muted-foreground">
        <span>●</span>
        <span className="font-medium">{researchers} researchers active</span>
      </div>
    </>
  );
}

export function WatchlistShortcut() {
  return (
    <button className="flex items-center gap-1.5 text-muted-foreground sm:hover:text-foreground transition-colors cursor-pointer">
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search / Filter</span>
      <span className="sm:hidden">Search</span>
    </button>
  );
}
