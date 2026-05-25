import { AdminChrome } from "@/components/admin/AdminChrome";
import { OrganizationsPanel } from "@/components/admin/OrganizationsPanel";
import { getOrganizations } from "@/lib/api/queries";

export default async function OrganizationsPage() {
  const organizations = await getOrganizations();

  return (
    <AdminChrome breadcrumb="Admin / Organizations">
      <OrganizationsPanel organizations={organizations} />
    </AdminChrome>
  );
}
