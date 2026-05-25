"use client";

import { useEffect, useState } from "react";
import { LANDING_STATS } from "@/lib/marketing/bento-cards";
import { bodySmall, eyebrow } from "@/lib/marketing/design-tokens";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function StatsSection() {
  const [extraScans, setExtraScans] = useState(0);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/v1/public-stats`)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.total_scans === "number") setExtraScans(data.total_scans);
      })
      .catch(() => {});
  }, []);

  const stats = LANDING_STATS.map((stat, i) => {
    if (i === 0) {
      const total = 582000 + extraScans;
      return { ...stat, value: `${total.toLocaleString()}+` };
    }
    return stat;
  });

  return (
    <section id="stats-section" className="border-b border-border reveal-on-scroll">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b md:border-b-0 border-border md:border-0">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`bg-background py-12 md:py-16 px-6 md:px-10 text-center ${
              i < 2 ? "border-b md:border-b-0 md:border-r border-border" : ""
            }`}
          >
            <p className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
              {stat.value}
              {"suffix" in stat && stat.suffix ? (
                <span className="text-xl md:text-2xl text-text-muted font-semibold">{stat.suffix}</span>
              ) : null}
            </p>
            <p className={`${eyebrow} mt-3`}>{stat.label}</p>
            <p className={`${bodySmall} text-xs mt-2 max-w-xs mx-auto`}>{stat.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
