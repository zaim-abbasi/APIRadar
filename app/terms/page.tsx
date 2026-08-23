import React from "react";
import { Metadata } from "next";
import { Scale, ShieldAlert, Info, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | APIRadar",
  description: "Read our terms of service regarding the use of APIRadar for authorized security research and defensive intelligence.",
};

export default function TermsPage() {
  const lastUpdated = "June 15, 2026";

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

        {/* Content Layout in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 animate-fade-in-up animate-delay-150">
          
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5">
            {/* Section 1: Agreement */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Scale className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Agreement</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm italic">
                By accessing APIRadar, you enter into a legally binding agreement to utilize the platform exclusively for Ethical Research, Educational Purposes, and Defensive Auditing.
              </p>
            </section>

            {/* Section 2: Prohibitions */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5 sm:gap-3 border-b border-border/40 pb-2">
                <ShieldAlert className="h-4 sm:h-5 w-4 sm:w-5 text-destructive flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Prohibitions</h2>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 rounded-md border border-destructive/20 bg-destructive/5">
                  <h3 className="text-foreground font-bold mb-1 uppercase tracking-widest text-[11px] sm:text-xs font-mono">
                    Unauthorized & Malicious Use
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Any malicious activity, illegal access, exploitation, or scanning of targets without prior written authorization is grounds for an immediate ban. You assume sole legal liability for your actions.
                  </p>
                </div>
                
                <div className="p-3 rounded-md border border-destructive/20 bg-destructive/5">
                  <h3 className="text-foreground font-bold mb-1 uppercase tracking-widest text-[11px] sm:text-xs font-mono">
                    No Key Resale or Sublicensing
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    You are strictly prohibited from reselling, sublicensing, sharing, renting, or transferring API keys, credentials, or intelligence data feeds to any third party.
                  </p>
                </div>

                <div className="p-3 rounded-md border border-amber-500/20 bg-card/40">
                  <h3 className="text-foreground font-bold mb-1 uppercase tracking-widest text-[11px] sm:text-xs font-mono">
                    Anti-Scraping Policy
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Automated retrieval via bots will be met with immediate technical blocking and legal escalation.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-5">
            {/* Section 3: Liability & Indemnification */}
            <section className="p-4 sm:p-5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/[0.08] transition-all duration-200 space-y-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <ShieldAlert className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Liability & Indemnity</h2>
              </div>
              
              <div className="space-y-2.5 text-sm">
                <div>
                  <h3 className="text-foreground font-bold text-xs uppercase font-mono opacity-80 mb-0.5">
                    Limitation of Liability
                  </h3>
                  <p className="text-muted-foreground leading-relaxed italic">
                    APIRadar and its operators assume zero liability for any direct, indirect, or consequential damages. You assume 100% of the risk associated with public exposure intelligence data.
                  </p>
                </div>

                <div className="border-t border-amber-500/20 pt-2">
                  <h3 className="text-foreground font-bold text-xs uppercase font-mono opacity-80 mb-0.5">
                    Hold Harmless & Indemnity
                  </h3>
                  <p className="text-muted-foreground leading-relaxed italic">
                    You agree to defend, indemnify, and hold harmless APIRadar and its developers from any claims, lawsuits, losses, or legal fees resulting from your use, misuse, sharing of API keys, or breach of these terms.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4: Availability */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Info className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Availability</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                APIRadar is provided "as-is" and "as-available." We reserve the right to modify, restrict, or terminate service at any time without notice.
              </p>
            </section>

            {/* Section 5: Governing Law */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Mail className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Governing Law</h2>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-2">
                Governed by the laws of the jurisdiction of operation.
              </p>
              <div className="flex flex-col gap-0.5 border-t border-border/40 pt-2">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Enquiries</span>
                <a 
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=zaim.k.abbasi@gmail.com&su=API%20Radar%20Terms%20Enquiry" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground font-bold hover:text-amber-500 transition-colors flex items-center gap-1.5"
                >
                  zaim.k.abbasi@gmail.com
                </a>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
