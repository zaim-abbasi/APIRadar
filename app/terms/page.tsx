import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | APIRadar",
  description: "Read our terms of service regarding the use of APIRadar for authorized security research and intelligence.",
};

export default function TermsPage() {
  const lastUpdated = "April 18, 2026";

  return (
    <div className="min-h-screen bg-background py-12 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="space-y-4 mb-10 md:mb-16 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground lg:leading-[1.1]">
            Terms of <span className="text-coral">Service</span>
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em]">
            Last Updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-invert prose-coral max-w-none space-y-10 animate-fade-in-up animate-delay-150">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              1. What this is for
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              APIRadar is for research and education. By using it, you agree to stay within the law. If you break the law or these rules, that's on you.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              2. You must be 18
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old to use this site. By signing in, you confirm you are 18 or older.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              3. Our Rules
            </h2>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-5">
              <p className="text-foreground font-bold mb-2 uppercase tracking-wide">Strict Prohibition</p>
              <p className="text-muted-foreground leading-relaxed">
                Do not use our data for anything illegal, like stealing accounts or hacking. We are not responsible for any trouble you get into. Any illegal use will result in an immediate ban.
              </p>
            </div>
            <div className="bg-coral/5 border border-coral/20 rounded-lg p-5">
              <p className="text-foreground font-bold mb-2 uppercase tracking-wide">No Scraping</p>
              <p className="text-muted-foreground leading-relaxed">
                Don't use bots or scripts to steal our data. If we catch you scraping, we will ban you permanently and may take further action.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              4. Service Availability
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We don't guarantee the site will always be online. We can pause, update, or shut down APIRadar at any time without notice. We aren't liable if the site is down when you need it.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              5. Data Accuracy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We try our best, but the data might be wrong. A "Working" key might be dead. Use the information at your own risk. We aren't responsible for any decisions you make based on our data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              6. No Refunds
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              All credit purchases are final. No refunds. 
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you spend a credit on a dead key, you can report it. We might give you the credit back, but the final decision is entirely up to us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              7. Changing These Rules
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We can change these terms at any time without telling you. By continuing to use the site, you agree to whatever the current rules are.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              8. Takedowns
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you represent an API provider or own a repository and want a leak removed, email us. We'll review the request, but we have the final say on what stays and what goes.
            </p>
            <p className="text-coral font-bold">
              Email: <a href="mailto:security@apiradar.live" className="underline underline-offset-4 hover:text-coral/80 transition-colors">security@apiradar.live</a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              9. Total Liability Waiver
            </h2>
            <p className="text-muted-foreground leading-relaxed italic">
              BY USING APIRADAR, YOU AGREE THAT WE ARE NOT LIABLE FOR ANY DAMAGES, LOSSES, OR LEGAL ISSUES YOU ENCOUNTER. YOU ASSUME 100% OF THE RISK. IF YOU DON'T AGREE, DON'T USE THE SITE.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
