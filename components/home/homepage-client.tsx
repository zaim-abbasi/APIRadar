"use client";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/components/home/use-is-mobile";

const HeroSection = dynamic(
  () => import("@/components/home/hero-section").then(m => m.HeroSection),
  { 
    ssr: false,
    loading: () => <div className="min-h-screen animate-pulse bg-muted/20" />
  }
);
const HeroSectionMobile = dynamic(
  () => import("@/components/home/hero-section-mobile").then(m => m.HeroSectionMobile),
  { 
    ssr: false,
    loading: () => <div className="min-h-screen animate-pulse bg-muted/20" />
  }
);
const ContentSections = dynamic(
  () => import("@/components/home/content-sections").then(m => m.ContentSections),
  { ssr: true }
);

export default function HomePageClient() {
  const isMobile = useIsMobile();
  return (
    <div className="relative">
      {isMobile ? <HeroSectionMobile /> : <HeroSection />}
      <ContentSections />
    </div>
  );
} 