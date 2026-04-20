import React from "react";
import { Metadata } from "next";
import { Hammer, Scale, ShieldAlert, Lock, Info, Gavel, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | APIRadar",
  description: "Read our terms of service regarding the use of APIRadar for authorized security research and defensive intelligence.",
};

export default function TermsPage() {
  const lastUpdated = "April 18, 2026";

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 md:py-14 font-inter">
      <div className="container mx-auto px-3 sm:px-6 max-w-4xl">
        {/* Header Section */}
        <div className="space-y-2 sm:space-y-3 mb-5 sm:mb-8 animate-fade-in-up border-b border-border/40 pb-4 sm:pb-5 text-left">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight lg:leading-[1.1] font-heading text-balance">
            Terms of <span className="text-amber-500">Service</span>
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] border-l border-amber-500/30 pl-3 sm:pl-4 py-1">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Content Layout */}
        <div className="space-y-5 md:space-y-6 animate-fade-in-up animate-delay-150">
          
          {/* Section 1: Acceptance */}
          <section className="group">
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-10">
              <div className="md:w-1/4 flex-shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5 sm:mb-3">
                  <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-foreground flex-shrink-0" />
                  <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground font-heading uppercase sm:normal-case">Agreement</h2>
                </div>
                <div className="h-0.5 w-10 bg-amber-500/30 hidden md:block" />
              </div>
              <div className="md:w-3/4">
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-[17px] font-medium italic underline decoration-amber-500/10 underline-offset-4">
                  By accessing APIRadar, you enter into a legally binding agreement to utilize the platform exclusively for Ethical Research, Educational Purposes, and Defensive Auditing.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Prohibitions */}
          <section className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2.5 sm:gap-3 border-b border-border/40 pb-2">
              <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground font-heading uppercase sm:normal-case">Prohibitions</h2>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative p-4 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <h3 className="text-foreground font-bold mb-1.5 uppercase tracking-widest text-[10px] sm:text-xs font-mono">
                  Unauthorized Use
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                  Malicious activity, illegal access, or exploitation is grounds for an immediate, permanent ban.
                </p>
              </div>
              
              <div className="relative p-4 rounded-lg border border-amber-500/20 bg-card/40 hover:bg-card/60 transition-colors">
                <h3 className="text-foreground font-bold mb-1.5 uppercase tracking-widest text-[10px] sm:text-xs font-mono">
                  Anti-Scraping Policy
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                  Automated retrieval via bots will be met with immediate legal and technical escalation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Credits & Refund Policy */}
          <section className="bg-card/30 border border-border/50 rounded-lg overflow-hidden">
            <div className="p-4 sm:p-5 md:p-6 space-y-5">
              {/* Intelligence Credits */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-foreground flex-shrink-0" />
                  <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground font-heading uppercase sm:normal-case">Intelligence Credits</h2>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="text-[10px] sm:text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">Pricing</div>
                    <h4 className="font-bold text-foreground text-sm sm:text-base uppercase tracking-tight font-heading">Final Sale</h4>
                    <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed font-medium">All credit purchases are final and non-refundable.</p>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="text-[10px] sm:text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">Integrity</div>
                    <h4 className="font-bold text-foreground text-sm sm:text-base uppercase tracking-tight font-heading">Data State</h4>
                    <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed font-medium">Credits are for forensic snapshots. No real-time guarantee.</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1 space-y-1 sm:space-y-1.5 pt-2 sm:pt-0 border-t border-border/40 sm:border-t-0">
                    <div className="text-[10px] sm:text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">Enforcement</div>
                    <h4 className="font-bold text-foreground text-sm sm:text-base uppercase tracking-tight font-heading">Discretionary</h4>
                    <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed font-medium">Reversals are granted solely at management's discretion.</p>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border/40" />

              {/* Refund Policy Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <Hammer className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0" />
                  <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground font-heading uppercase sm:normal-case">Refund Policy</h2>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium italic">
                  Due to the digital nature of Intelligence Credits, all sales are final. Once credits are issued to an account, they are non-refundable. We provide sample data on the 'Explore' page to ensure users understand the product value before purchasing.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 & 5: Availability and Waiver */}
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_2fr]">
            <section className="p-3.5 sm:p-4 rounded-lg border border-border/50 bg-card/20 flex flex-col justify-center">
              <h2 className="text-[10px] sm:text-sm font-bold text-foreground mb-2 flex items-center gap-2 font-heading uppercase tracking-widest border-b border-border/40 pb-2">
                <Info className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                Availability
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed font-medium italic">
                APIRadar is provided "as-is." We reserve the right to terminate service at any time.
              </p>
            </section>

            <section className="p-4 sm:p-5 md:p-6 rounded-lg border border-amber-500/30 bg-amber-500/5 border-b-6 sm:border-b-0 sm:border-l-6 border-amber-500 relative overflow-hidden group transition-all hover:bg-amber-500/[0.08]">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldAlert className="h-16 w-16 sm:h-24 sm:w-24" />
              </div>
              <h2 className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-amber-500 mb-2 sm:mb-3 border-b border-amber-500/20 pb-1.5 sm:pb-2 w-fit">Liability Waiver</h2>
              <p className="text-foreground font-bold mb-1 sm:mb-1.5 text-sm sm:text-base tracking-tight leading-tight font-heading uppercase">
                Limitation of Liability
              </p>
              <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed italic relative z-10 font-medium">
                WE SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM YOUR USE. YOU ASSUME 100% OF THE RISK ASSOCIATED WITH PUBLIC EXPOSURE DATA.
              </p>
            </section>
          </div>

          {/* Footer Grid: Law & Entity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 border-t border-border/40 pt-4">
            {/* Governing Law Card */}
            <div className="p-3 sm:p-3.5 rounded-lg border border-border/50 bg-card/20 flex flex-col items-center justify-center text-center">
              <h2 className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-1">Governing Law</h2>
              <p className="text-[13px] sm:text-sm text-foreground font-medium leading-relaxed mb-1.5">
                Governed by the laws of the jurisdiction of operation.
              </p>
              <div className="h-px w-6 bg-amber-500/30 mb-1.5" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Enquiries</span>
                <a href="mailto:contact@apiradar.live" className="text-[13px] sm:text-sm text-foreground font-bold hover:text-amber-500 transition-colors flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-amber-500" />
                  contact@apiradar.live
                </a>
              </div>
            </div>

            {/* Legal Entity Card */}
            <div className="p-3 sm:p-3.5 rounded-lg border border-border/50 bg-card/20 flex flex-col items-center justify-center text-center">
              <h2 className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-1">Legal Entity</h2>
              <p className="text-[13px] sm:text-sm text-foreground font-medium leading-relaxed">
                APIRadar is a trading name of
              </p>
              <p className="text-sm sm:text-base font-bold text-amber-500 uppercase tracking-tight">
                Zaim Abbasi
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
