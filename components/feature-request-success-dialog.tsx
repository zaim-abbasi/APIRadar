"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "success" | "rate-limit" | "error";
}

export function FeatureRequestDialog({
  open,
  onOpenChange,
  variant = "success",
}: FeatureRequestDialogProps) {
  const content = {
    success: {
      title: "Request Received",
      body1: "Thank you for your suggestion!",
      body2:
        "Our team will review your feature request or provider addition shortly.",
      themeColor: "text-foreground",
    },
    "rate-limit": {
      title: "Limit Reached",
      body1: "Too many requests sent recently.",
      body2:
        "Please wait an hour before sending more suggestions to prevent spam.",
      themeColor: "text-red-500",
    },
    error: {
      title: "System Error",
      body1: "We couldn't process your request.",
      body2: "Please try again later.",
      themeColor: "text-red-500",
    },
  }[variant];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] bg-card/60 backdrop-blur-sm border-border/50 p-0 gap-0 shadow-lg overflow-hidden">
        <DialogHeader className="p-5 pb-5 text-center">
          <DialogTitle
            className={`text-base font-semibold tracking-tight text-center ${content.themeColor}`}
          >
            {content.title}
          </DialogTitle>
          <div className="mt-3 text-[13px] leading-relaxed text-muted-foreground/90 bg-muted/25 p-3 rounded-md border border-border/40 text-center">
            <p className="mb-1.5 font-medium">{content.body1}</p>
            <p>{content.body2}</p>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
