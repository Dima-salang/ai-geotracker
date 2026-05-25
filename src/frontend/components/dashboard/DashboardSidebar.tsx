"use client";

import React from "react";
import { supabase } from "../../utils/supabase";

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  tier: string;
  organization_id: string | null;
  organization_name: string | null;
  businesses: Array<{
    id: string;
    name: string;
    domain: string;
    industry: string;
    primary_city: string;
    primary_state: string;
    country: string;
  }>;
}

interface DashboardSidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  profile: ProfileData | null;
}

export default function DashboardSidebar({
  activeTab,
  setActiveTab,
  profile,
}: DashboardSidebarProps) {
  const getTierDisplay = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "enterprise":
        return "ULTRA PREMIUM";
      case "premium":
        return "PREMIUM";
      default:
        return "FREE";
    }
  };

  const getTabsForRole = (role: string) => {
    switch (role?.toLowerCase()) {
      case "agent":
        return [
          { id: "profile", label: "PROFILE" },
          { id: "leads", label: "LEADS" },
        ];
      case "team_leader":
        return [
          { id: "profile", label: "PROFILE" },
          { id: "leads", label: "LEADS" },
          { id: "team", label: "TEAM" },
        ];
      default:
        return [
          { id: "profile", label: "PROFILE" },
          { id: "audit", label: "AUDIT" },
          { id: "history", label: "HISTORY" },
          { id: "settings", label: "SETTINGS" },
        ];
    }
  };

  const tabs = getTabsForRole(profile?.role || "client");
  const activeBusiness = profile?.businesses?.[0];

  return (
    <aside className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-foreground/10 bg-[#FAF9F6] p-6 flex flex-col justify-between select-none">
      <div className="space-y-8">
        
        {/* Navigation Tabs */}
        <nav className="space-y-2.5">
          <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-2">
            ◆ SECTIONS
          </span>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left font-mono text-xs px-4 py-3 tracking-widest transition-all duration-150 uppercase border rounded-none font-black flex items-center justify-between cursor-pointer ${
                  isActive
                    ? "bg-[#0055FF] text-white border-[#0055FF] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                    : "bg-white text-black border-foreground/10 hover:bg-black/5"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && <span className="text-[10px]">▶</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session and Tier Metadata footer */}
      <div className="mt-8 pt-6 border-t border-foreground/10 space-y-4">
        {profile && (
          <div className="space-y-2">
            <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider block font-bold">
              Your Account
            </span>
            <div className="border border-foreground/5 bg-white p-3 space-y-1">
              <span className="font-sans text-[11px] font-black text-black block truncate" title={profile.email}>
                {profile.email}
              </span>
              <span className={`inline-block font-mono text-[8px] px-1.5 py-0.5 uppercase font-black border ${
                profile.tier === "premium"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : profile.tier === "enterprise"
                  ? "bg-emerald-600/10 text-emerald-600 border-emerald-600/20"
                  : "bg-zinc-100 text-text-muted border-zinc-200"
              }`}>
                {getTierDisplay(profile.tier)} TIER
              </span>
              {profile.organization_name && (
                <span className="font-mono text-[8px] text-text-muted block uppercase mt-1 truncate" title={profile.organization_name}>
                  COMPANY: {profile.organization_name}
                </span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={async () => {
            await supabase.auth.signOut();
          }}
          className="w-full font-mono text-[10px] tracking-wider bg-black text-white hover:bg-rose-600 hover:text-white transition-all py-2.5 font-bold uppercase rounded-none cursor-pointer"
        >
          LOG OUT
        </button>
      </div>
    </aside>
  );
}
