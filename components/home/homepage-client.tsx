"use client";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/components/home/use-is-mobile";

// Optimize dynamic imports with loading states
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

// Memoize component to prevent unnecessary re-renders
export default function HomePageClient() {
  const isMobile = useIsMobile();
  return (
    <div className="relative">
      {isMobile ? <HeroSectionMobile /> : <HeroSection />}
    </div>
  );
} 