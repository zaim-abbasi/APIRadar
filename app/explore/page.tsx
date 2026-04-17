import type { Metadata } from "next";
import { ExploreClient } from "@/components/explore/explore-client";

export const metadata: Metadata = {
  title: "Explore Leaked Keys - APIRadar",
  description:
    "Real-time feed of API key leaks discovered in public repositories. Track security incidents as they happen with detailed insights.",
  openGraph: {
    title: "Explore Leaked Keys - APIRadar",
    description:
      "Real-time feed of API key leaks discovered in public repositories.",
    url: "https://apiradar.live/explore",
  },
  twitter: {
    title: "Explore Leaked Keys - APIRadar",
    description:
      "Real-time feed of API key leaks discovered in public repositories.",
  },
};

export default function ExplorePage() {
  return <ExploreClient />;
}