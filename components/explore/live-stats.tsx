"use client";

import React, { useState, useEffect } from "react";
import { Send, LogIn } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { FeatureRequestDialog } from "@/components/feature-request-success-dialog";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Offline");
    return res.json();
  });

export function LiveStats({ latestLeakAt }: { latestLeakAt?: string | Date }) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [researchers, setResearchers] = useState(0);

  const {
    data: stats,
    error,
    isLoading: isSWRLoading,
  } = useSWR("/api/stats/live", fetcher, {
    refreshInterval: 15000,
    dedupingInterval: 5000,
    revalidateOnFocus: true,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    if (stats?.activeResearchers && !error) {
      setResearchers(stats.activeResearchers);
    } else if (!isSWRLoading || error) {
      setResearchers(0);
    }
  }, [stats, isSWRLoading, error]);

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

    return () => {
      clearInterval(timerInterval);
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
      <div
        className={`hidden sm:inline-flex items-center gap-2 text-muted-foreground transition-all duration-1000 ${researchers === 0 ? "opacity-60" : ""}`}
      >
        <span
          className={`transition-colors duration-500 ${researchers === 0 ? "text-red-500/50" : "text-muted-foreground"}`}
        >
          ●
        </span>
        <span className="font-medium">
          {researchers === 0
            ? "0 researchers active (Link Severed)"
            : `${researchers} researchers active`}
        </span>
      </div>
    </>
  );
}

export function FeatureRequestForm() {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogVariant, setDialogVariant] = useState<
    "success" | "rate-limit" | "error"
  >("success");
  const isAuthenticated = !!session?.user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      signIn("google", { callbackUrl: window.location.href });
      return;
    }
    if (!text.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const response = await fetch("/api/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user?.email, text }),
      });

      if (response.status === 429) {
        setDialogVariant("rate-limit");
        setShowDialog(true);
        setStatus("idle");
        return;
      }

      if (!response.ok) {
        setDialogVariant("error");
        setShowDialog(true);
        setStatus("idle");
        return;
      }

      setText("");
      setStatus("success");
      setDialogVariant("success");
      setShowDialog(true);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setDialogVariant("error");
      setShowDialog(true);
      setStatus("idle");
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 items-center gap-2 sm:flex-initial"
      >
        <input
          type="text"
          maxLength={150}
          disabled={!isAuthenticated || status === "loading"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isAuthenticated
              ? "Request a provider or feature..."
              : "Sign in to suggest features"
          }
          className="h-8 w-full min-w-0 sm:w-64 appearance-none rounded-md border border-amber-500/30 bg-background bg-clip-padding px-3 py-1.5 text-xs sm:text-sm text-foreground transition-colors placeholder:text-muted-foreground outline-none focus:outline-none focus:border-amber-500 focus:!ring-0 focus:!ring-offset-0 focus:!shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading" || (isAuthenticated && !text.trim())}
          className="flex h-8 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 px-3 text-xs sm:text-sm text-amber-500 transition-colors hover:bg-amber-500/20 outline-none focus:outline-none focus:border-amber-500 focus:!ring-0 focus:!ring-offset-0 focus:!shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!isAuthenticated ? (
            <LogIn className="h-3.5 w-3.5 sm:mr-1.5" />
          ) : (
            <Send className="h-3.5 w-3.5 sm:mr-1.5" />
          )}
          <span className="hidden sm:inline">
            {!isAuthenticated
              ? "Sign in"
              : status === "success"
                ? "Sent"
                : "Send"}
          </span>
        </button>
      </form>
      <FeatureRequestDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        variant={dialogVariant}
      />
    </>
  );
}
