"use client";

import { getAuthCallbackUrl } from "@/lib/auth/site-url";
import { supabase } from "@/utils/supabase";
import { bodySmall, btnPrimary, headingH2 } from "@/lib/marketing/design-tokens";

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SignInModal({ open, onClose }: SignInModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-title"
    >
      <div
        className="w-full sm:max-w-md p-6 sm:p-8 bg-background border-t sm:border border-border shadow-2xl relative max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 font-mono text-xs uppercase text-text-muted hover:text-foreground min-h-11 min-w-11 touch-manipulation"
          aria-label="Close"
        >
          Close
        </button>

        <h3 id="sign-in-title" className={`${headingH2} text-2xl pr-10`}>
          Save your reports
        </h3>
        <p className={`${bodySmall} mt-3`}>
          Sign in to run more checks, track your score over time, and keep your action plans in one place.
        </p>

        <ul className={`mt-6 space-y-3 ${bodySmall}`}>
          <li className="flex gap-2">
            <span className="text-primary font-mono font-bold">✓</span>
            Unlimited saved scans on paid plans
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-mono font-bold">✓</span>
            Track score changes over time
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-mono font-bold">✓</span>
            Full checklists—not just the headline score
          </li>
        </ul>

        <button
          type="button"
          onClick={async () => {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: getAuthCallbackUrl() },
            });
            if (error) alert(`Sign in failed: ${error.message}`);
          }}
          className={`mt-8 w-full ${btnPrimary}`}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
