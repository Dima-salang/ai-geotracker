"use client";

import React from "react";

interface StageTrackerProps {
  stage: string;
}

interface StepItem {
  id: string;
  label: string;
  sublabel: string;
  stageTrigger: string[];
  activeTrigger: string;
}

export default function StageTracker({ stage }: StageTrackerProps) {
  const steps: StepItem[] = [
    {
      id: "01",
      label: "CONNECTING TO LLMS",
      sublabel: "Establishing connection to Large Language Models",
      stageTrigger: ["validated", "classification", "geocoding", "querying_providers", "complete"],
      activeTrigger: "initiated",
    },
    {
      id: "02",
      label: "VERIFYING BUSINESS WEBSITE",
      sublabel: "Checking your website and confirming it is reachable",
      stageTrigger: ["classification", "geocoding", "querying_providers", "complete"],
      activeTrigger: "validated",
    },
    {
      id: "03",
      label: "IDENTIFYING BUSINESS CATEGORY",
      sublabel: "Figuring out what type of business you run",
      stageTrigger: ["geocoding", "querying_providers", "complete"],
      activeTrigger: "classification",
    },
    {
      id: "04",
      label: "MAPPING YOUR LOCATION",
      sublabel: "Pinpointing your local area for accurate search results",
      stageTrigger: ["querying_providers", "complete"],
      activeTrigger: "geocoding",
    },
    {
      id: "05",
      label: "CHECKING AI RECOMMENDATIONS",
      sublabel: "Asking AI search engines if they recommend your business",
      stageTrigger: ["complete"],
      activeTrigger: "querying_providers",
    },
  ];

  const getStepStatus = (step: StepItem) => {
    const stageLower = stage?.toLowerCase() || "";
    if (stageLower === "complete" || step.stageTrigger.includes(stageLower)) {
      return {
        label: "[✓ DONE]",
        class: "text-emerald-600 font-bold",
        icon: "✓",
        bg: "bg-emerald-500/10 border-emerald-500/20",
      };
    }
    if (stageLower === step.activeTrigger) {
      return {
        label: "[▶ IN PROGRESS]",
        class: "text-[#0055FF] font-black animate-pulse",
        icon: "◆",
        bg: "bg-[#0055FF]/5 border-[#0055FF]/20 animate-pulse",
      };
    }
    return {
      label: "[◌ WAITING]",
      class: "text-text-muted",
      icon: "◌",
      bg: "bg-zinc-50 border-zinc-200 opacity-60",
    };
  };

  const isCompleted = stage?.toLowerCase() === "complete";

  return (
    <div className="border border-foreground/10 bg-white p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] space-y-6">
      
      {/* Tracker Header */}
      <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
        <div>
          <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-0.5">
            ◆ AUDIT IN PROGRESS
          </span>
          <h4 className="font-display text-lg font-black uppercase text-black leading-tight">
            Checking AI Recommendations
          </h4>
        </div>
        <div className="font-mono text-[10px] bg-black text-white px-2.5 py-0.5 uppercase font-bold">
          {isCompleted ? "STATUS: DONE" : `STEP: ${stage?.toUpperCase() || "STARTING"}`}
        </div>
      </div>

      {/* Step checklist blocks */}
      <div className="space-y-3">
        {steps.map((step) => {
          const status = getStepStatus(step);
          return (
            <div
              key={step.id}
              className={`border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all duration-300 rounded-none ${status.bg}`}
            >
              <div className="flex gap-3">
                <span className="font-mono text-xs text-text-muted font-bold">{step.id}.</span>
                <div>
                  <h5 className="font-mono text-xs font-black text-black tracking-tight leading-none uppercase">
                    {step.label}
                  </h5>
                  <span className="font-sans text-[10px] text-text-muted block mt-1 leading-normal">
                    {step.sublabel}
                  </span>
                </div>
              </div>
              <span className={`font-mono text-[10px] tracking-widest uppercase whitespace-nowrap ${status.class}`}>
                {status.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dynamic completion message */}
      {isCompleted && (
        <div className="p-4 border border-emerald-600 bg-emerald-600/5 text-emerald-600 font-mono text-[10px] font-bold uppercase text-center tracking-wider animate-in fade-in zoom-in-95">
          [✓ AUDIT COMPLETE — YOUR VISIBILITY REPORT IS READY]
        </div>
      )}
    </div>
  );
}
