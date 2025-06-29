"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";

export function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    setProgress(30);
    const timeout = setTimeout(() => setProgress(90), 200);
    return () => clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (progress === 90) {
      const timeout = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 200);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  if (!loading) return null;
  return (
    <div className="fixed top-0 left-0 w-full z-[9999] pointer-events-none">
      <Progress value={progress} className="h-1 w-full bg-transparent" />
    </div>
  );
} 