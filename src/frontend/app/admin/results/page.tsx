import { AdminChrome } from "@/components/admin/AdminChrome";
import { getScanResults, getScans } from "@/lib/api/queries";
import { ResultsClient } from "./ResultsClient";

export default async function ResultsPage() {
  const [scanResults, scans] = await Promise.all([
    getScanResults(),
    getScans(),
  ]);

  return (
    <AdminChrome breadcrumb="Admin / Results">
      <ResultsClient initialScanResults={scanResults} initialScans={scans} />
    </AdminChrome>
  );
}
