/** Seconds to cache admin list reads (Next.js Data Cache). */
export const ADMIN_REVALIDATE_SECONDS = 60;

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

export const CACHE_TAGS = {
  organizations: "admin-organizations",
  users: "admin-users",
  teams: "admin-teams",
  businesses: "admin-businesses",
  scans: "admin-scans",
  scanResults: "admin-scan-results",
  leads: "admin-leads",
  providers: "admin-providers",
  configs: "admin-configs",
  adminStats: "admin-stats",
  observability: "admin-observability",
} as const;
