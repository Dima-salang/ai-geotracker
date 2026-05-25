"use client";

import { useState } from "react";
import { supabase } from "../utils/supabase";

interface VerificationGateProps {
  userEmail: string;
  onRefresh: () => void;
}

export default function VerificationGate({ userEmail, onRefresh }: VerificationGateProps) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-xl bg-background border border-rose-600/40 p-8 md:p-10 relative shadow-[0_0_50px_rgba(225,29,72,0.1)]">
        
        {/* Verification Warning Protocol Header */}
        <div className="flex justify-between items-center mb-6">
          <span className="font-mono text-[9px] bg-rose-600/10 text-rose-600 border border-rose-600/20 px-2 py-0.5 uppercase font-bold tracking-widest animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
            SECURITY GATE: VERIFICATION REQUIRED
          </span>
          <span className="font-mono text-[9px] text-text-muted uppercase">
            Protocol: 403_LOCKED
          </span>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="border-b border-rose-600/10 pb-4">
            <h1 className="font-display text-3xl font-black uppercase tracking-tight text-foreground leading-none">
              Activation Pending
            </h1>
            <p className="font-mono text-xs text-text-muted mt-2">
              Account: <span className="text-foreground font-bold">{userEmail}</span>
            </p>
          </div>

          <p className="font-sans text-sm text-text-muted leading-relaxed">
            Your self-registered Agent profile is currently unverified. To protect franchise databases and potential lead records, your account must be reviewed and activated by an **Administrator** or **Team Leader** before you can log in.
          </p>

          <div className="p-4 bg-rose-600/5 border border-rose-600/20 text-rose-600 font-mono text-xs leading-relaxed space-y-2">
            <div className="font-bold uppercase tracking-wider">● System Status:</div>
            <div>- Agent profile registered successfully.</div>
            <div>- Security gate active: operational routes are secured.</div>
            <div>- Action Required: Contact your team administrator for approval.</div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-foreground/10 flex flex-col sm:flex-row gap-4 justify-between">
            <button
              onClick={handleSignOut}
              className="font-mono text-xs border border-foreground/20 hover:border-foreground text-foreground/80 hover:text-foreground px-6 py-3.5 uppercase font-bold transition-all w-full sm:w-auto"
            >
              [← Sign Out / Return]
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="font-mono text-xs bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 uppercase font-bold transition-all disabled:opacity-50 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                  RECHECKING_STATUS...
                </>
              ) : (
                "RECHECK_STATUS"
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
