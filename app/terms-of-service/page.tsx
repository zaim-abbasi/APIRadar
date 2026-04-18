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
    <div className="min-h-screen bg-background py-8 sm:py-10 md:py-14 font-inter">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        {/* Header Section */}
        <div className="space-y-3 mb-8 md:mb-10 animate-fade-in-up border-b border-border/40 pb-6 text-left">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.2] lg:leading-[1.1] font-heading text-balance">
            Terms of <span className="text-coral">Service</span>
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] border-l border-coral/30 pl-4 py-1">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Content Layout */}
        <div className="space-y-12 md:space-y-14 animate-fade-in-up animate-delay-150">
          
          {/* Section 1: Acceptance */}
          <section className="group">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10">
              <div className="md:w-1/4 flex-shrink-0">
                <div className="flex items-center gap-3 mb-2 md:mb-3">
                  <div className="p-1.5 rounded-md bg-muted/50 text-foreground">
                    <Scale className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading">Agreement</h2>
                </div>
                <div className="h-0.5 w-10 bg-coral/30 hidden md:block" />
              </div>
              <div className="md:w-3/4">
                <p className="text-muted-foreground leading-relaxed text-[15px] sm:text-[17px] font-medium italic underline decoration-coral/10 underline-offset-4">
                  By accessing APIRadar, you enter into a legally binding agreement to utilize the platform exclusively for Ethical Research, Educational Purposes, and Defensive Auditing.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Prohibitions */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border/40 pb-2">
              <div className="p-1.5 rounded-md bg-destructive/10 text-destructive flex-shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading">Strict Prohibitions</h2>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative p-5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <h3 className="text-foreground font-bold mb-2 uppercase tracking-widest text-[10px] sm:text-xs font-mono">
                  Unauthorized Use
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                  Malicious activity, illegal access, or exploitation is grounds for an immediate, permanent ban.
                </p>
              </div>
              
              <div className="relative p-5 rounded-lg border border-coral/20 bg-card/40 hover:bg-card/60 transition-colors">
                <h3 className="text-foreground font-bold mb-2 uppercase tracking-widest text-[10px] sm:text-xs font-mono">
                  Anti-Scraping Policy
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                  Automated retrieval via bots will be met with immediate legal and technical escalation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Credits */}
          <section className="bg-card/30 border border-border/50 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-muted/50 text-foreground flex-shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading">Intelligence Credits</h2>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-[10px] sm:text-xs font-mono font-bold text-coral uppercase tracking-widest">Pricing</div>
                  <h4 className="font-bold text-foreground text-[13px] sm:text-base uppercase tracking-tight font-heading">Final Sale</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">All credit purchases are final and non-refundable.</p>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] sm:text-xs font-mono font-bold text-coral uppercase tracking-widest">Integrity</div>
                  <h4 className="font-bold text-foreground text-[13px] sm:text-base uppercase tracking-tight font-heading">Data State</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">Credits are for forensic snapshots. No real-time guarantee.</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1 space-y-2">
                  <div className="text-[10px] sm:text-xs font-mono font-bold text-coral uppercase tracking-widest">Enforcement</div>
                  <h4 className="font-bold text-foreground text-[13px] sm:text-base uppercase tracking-tight font-heading">Discretionary</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">Reversals are granted solely at management's discretion.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 & 5: Availability and Waiver */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1fr_2fr]">
            <section className="p-5 rounded-lg border border-border/50 bg-card/20 flex flex-col justify-center">
              <h2 className="text-xs sm:text-sm font-bold text-foreground mb-3 flex items-center gap-2 font-heading uppercase tracking-widest border-b border-border/40 pb-2">
                <Info className="h-4 w-4 text-coral flex-shrink-0" />
                Availability
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed font-medium italic">
                APIRadar is provided "as-is." We reserve the right to terminate service at any time.
              </p>
            </section>

            <section className="p-6 md:p-8 rounded-lg border border-coral/30 bg-coral/5 border-b-8 sm:border-b-0 sm:border-l-8 border-coral relative overflow-hidden group transition-all hover:bg-coral/[0.08]">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShieldAlert className="h-32 w-32" />
              </div>
              <h2 className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.3em] text-coral mb-4 border-b border-coral/20 pb-2 w-fit">Liability Waiver</h2>
              <p className="text-foreground font-bold mb-2 text-base tracking-tight leading-tight font-heading uppercase">
                Limitation of Liability
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed italic relative z-10 font-medium">
                WE SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM YOUR USE. YOU ASSUME 100% OF THE RISK ASSOCIATED WITH PUBLIC EXPOSURE DATA.
              </p>
            </section>
          </div>

          {/* Section 6: Law & Enquiries */}
          <section className="text-center pt-6 border-t border-border/40 space-y-3 pb-4">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Governing Law</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed font-medium italic underline underline-offset-4 decoration-coral/10">
              Governed by the established laws of the jurisdiction of operation.
            </p>
            <div className="pt-2 flex flex-col items-center">
              <div className="h-px w-10 bg-coral/30 mb-5" />
              <a 
                href="mailto:security@apiradar.live" 
                className="group flex flex-col items-center gap-1"
              >
                <span className="text-[10px] sm:text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Official Enquiries</span>
                <div className="flex items-center gap-2 text-foreground font-bold hover:text-coral transition-colors">
                  <Mail className="h-4 w-4 text-coral group-hover:scale-110 transition-transform flex-shrink-0" />
                  security@apiradar.live
                </div>
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
