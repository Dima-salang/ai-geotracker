import { AdminChrome } from "@/components/admin/AdminChrome";
import { getProviders, getSystemConfigs } from "@/lib/api/queries";
import { ProvidersPanel } from "@/components/admin/ProvidersPanel";

export default async function ProvidersPage() {
  const [configs, systemConfigs] = await Promise.all([
    getProviders(),
    getSystemConfigs(),
  ]);

  return (
    <AdminChrome breadcrumb="Operator Settings / AI Providers">
      <ProvidersPanel initialConfigs={configs} initialSystemConfigs={systemConfigs} />
    </AdminChrome>
  );
}
