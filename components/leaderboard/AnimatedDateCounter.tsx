"use client";

import React, { useEffect, useState } from "react";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export interface AnimatedDateCounterProps {
  dateString: string | null;
}

export const AnimatedDateCounter: React.FC<AnimatedDateCounterProps> = ({ dateString }) => {
  if (!dateString || isNaN(new Date(dateString).getTime())) return null;

  const targetDate = new Date(dateString);
  const targetDay = targetDate.getUTCDate();
  const targetMonth = targetDate.getUTCMonth();
  const targetYear = targetDate.getUTCFullYear();

  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(targetMonth);
  const [year, setYear] = useState(2000);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 600, 1);
      setDay(Math.round(1 + (targetDay - 1) * progress));
      setMonth(targetMonth);
      setYear(Math.round(2000 + (targetYear - 2000) * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [dateString, targetDay, targetMonth, targetYear]);

  return (
    <span className="transition-all duration-600 ease-out">
      {day} {monthNames[month]}, {year}
    </span>
  );
}; 