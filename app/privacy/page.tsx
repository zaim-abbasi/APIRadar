import React from "react";
import { Metadata } from "next";
import { Shield, Database, Users, Fingerprint, ExternalLink, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | APIRadar",
  description: "Learn how APIRadar handles your data and protects your privacy while using our real-time API exposure intelligence platform.",
};

export default function PrivacyPage() {
  const lastUpdated = "April 18, 2026";

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 md:py-14 font-inter">
      <div className="container mx-auto px-3 sm:px-6 max-w-4xl">
        {/* Header Section */}
        <div className="space-y-2 sm:space-y-3 mb-5 sm:mb-8 animate-fade-in-up border-b border-border/40 pb-4 sm:pb-5 text-left">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight lg:leading-[1.1] font-heading text-balance">
            Privacy <span className="text-amber-500">Policy</span>
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] border-l border-amber-500/30 pl-3 sm:pl-4 py-1">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_260px] gap-6 lg:gap-6 animate-fade-in-up animate-delay-150">
          <div className="order-2 lg:order-1 space-y-5 md:space-y-6">
            {/* Protocol Section */}
            <section className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Fingerprint className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground font-heading uppercase sm:normal-case">Data Minimization</h2>
              </div>
              <div className="relative p-3 sm:p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                <p className="text-muted-foreground leading-relaxed text-[13px] sm:text-base relative z-10 font-medium italic">
                  APIRadar operates on a principle of Data Minimization. We do not collect or store sensitive personal information beyond what is strictly required for platform authentication and service delivery.
                </p>
              </div>
            </section>

            {/* Collection Section */}
            <section className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Database className="h-4 w-4 sm:h-5 sm:w-5 text-foreground flex-shrink-0" />
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground font-heading uppercase sm:normal-case">Information Collection</h2>
              </div>
              
              <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="p-3 sm:p-3.5 rounded-lg border border-border/50 bg-card/30 transition-colors hover:bg-card/40">
                  <h3 className="text-foreground font-bold mb-1 flex items-center gap-2 text-[9px] sm:text-xs uppercase tracking-widest font-heading opacity-80">
                    <span className="h-1.5 w-1.5 rounded-md bg-amber-500" />
                    Primary Identity
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Full Name and Email Address retrieved via Google OAuth.
                  </p>
                </div>
                
                <div className="p-3 sm:p-3.5 rounded-lg border border-border/50 bg-card/30 transition-colors hover:bg-card/40">
                  <h3 className="text-foreground font-bold mb-1 flex items-center gap-2 text-[9px] sm:text-xs uppercase tracking-widest font-heading opacity-80">
                    <span className="h-1.5 w-1.5 rounded-md bg-amber-500" />
                    Usage Data
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Intelligence Credit balance and transaction history.
                  </p>
                </div>

                <div className="sm:col-span-2 lg:col-span-1 p-2.5 sm:p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-[9px] sm:text-[11px] font-mono uppercase tracking-widest text-muted-foreground/80">
                  Note: We do not store profile imagery, residential addresses, or passwords.
                </div>
              </div>
            </section>

            {/* Third-Party Section */}
            <section className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 text-foreground flex-shrink-0" />
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground font-heading uppercase sm:normal-case">Third-Party Processing</h2>
              </div>
              <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
                <div className="p-3 rounded-lg border border-border/50 bg-card/30">
                  <h3 className="text-foreground font-bold mb-1 flex items-center gap-2 text-[9px] sm:text-[10px] uppercase tracking-widest font-heading opacity-80">
                    <span className="h-1 w-2 rounded-md bg-blue-500/50" />
                    Financials
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-relaxed">
                    Processed exclusively by Lemon Squeezy and Stripe.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border/50 bg-card/30">
                  <h3 className="text-foreground font-bold mb-1 flex items-center gap-2 text-[9px] sm:text-[10px] uppercase tracking-widest font-heading opacity-80">
                    <span className="h-1 w-2 rounded-md bg-green-500/50" />
                    Authentication
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-relaxed">
                    Managed securely via Google Identity Services.
                  </p>
                </div>
              </div>
            </section>

            {/* Disclosure Section */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 text-center space-y-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground underline underline-offset-4 decoration-amber-500/50 font-heading uppercase tracking-wide">Security Disclosure</h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                As a transparency-first platform, we host a formal <span className="text-foreground font-medium underline decoration-amber-500/30 italic">Vulnerability Disclosure Program (VDP)</span>. 
                If you represent an organization, contact our support team.
              </p>
              <div className="pt-1 flex justify-center">
                <a 
                  href="mailto:contact@apiradar.live" 
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-500 text-primary-foreground font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs hover:brightness-90 transition-all active:scale-95"
                >
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Contact Support Team
                </a>
              </div>
            </section>
          </div>

          {/* Sidebar Info (Order 1 on mobile to show it after header) */}
          <aside className="order-1 lg:order-2 space-y-4">
            <div className="flex flex-col sm:flex-row lg:flex-col lg:sticky lg:top-24 gap-4">
              <div className="flex-1 p-3.5 sm:p-4 rounded-lg border border-border/50 bg-card/30 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Users className="h-10 w-10" />
                 </div>
                <div className="flex items-center gap-2 mb-2 text-foreground font-bold text-[10px] sm:text-xs uppercase tracking-widest font-heading">
                  <Users className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  User Rights
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mb-2.5">
                  Request a full export or deletion of your account data at any time.
                </p>
                <div className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-500 uppercase tracking-[0.25em]">
                  SLA: 30 Days
                </div>
              </div>

              <div className="flex-1 lg:flex-none p-4 rounded-lg border border-border/40 bg-card/10 border-dashed flex items-center lg:block">
                <div className="text-[10px] sm:text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                  SOC-2 compliant intelligence gathering framework.
                </div>
              </div>
            </div>
          </aside>
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
  );
}
