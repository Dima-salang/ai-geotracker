import { AdminChrome } from "@/components/admin/AdminChrome";
import { getBusinesses, getScans } from "@/lib/api/queries";
import { ScansClient } from "./ScansClient";

export default async function ScansPage() {
  const [scans, businesses] = await Promise.all([getScans(), getBusinesses()]);

  return (
    <AdminChrome breadcrumb="Admin / Scans">
      <ScansClient initialScans={scans} initialBusinesses={businesses} />
    </AdminChrome>
  );
}
