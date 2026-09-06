import React from "react";
import { Metadata } from "next";
import { Scale, ShieldAlert, Info, Gavel, FileText, UserCheck, Sparkles, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | APIRadar",
  description: "Read our terms of service regarding the use of APIRadar for authorized security research and defensive intelligence.",
};

export default function TermsPage() {
  const lastUpdated = "September 7, 2026";

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 md:py-14 font-inter">
      <div className="container mx-auto px-3 sm:px-6 max-w-6xl">
        {/* Header Section */}
        <div className="space-y-2 sm:space-y-3 mb-5 sm:mb-8 animate-fade-in-up border-b border-border/40 pb-4 sm:pb-5 text-left">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight lg:leading-[1.1] font-heading text-balance">
            Terms of <span className="text-amber-500">Service</span>
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] border-l border-amber-500/30 pl-3 sm:pl-4 py-1">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* 3x3 Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-fade-in-up animate-delay-150 items-stretch">
          
          {/* Column 1 */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Section 1: Research Terms */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Scale className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Research Terms</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By accessing APIRadar, you agree to utilize all indexed metadata strictly for authorized security research, educational auditing, and defensive risk mitigation.
              </p>
            </section>

            {/* Section 2: Availability */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Info className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">AS-IS Tool Notice</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                APIRadar is provided strictly "AS-IS" and "AS-AVAILABLE" without warranties of accuracy, completeness, or uptime. We reserve the right to restrict access or terminate services without notice.
              </p>
            </section>

            {/* Section 3: No Fiduciary Relationship */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <UserCheck className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">No Fiduciary Duty</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use of APIRadar does not create a security consulting, advisory, managed SOC, or fiduciary relationship. APIRadar is not a paid security monitoring provider.
              </p>
            </section>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Section 4: Prohibitions */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 border-b border-destructive/20 pb-2 mb-2 sm:mb-3">
                <ShieldAlert className="h-4 sm:h-5 w-4 sm:w-5 text-destructive flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Strict Prohibitions</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Executing, testing, exploiting, or consuming exposed API credentials without explicit authorization is strictly illegal. Automated scraping or dataset reselling results in immediate IP bans.
              </p>
            </section>

            {/* Section 5: DMCA & Safe Harbor Takedowns */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <FileText className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">DMCA Safe Harbor</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                APIRadar acts as a passive indexer of public GitHub metadata in good faith. Organizations seeking metadata removal may submit takedown requests subject to authorization verification.
              </p>
            </section>

            {/* Section 6: Irrevocable Feedback License */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Sparkles className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Feedback License</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Any feature requests, bug reports, code contributions, or suggestions submitted by users become the exclusive intellectual property of APIRadar without royalty or compensation claims.
              </p>
            </section>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Section 7: Zero Liability */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/[0.08] transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 border-b border-amber-500/20 pb-2 mb-2 sm:mb-3">
                <Shield className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Zero Liability</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The authors, maintainers, and developers of APIRadar assume zero liability for any direct, indirect, punitive, or consequential damages, security breaches, or API billing charges.
              </p>
            </section>

            {/* Section 8: Indemnification */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/[0.08] transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 border-b border-amber-500/20 pb-2 mb-2 sm:mb-3">
                <ShieldAlert className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Indemnification</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You agree to defend, indemnify, and hold harmless APIRadar and its creators against any third-party claims, lawsuits, legal fees, or liabilities resulting from your use of this software or data.
              </p>
            </section>

            {/* Section 9: Severability & Governing Law */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Gavel className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Severability & Law</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Governed by the jurisdiction of operation. If any provision is held invalid by a court, all remaining disclaimers remain 100% legally active.
              </p>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
