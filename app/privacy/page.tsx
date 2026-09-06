import React from "react";
import { Metadata } from "next";
import { Database, Fingerprint, ExternalLink, Gavel, ShieldAlert, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | APIRadar",
  description: "Learn how APIRadar handles your data and protects your privacy while using our real-time API exposure intelligence platform.",
};

export default function PrivacyPage() {
  const lastUpdated = "September 7, 2026";

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 md:py-14 font-inter">
      <div className="container mx-auto px-3 sm:px-6 max-w-6xl">
        {/* Header Section */}
        <div className="space-y-2 sm:space-y-3 mb-5 sm:mb-8 animate-fade-in-up border-b border-border/40 pb-4 sm:pb-5 text-left">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight lg:leading-[1.1] font-heading text-balance">
            Privacy <span className="text-amber-500">Policy</span>
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] border-l border-amber-500/30 pl-3 sm:pl-4 py-1">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* 3-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-fade-in-up animate-delay-150 items-stretch">
          
          {/* Column 1 */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Section 1: Data Minimization */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Fingerprint className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Data Minimization</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm">
                APIRadar operates on strict Data Minimization. We do not harvest, track, or collect personal browsing data. User data is limited strictly to Google OAuth authentication tokens required for active session management.
              </p>
            </section>

            {/* Section 2: Zero Commercialization */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Lock className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Zero Commercialization</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm">
                We do not sell, rent, license, or trade user data or session records to third parties, advertisers, or data brokers.
              </p>
            </section>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Section 3: Information Collection */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5 sm:gap-3 border-b border-border/40 pb-2">
                <Database className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Stored Metadata</h2>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 rounded-md border border-border/50 bg-card/30">
                  <h3 className="text-foreground font-bold mb-1 flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest font-heading opacity-80">
                    <span className="h-1.5 w-1.5 rounded-md bg-amber-500" />
                    Identity Tokens
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Full Name and Email Address provided by Google OAuth.
                  </p>
                </div>

                <div className="p-2.5 sm:p-3 rounded-md border border-amber-500/20 bg-amber-500/5 text-[11px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground/80">
                  We do not store passwords, profile pictures, credit cards, or residential addresses.
                </div>
              </div>
            </section>

            {/* Section 4: Governing Law */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Gavel className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Governing Law</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Governed by the laws of the jurisdiction of operation. Users access this service at their own legal risk.
              </p>
            </section>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Section 5: Third-Party Authentication */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <ExternalLink className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Third-Party Processing</h2>
              </div>
              <div className="p-3 rounded-md border border-border/50 bg-card/30">
                <h3 className="text-foreground font-bold mb-1 text-[11px] sm:text-xs uppercase tracking-widest font-heading opacity-80">
                  Authentication
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Authentication is handled directly via Google Identity Services. We assume no liability for third-party service interruptions or OAuth API policy updates.
                </p>
              </div>
            </section>

            {/* Section 6: Public Data Disclaimer */}
            <section className="flex-1 p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 flex flex-col justify-start space-y-2">
              <div className="flex items-center gap-2 sm:gap-2.5 mb-1">
                <ShieldAlert className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Public Data Indexing</h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                All exposure metadata displayed on APIRadar is indexed from publicly accessible GitHub repositories. APIRadar does not create, leak, or host private user credentials.
              </p>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
