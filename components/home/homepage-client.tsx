"use client";
import { HeroSection } from "@/components/home/hero-section";
import { ContentSections } from "@/components/home/content-sections";

export default function HomePageClient() {
  return (
    <div className="relative">
      <HeroSection />
      <ContentSections />
    </div>
  );
}
