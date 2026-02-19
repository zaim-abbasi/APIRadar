"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type TopLeaker = {
  rank: number;
  username: string;
  avatar_url: string;
  html_url: string;
  total_leaks: number;
  repos_count: number;
};

function PosterSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center justify-center gap-3 p-1",
        "animate-pulse",
        className
      )}
    >
      <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-md bg-muted/40" />
      <div className="h-4 w-32 bg-muted/40 rounded" />
    </div>
  );
}

function WantedPoster({ user, className }: { user: TopLeaker; className?: string }) {
  return (
    <a
      href={user.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex flex-col items-center text-center gap-2.5 w-fit p-1 rounded-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-200 ease-out sm:hover:-translate-y-0.5",
        className
      )}
      aria-label={`Open GitHub profile for ${user.username}`}
    >
      <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-md overflow-hidden border-2 border-destructive/40">
        <img
          src={user.avatar_url || "/logo/logo-webp.webp"}
          alt={user.username}
          className="h-full w-full object-cover grayscale brightness-90 contrast-125"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <div
          className={cn(
            "absolute top-1 right-1 rounded-sm bg-destructive px-1.5 py-0.5 text-[10px] font-mono font-bold leading-none text-destructive-foreground",
            user.rank === 1 && "animate-pulse"
          )}
        >
          #{user.rank}
        </div>
        <div className="absolute inset-0 opacity-0 sm:group-hover:opacity-100 will-change-[opacity]">
          <div className="absolute inset-0 rounded-md bg-background/60 backdrop-blur-sm" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-foreground">
            <div className="font-semibold">{user.total_leaks.toLocaleString()} leaks</div>
            <div className="text-muted-foreground">{user.repos_count.toLocaleString()} repos</div>
          </div>
        </div>
      </div>

      <div
        className="font-mono font-bold text-foreground text-sm text-center truncate max-w-[88px]"
      >
        {user.username}
      </div>

    </a>
  );
}

export const HallOfShame = React.memo(function HallOfShame({ className }: { className?: string }) {
  const [data, setData] = useState<TopLeaker[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch("/api/leaderboard/top-leakers")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((json: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(json)) {
          setData([]);
          return;
        }
        const normalized: TopLeaker[] = json
          .map((row: any) => ({
            rank: typeof row?.rank === "number" ? row.rank : 0,
            username: typeof row?.username === "string" ? row.username : "unknown",
            avatar_url: typeof row?.avatar_url === "string" ? row.avatar_url : "",
            html_url: typeof row?.html_url === "string" ? row.html_url : "",
            total_leaks: typeof row?.total_leaks === "number" ? row.total_leaks : 0,
            repos_count: typeof row?.repos_count === "number" ? row.repos_count : 0,
          }))
          .filter((r) => r.username && r.html_url);
        setData(normalized);
      })
      .catch(() => {
        if (cancelled) return;
        setData([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const posters = useMemo(() => data ?? [], [data]);

  return (
    <section
      className={cn(
        "rounded-md border border-border/50 bg-card/30 backdrop-blur-sm p-4 sm:p-5",
        className
      )}
      aria-label="Hall of Shame"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs sm:text-sm font-medium text-foreground/90 tracking-tight">
            Hall of Shame
          </div>
          <div className="text-xs text-muted-foreground/80 mt-1">
            Top 10 developers by unique leaked keys (last known public repos)
          </div>
        </div>
      </div>

       <div className="mt-4 grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 justify-items-center">
        {data === null ? (
          Array.from({ length: 10 }).map((_, i) => (
            <PosterSkeleton key={i} className={i >= 6 ? "hidden sm:inline-flex" : ""} />
          ))
        ) : posters.length ? (
          posters.map((u, i) => (
            <WantedPoster 
              key={`${u.rank}-${u.username}`} 
              user={u} 
              className={i >= 6 ? "hidden sm:inline-flex" : ""}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground">
            Scanning…
          </div>
        )}
      </div>
    </section>
  );
});


