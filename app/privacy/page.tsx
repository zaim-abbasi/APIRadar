import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | APIRadar",
  description: "Learn how APIRadar handles your data and protects your privacy while using our security intelligence platform.",
};

export default function PrivacyPage() {
  const lastUpdated = "April 18, 2026";

  return (
    <div className="min-h-screen bg-background py-12 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="space-y-4 mb-10 md:mb-16 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground lg:leading-[1.1]">
            Privacy <span className="text-coral">Policy</span>
          </h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em]">
            Last Updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-invert prose-coral max-w-none space-y-10 animate-fade-in-up animate-delay-150">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              The Basics
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              We take your privacy seriously. Here is how we handle your data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              What We Collect
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect almost nothing. Since you sign in with Google, we only store:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-2">
              <li>Your name</li>
              <li>Your email</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We <strong>do not</strong> save your profile picture, password, or address. 
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              How We Use Your Info
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your email to set up your account and send you security updates. If you join our mailing list, we'll send you intelligence reports too.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              Third Parties
            </h2>
            <div className="bg-coral/5 border border-coral/20 rounded-lg p-5">
              <p className="text-foreground font-bold mb-2">We don't sell your data.</p>
              <p className="text-muted-foreground leading-relaxed">
                We never trade or sell your personal info to anyone. 
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              We use Stripe and LemonSqueezy for payments. They handle the credit cards—we never see your card number.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              Cookies & Tracking
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use standard cookies and local storage to keep you signed in. We don't use tracking pixels for ads.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              Data Retention
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We keep your account info as long as you're a user. If you delete your account, we'll pull your data from our active database within 30 days.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border/50 pb-2">
              Takedown Requests
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you own a repo or represent a provider (like OpenAI) and want a specific leak removed, email us.
            </p>
            <p className="text-coral font-bold">
              Email: <a href="mailto:security@apiradar.live" className="underline underline-offset-4 hover:text-coral/80 transition-colors">security@apiradar.live</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
