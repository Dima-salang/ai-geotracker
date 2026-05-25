import { AdminHubChrome } from "@/components/admin/AdminChrome";
import { getAdminStats, getObservabilityStats } from "@/lib/api/queries";
import { AdminHubClient } from "./AdminHubClient";

export default async function AdminDashboardPage() {
  let stats = {
    providers: 0,
    users: 0,
    organizations: 0,
    businesses: 0,
    scans: 0,
    results: 0,
    teams: 0,
    leads: 0,
  };
  let obsStats = null;
  let loadError: string | null = null;

  try {
    const [adminStats, observability] = await Promise.all([
      getAdminStats(),
      getObservabilityStats().catch(() => null),
    ]);
    stats = adminStats;
    obsStats = observability;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load dashboard stats";
  }

  return (
    <AdminHubChrome>
      <AdminHubClient stats={stats} obsStats={obsStats} loadError={loadError} />
    </AdminHubChrome>
  );
}
