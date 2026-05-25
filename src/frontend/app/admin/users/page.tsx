import { AdminChrome } from "@/components/admin/AdminChrome";
import { getOrganizations, getTeams, getUsers } from "@/lib/api/queries";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const [users, organizations, teams] = await Promise.all([
    getUsers(),
    getOrganizations(),
    getTeams(),
  ]);

  return (
    <AdminChrome breadcrumb="Operator Settings / Users">
      <UsersClient
        initialUsers={users}
        initialOrganizations={organizations}
        initialTeams={teams}
      />
    </AdminChrome>
  );
}
