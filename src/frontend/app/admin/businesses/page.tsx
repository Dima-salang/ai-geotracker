import { AdminChrome } from "@/components/admin/AdminChrome";
import { getBusinesses, getOrganizations } from "@/lib/api/queries";
import { BusinessesClient } from "./BusinessesClient";

export default async function BusinessesPage() {
  const [businesses, organizations] = await Promise.all([
    getBusinesses(),
    getOrganizations(),
  ]);

  return (
    <AdminChrome breadcrumb="Admin / Businesses">
      <BusinessesClient
        initialBusinesses={businesses}
        initialOrganizations={organizations}
      />
    </AdminChrome>
  );
}
