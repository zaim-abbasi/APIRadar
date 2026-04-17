"use client";

import React, { useState, useEffect } from "react";
import { Send, LogIn, MessageSquarePlus } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { FeatureRequestDialog } from "@/components/feature-request-success-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchProviderStats } from "@/lib/api";

export function LiveStats({ latestLeakAt }: { latestLeakAt?: string | Date }) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [totalLeaks, setTotalLeaks] = useState(0);

  useEffect(() => {
    const fetchTotal = () => {
      fetchProviderStats().then((res) => {
        if (res.data) setTotalLeaks(res.data.reduce((acc, curr) => acc + curr.count, 0));
      });
    };
    
    fetchTotal();
    const interval = setInterval(fetchTotal, 60000); // 1 min poll
    return () => clearInterval(interval);
  }, []);

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
    <div className="flex items-center gap-2 sm:gap-3.5">
      <div className="hidden sm:inline-flex items-center gap-2.5">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="inline-flex rounded-full h-1.5 w-1.5 bg-muted-foreground/60"></span>
        </span>
        <span className="text-[13px] text-muted-foreground font-medium whitespace-nowrap">
          Latest Detection:{" "}
          <span className="text-foreground font-bold tabular-nums inline-block min-w-[55px]">
            {formatTime(secondsAgo)}
          </span>
        </span>
      </div>
      
      <span className="hidden sm:inline-block text-border font-light">|</span>
      
      <div className={`hidden sm:inline-flex items-center gap-2.5 transition-opacity duration-500 ${totalLeaks === 0 ? "opacity-0" : "opacity-100"}`}>
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="inline-flex rounded-full h-1.5 w-1.5 bg-muted-foreground/60"></span>
        </span>
        <span className="text-[13px] text-muted-foreground font-medium whitespace-nowrap">
          <span className="text-foreground font-bold tabular-nums inline-block min-w-[24px]">
            {totalLeaks.toLocaleString()}
          </span>{" "}
          leaks detected
        </span>
      </div>
    </div>
  );
}

export function FeatureRequestForm() {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [showDialog, setShowDialog] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
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
        setIsPopoverOpen(false);
        setStatus("idle");
        return;
      }

      if (!response.ok) {
        setDialogVariant("error");
        setShowDialog(true);
        setIsPopoverOpen(false);
        setStatus("idle");
        return;
      }

      setText("");
      setStatus("success");
      setDialogVariant("success");
      setShowDialog(true);
      setIsPopoverOpen(false);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setDialogVariant("error");
      setShowDialog(true);
      setIsPopoverOpen(false);
      setStatus("idle");
    }
  };

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button className="group relative flex h-8 items-center justify-center px-3.5 text-[11px] font-bold text-coral uppercase tracking-[0.18em] rounded-md bg-coral/5 hover:bg-coral/10 transition-all duration-300 border border-coral/20 hover:border-coral/40 shadow-sm active:scale-95">
            Suggest Feature
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-5 bg-card/98 backdrop-blur-xl border border-border/60 shadow-2xl" side="bottom" align="end">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
          >
            <div className="space-y-2">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-coral" />
                Shape APIRadar
              </h4>
              <p className="text-sm text-muted-foreground leading-snug">
                APIRadar evolves with you. We&apos;re constantly improving based on your feedback—tell us what we should build next.
              </p>
            </div>
            
            <div className="flex gap-3 items-end">
              <textarea
                maxLength={150}
                disabled={!isAuthenticated || status === "loading"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  isAuthenticated
                    ? "Type your request (e.g., 'Add Cloudflare feed')..."
                    : "Sign in to suggest features"
                }
                rows={2}
                className="h-24 w-full appearance-none rounded-md border border-coral/20 bg-background/40 px-3.5 py-3 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 focus:border-coral/60 focus:outline-none focus:ring-0 focus:!ring-offset-0 resize-none leading-relaxed"
              />
              <button
                type="submit"
                disabled={status === "loading" || (isAuthenticated && !text.trim())}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-coral/30 bg-coral/10 text-coral transition-all hover:bg-coral/20 active:scale-90 disabled:opacity-50"
                title={!isAuthenticated ? "Sign in to send" : "Send request"}
              >
                {!isAuthenticated ? (
                  <LogIn className="h-4 w-4" />
                ) : (
                  <Send className={`h-4 w-4 ${status === "success" ? "text-green-500" : ""}`} />
                )}
              </button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
      <FeatureRequestDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        variant={dialogVariant}
      />
    </>
  );
}
