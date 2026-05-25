import { AdminChrome } from "@/components/admin/AdminChrome";
import type { Lead, User } from "@/lib/api/types";
import {
  getBusinesses,
  getLeads,
  getTeams,
  getUsers,
} from "@/lib/api/queries";
import { LeadsClient } from "./LeadsClient";

function enrichLeads(
  rawLeads: Lead[],
  businesses: { id: string; name: string; domain: string }[],
  teams: { id: string; name: string }[],
  agents: User[]
): Lead[] {
  return rawLeads.map((ld) => {
    const biz = businesses.find((b) => b.id === ld.business_id);
    const tm = teams.find((t) => t.id === ld.team_id);
    const ag = agents.find((a) => a.id === ld.assigned_agent_id);
    return {
      ...ld,
      business_name: biz?.name ?? ld.business_name ?? "Unknown Storefront",
      business_domain: biz?.domain ?? ld.business_domain ?? "",
      team_name: tm?.name ?? (ld.team_id ? "Unknown Team" : "Unassigned"),
      agent_name: ag
        ? `${ag.first_name || ""} ${ag.last_name || ""}`.trim() || ag.email || "Agent"
        : ld.assigned_agent_id
          ? "Unknown Agent"
          : "Unassigned",
    };
  });
}

export default async function LeadsPage() {
  const [rawLeads, businesses, teams, users] = await Promise.all([
    getLeads(),
    getBusinesses(),
    getTeams(),
    getUsers(),
  ]);
  const agents = users.filter((u) =>
    ["agent", "team_leader", "admin"].includes(u.role)
  );
  const leads = enrichLeads(rawLeads, businesses, teams, agents);

  return (
    <AdminChrome breadcrumb="Admin / Leads">
      <LeadsClient
        initialLeads={leads}
        initialBusinesses={businesses}
        initialTeams={teams}
        initialAgents={agents}
      />
    </AdminChrome>
  );
}
