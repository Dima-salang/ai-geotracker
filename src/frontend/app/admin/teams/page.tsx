import { AdminChrome } from "@/components/admin/AdminChrome";
import { TeamsPanel } from "@/components/admin/TeamsPanel";
import { getTeams, getUsers } from "@/lib/api/queries";

export default async function TeamsPage() {
  const [teams, users] = await Promise.all([getTeams(), getUsers()]);

  return (
    <AdminChrome breadcrumb="Operator Settings / Teams">
      <TeamsPanel teams={teams} users={users} />
    </AdminChrome>
  );
}
