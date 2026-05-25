"use client";

import React from "react";

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
    service_focuses: string[];
    target_suburbs: string[];
    formatted_address: string | null;
  }>;
}

interface ProfileTabProps {
  profile: ProfileData | null;
}

export default function ProfileTab({ profile }: ProfileTabProps) {
  if (!profile) return null;
  
  const activeBusiness = profile.businesses?.[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Dashboard Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-foreground/10 pb-6 gap-4">
        <div>
          <span className="font-mono text-xs text-[#0055FF] mb-2 uppercase tracking-[0.2em] block">
            ◆ YOUR DASHBOARD
          </span>
          <h2 className="font-display text-[2.2rem] md:text-[2.6rem] font-bold tracking-tight uppercase leading-none text-black">
            Your Profile
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest font-bold">
            Organization
          </span>
          <span className="font-sans text-xs bg-white border border-foreground/10 px-3 py-1 font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
            {profile.organization_name?.toUpperCase() || "UNASSIGNED"}
          </span>
        </div>
      </div>

      {/* Grid Layout: Account Details Bento Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Account Details Card */}
        <div className="md:col-span-8 border border-foreground/10 p-6 md:p-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
          <h3 className="font-mono text-[10px] text-[#0055FF] uppercase font-black tracking-widest mb-6">
            Your Profile Details
          </h3>
          
          <table className="w-full font-sans text-xs">
            <tbody>
              <tr className="border-b border-black/5">
                <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase w-1/3 font-bold">Full Name</td>
                <td className="py-3.5 text-black font-bold">{profile.first_name || "Unassigned"} {profile.last_name || ""}</td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase font-bold">Email Address</td>
                <td className="py-3.5 text-black font-bold select-all">{profile.email}</td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase font-bold">Phone Number</td>
                <td className="py-3.5 text-black font-bold">{profile.phone || "Not Provided"}</td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase font-bold">Account Type</td>
                <td className="py-3.5 text-black font-bold font-mono text-[10px] uppercase">{profile.role || "CLIENT"}</td>
              </tr>
              {activeBusiness && (
                <>
                  <tr className="border-b border-black/5">
                    <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase font-bold">Business Location</td>
                    <td className="py-3.5 text-black font-bold uppercase">
                      {activeBusiness.name} ({activeBusiness.primary_city}{activeBusiness.primary_state ? `, ${activeBusiness.primary_state}` : ""})
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase font-bold">Your Website</td>
                    <td className="py-3.5 text-[#0055FF] font-bold font-mono lowercase select-all">{activeBusiness.domain}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Account Info Side-Box */}
        <div className="md:col-span-4 border border-foreground/10 p-6 md:p-8 bg-[#FAF9F6] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] text-black uppercase font-black tracking-widest">
              Verified Account Details
            </h3>
            <p className="font-sans text-[11px] text-text-muted leading-relaxed font-bold">
              Your profile is verified. We regularly check how AI search engines recommend your business and update your results automatically.
            </p>
          </div>
          <div className="border-t border-foreground/10 pt-4 font-mono text-[8px] text-text-muted uppercase">
            ACCOUNT_ID: {profile.id.slice(0, 18).toUpperCase()}...
          </div>
        </div>
      </div>
    </div>
  );
}
