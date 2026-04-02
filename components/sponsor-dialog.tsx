"use client";

import React, { useState } from "react";
import { Copy, Check, Heart, Wallet, Bitcoin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SponsorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WALLETS = {
  TRX: {
    name: "Tron (TRC20)",
    address: "TK4K1pkBHRe5akFKWNaaGB4pyz7hKPENzD",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    icon: Wallet,
    warning:
      "Only send USDT (TRC20) to this address. Sending other assets like TRX may result in permanent loss.",
  },
  BTC: {
    name: "Bitcoin",
    address: "15VucjXj6dzqm2PREaR3izZrvC9YmuykTS",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    icon: Bitcoin,
    warning:
      "Only send BTC to this address. Sending any other asset may result in permanent loss.",
  },
};

export function SponsorDialog({ open, onOpenChange }: SponsorDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast.error("Failed to copy address");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] bg-card/60 backdrop-blur-sm border-border/50 p-0 gap-0 shadow-lg overflow-hidden">
        <DialogHeader className="p-5 pb-0 text-center">
          <DialogTitle className="text-base font-semibold tracking-tight text-center">
            Sponsor APIRadar
          </DialogTitle>
          <div className="mt-3 text-[13px] leading-relaxed text-muted-foreground/90 bg-muted/25 p-3 rounded-md border border-border/40 text-left">
            <p className="mb-1.5">• Covering monthly costs of 24/7 scanning.</p>
            <p>• Funding compute for new AI provider detection.</p>
          </div>
        </DialogHeader>

        <div className="px-5 pb-5 pt-4">
          <Tabs defaultValue="TRX" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-9 bg-card/30 border border-border/50 p-1">
              <TabsTrigger value="TRX" className="text-xs font-medium py-1">
                Tron (TRC20)
              </TabsTrigger>
              <TabsTrigger value="BTC" className="text-xs font-medium py-1">
                Bitcoin
              </TabsTrigger>
            </TabsList>

            {Object.entries(WALLETS).map(([key, wallet]) => (
              <TabsContent
                key={key}
                value={key}
                className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-1 duration-200"
              >
                <div className="flex flex-col items-center gap-4">
                  {/* QR Code Container - Compact */}
                  <div className="p-2 bg-white rounded-md border border-border/10 shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${wallet.address}&bgcolor=ffffff`}
                      alt={`${wallet.name} QR Code`}
                      className="w-[120px] h-[120px] object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Address Display */}
                  <div className="w-full space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Deposit Address</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/20 font-medium",
                          wallet.color,
                        )}
                      >
                        <wallet.icon className="w-3 h-3" />
                        {wallet.name}
                      </span>
                    </div>

                    <div
                      className="group relative flex items-center gap-2 p-2 rounded-md border border-border/50 bg-card/40 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => handleCopy(wallet.address, key)}
                    >
                      <code className="text-[12px] leading-tight break-all font-mono text-muted-foreground group-hover:text-foreground transition-colors flex-1">
                        {wallet.address}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        {copied === key ? (
                          <Check className="h-3 w-3 text-coral" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-[11px] text-center text-amber-500/90 bg-amber-500/5 border border-amber-500/10 rounded-md p-2 mt-1 mx-2">
                    {wallet.warning}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
