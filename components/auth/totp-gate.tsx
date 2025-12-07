"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TOTP Gate Component
 * Shows a security dialog on page load requiring TOTP verification
 * Blocks access until valid TOTP code is entered
 * Matches API Radar's exact design system
 */
export function TOTPGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check session FIRST before showing dialog to prevent flash
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/check-totp-session", {
          method: "GET",
          credentials: "include",
          cache: "no-store", // Prevent caching
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.verified) {
            setIsVerified(true);
            setIsOpen(false);
            setIsCheckingSession(false);
            return;
          }
        }
      } catch (err) {
        // If check fails, show dialog
        console.error("Session check error:", err);
      }
      
      // Only show dialog if not verified
      setIsCheckingSession(false);
      setIsOpen(true);
    };

    checkSession();
  }, []);

  const handleVerify = async () => {
    // Client-side validation
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    // Prevent multiple simultaneous requests
    if (isVerifying) {
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-totp-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid code. Please try again.");
        setIsVerifying(false);
        return;
      }

      // Success - server sets httpOnly cookie
      // Wait a moment for cookie to be set, then verify session
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the session was set
      const verifyResponse = await fetch("/api/auth/check-totp-session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        if (verifyData.verified) {
          setIsVerified(true);
          setIsOpen(false);
          return;
        }
      }
      
      // If verification fails, reload to ensure cookie is properly set
      window.location.reload();
    } catch (err) {
      setError("Network error. Please try again.");
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(value);
    setError("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && code.length === 6) {
      handleVerify();
    }
  };

  // Don't render anything while checking session or if verified
  if (isCheckingSession || isVerified) {
    return null;
  }

  return (
    <>
      {/* Blur overlay blocking content - matches API Radar backdrop */}
      <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80" />
      
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent 
          className={cn(
            "sm:max-w-md z-50",
            "border-border/40 shadow-sm",
            "animate-fade-in-up",
            "focus:outline-none focus-visible:outline-none",
            "ring-0 focus-visible:ring-0 focus:ring-0",
            "outline-none"
          )}
          onPointerDownOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
        <DialogHeader className="text-center space-y-3">
          {/* API Radar branding - text only */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-extrabold tracking-tight flex items-center gap-1">
              <span className="text-destructive">API</span>
              <span className="text-foreground"> Radar</span>
            </span>
          </div>
          
          <DialogTitle className="text-xl font-semibold leading-tight tracking-tight text-foreground text-center">
            Authentication Required
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center">
            Enter your 6-digit authentication code to access this platform
          </DialogDescription>
        </DialogHeader>

        {/* FOMO Section - Better formatted and placed */}
        <div className="bg-muted/40 border-l-3 border-primary/30 rounded-md p-3 space-y-2.5">
          <div className="text-center space-y-1.5">
            <p className="text-lg leading-tight text-foreground font-medium" dir="rtl" style={{ fontFamily: 'serif' }}>
              "وَلَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ"
            </p>
            <p className="text-[11px] text-muted-foreground/85 italic leading-tight">
              "And do not consume one another's wealth unjustly" — Quran 2:188
            </p>
          </div>
        </div>

        <div className="space-y-3 py-1">
          {error && (
            <Alert 
              variant="destructive" 
              className={cn(
                "border-destructive/50 text-destructive",
                "bg-background rounded-md",
                "p-2"
              )}
            >
              <AlertDescription className="text-sm text-destructive font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              onKeyPress={handleKeyPress}
              placeholder="000000"
              className={cn(
                "text-center text-lg font-mono tracking-[0.5em] h-10",
                "border-input bg-background",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:ring-offset-0",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              autoFocus
              autoComplete="one-time-code"
              disabled={isVerifying}
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying}
            className={cn(
              "w-full h-10 rounded-md",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "font-semibold transition-all duration-200 ease-in-out",
              "focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:pointer-events-none",
              "shadow-sm hover:shadow-md active:scale-[0.98]"
            )}
            size="default"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Need to configure TOTP? For assistance, contact: <a href="mailto:zaim.k.abbasi@gmail.com" className="text-primary hover:underline">zaim.k.abbasi@gmail.com</a>
          </p>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}

