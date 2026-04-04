"use client";
import dynamic from "next/dynamic";

const HeroSection = dynamic(
  () => import("@/components/home/hero-section").then((m) => m.HeroSection),
  {
    ssr: false,
    loading: () => <div className="min-h-screen" />,
  },
);
const ContentSections = dynamic(
  () =>
    import("@/components/home/content-sections").then((m) => m.ContentSections),
  { ssr: true },
);

export default function HomePageClient() {
  return (
    <div className="relative">
      <HeroSection />
      <ContentSections />
    </div>
  );
}
