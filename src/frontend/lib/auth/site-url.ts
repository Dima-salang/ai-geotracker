/**
 * Canonical app origin for OAuth redirects.
 *
 * Prefer NEXT_PUBLIC_SITE_URL when set (production/staging).
 * Otherwise use the browser origin (correct for local dev on :3000).
 */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getAuthCallbackUrl(): string {
  const origin = getAppOrigin();
  return origin ? `${origin}/auth/callback` : "/auth/callback";
}
