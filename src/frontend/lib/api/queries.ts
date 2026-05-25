import { cache } from "react";
import { CACHE_TAGS } from "./config";
import { apiGet } from "./server";
import type {
  AdminStats,
  Business,
  Lead,
  ObservabilityStats,
  Organization,
  ProviderConfig,
  Scan,
  ScanResult,
  SystemConfig,
  Team,
  User,
} from "./types";

const LIST_LIMIT = 100;

export const getOrganizations = cache(async () =>
  apiGet<Organization[]>(`/api/v1/organizations?limit=${LIST_LIMIT}`, CACHE_TAGS.organizations)
);

export const getUsers = cache(async () =>
  apiGet<User[]>(`/api/v1/users?limit=${LIST_LIMIT}&offset=0`, CACHE_TAGS.users)
);

export const getTeams = cache(async () =>
  apiGet<Team[]>(`/api/v1/teams?limit=${LIST_LIMIT}`, CACHE_TAGS.teams)
);

export const getBusinesses = cache(async () =>
  apiGet<Business[]>(`/api/v1/businesses?limit=${LIST_LIMIT}`, CACHE_TAGS.businesses)
);

export const getScans = cache(async () =>
  apiGet<Scan[]>(`/api/v1/scans?limit=${LIST_LIMIT}`, CACHE_TAGS.scans)
);

export const getScanResults = cache(async () =>
  apiGet<ScanResult[]>(`/api/v1/scan_results?limit=${LIST_LIMIT}`, CACHE_TAGS.scanResults)
);

export const getLeads = cache(async () =>
  apiGet<Lead[]>(`/api/v1/leads`, CACHE_TAGS.leads)
);

export const getProviders = cache(async () =>
  apiGet<ProviderConfig[]>(`/api/v1/providers`, CACHE_TAGS.providers)
);

export const getSystemConfigs = cache(async () =>
  apiGet<SystemConfig[]>(`/api/v1/configs`, CACHE_TAGS.configs)
);

export const getAdminStats = cache(async () =>
  apiGet<AdminStats>(`/api/v1/admin/stats`, CACHE_TAGS.adminStats)
);

export const getObservabilityStats = cache(async () =>
  apiGet<ObservabilityStats>(`/api/v1/observability/stats`, CACHE_TAGS.observability)
);

/** Reference data used on many admin forms (deduped per request). */
export const getAdminReferenceData = cache(async () => {
  const [organizations, teams, users, businesses] = await Promise.all([
    getOrganizations(),
    getTeams(),
    getUsers(),
    getBusinesses(),
  ]);
  return { organizations, teams, users, businesses };
});
