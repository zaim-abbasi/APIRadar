import React from "react";
import { Metadata } from "next";
import { Database, Fingerprint, ExternalLink, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | APIRadar",
  description: "Learn how APIRadar handles your data and protects your privacy while using our real-time API exposure intelligence platform.",
};

export default function PrivacyPage() {
  const lastUpdated = "June 15, 2026";

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

        {/* Content Layout in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 animate-fade-in-up animate-delay-150">
          
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5">
            {/* Section 1: Data Minimization */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Fingerprint className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Data Minimization</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm italic">
                APIRadar operates on a principle of Data Minimization. We do not collect or store sensitive personal information beyond what is strictly required for platform authentication and service delivery.
              </p>
            </section>

            {/* Section 2: Information Collection */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2.5 sm:gap-3 border-b border-border/40 pb-2">
                <Database className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Information Collection</h2>
              </div>
              
              <div className="space-y-3">
                <div className="p-3 rounded-md border border-border/50 bg-card/30">
                  <h3 className="text-foreground font-bold mb-1 flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest font-heading opacity-80">
                    <span className="h-1.5 w-1.5 rounded-md bg-amber-500" />
                    Primary Identity
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Full Name and Email Address retrieved via Google OAuth.
                  </p>
                </div>

                <div className="p-2.5 sm:p-3 rounded-md border border-destructive/20 bg-destructive/5 text-[11px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground/80">
                  Note: We do not store profile imagery, residential addresses, or passwords.
                </div>
              </div>
            </section>

            {/* Section 3: Third-Party Processing */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <ExternalLink className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Third-Party Processing</h2>
              </div>
              <div className="p-3 rounded-md border border-border/50 bg-card/30">
                <h3 className="text-foreground font-bold mb-1 flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest font-heading opacity-80">
                  <span className="h-1 w-2 rounded-md bg-green-500/50" />
                  Authentication
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Managed securely via Google Identity Services.
                </p>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-5">
            {/* Section 5: Security Disclosure */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200 text-center space-y-3">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground underline underline-offset-4 decoration-amber-500/50 font-heading uppercase tracking-wide">Security Disclosure</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                As a transparency-first platform, we host a formal <span className="text-foreground font-medium underline decoration-amber-500/30 italic">Vulnerability Disclosure Program (VDP)</span>. 
                If you represent an organization, contact our support team.
              </p>
              <div className="pt-1 flex justify-center">
                <a 
                  href="mailto:contact@apiradar.live" 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 text-primary-foreground font-bold uppercase tracking-[0.2em] text-xs sm:text-sm hover:brightness-90 transition-all"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Contact Support
                </a>
              </div>
            </section>

            {/* Section 6: Governing Law */}
            <section className="p-4 sm:p-5 rounded-lg border border-border/50 bg-card/20 hover:bg-card/30 transition-all duration-200">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
                <Mail className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-heading uppercase tracking-wide">Governing Law</h2>
              </div>
              <p className="text-sm text-foreground font-medium leading-relaxed mb-2">
                Governed by the laws of the jurisdiction of operation.
              </p>
              <div className="flex flex-col gap-0.5 border-t border-border/40 pt-2">
                <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Enquiries</span>
                <a href="mailto:contact@apiradar.live" className="text-sm text-foreground font-bold hover:text-amber-500 transition-colors flex items-center gap-1.5">
                  contact@apiradar.live
                </a>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
