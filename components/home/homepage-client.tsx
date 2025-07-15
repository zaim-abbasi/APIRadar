"use client";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/components/home/use-is-mobile";

const HeroSection = dynamic(() => import("@/components/home/hero-section").then(m => m.HeroSection), { ssr: false });
const HeroSectionMobile = dynamic(() => import("@/components/home/hero-section-mobile").then(m => m.HeroSectionMobile), { ssr: false });

export default function HomePageClient() {
  const isMobile = useIsMobile();
  return (
    <div className="relative">
      {isMobile ? <HeroSectionMobile /> : <HeroSection />}
    </div>
  );
} 