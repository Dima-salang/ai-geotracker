"use server";

import { CACHE_TAGS } from "@/lib/api/config";
import { apiMutate } from "@/lib/api/server";
import type { Business, Organization, Team, User } from "@/lib/api/types";

const STATS_TAGS = [CACHE_TAGS.adminStats, CACHE_TAGS.observability];

function orgTags() {
  return [CACHE_TAGS.organizations, ...STATS_TAGS];
}

function userTags() {
  return [CACHE_TAGS.users, ...STATS_TAGS];
}

function teamTags() {
  return [CACHE_TAGS.teams, ...STATS_TAGS];
}

function businessTags() {
  return [CACHE_TAGS.businesses, ...STATS_TAGS];
}

function scanTags() {
  return [CACHE_TAGS.scans, ...STATS_TAGS];
}

function scanResultTags() {
  return [CACHE_TAGS.scanResults, ...STATS_TAGS];
}

function leadTags() {
  return [CACHE_TAGS.leads, ...STATS_TAGS];
}

function providerTags() {
  return [CACHE_TAGS.providers];
}

function configTags() {
  return [CACHE_TAGS.configs];
}

export async function saveOrganization(input: { id?: string; name: string }) {
  if (!input.name.trim()) throw new Error("Name cannot be empty");
  if (input.id) {
    return apiMutate<Organization>(
      `/api/v1/organizations/${input.id}`,
      "PUT",
      orgTags(),
      { name: input.name }
    );
  }
  return apiMutate<Organization>("/api/v1/organizations", "POST", orgTags(), {
    name: input.name,
  });
}

export async function deleteOrganization(id: string) {
  if (id === "00000000-0000-0000-0000-000000000000") {
    throw new Error("Default organization is protected");
  }
  await apiMutate(`/api/v1/organizations/${id}`, "DELETE", orgTags());
}

export async function saveTeam(input: {
  id?: string;
  name: string;
  leader_id: string | null;
}) {
  if (!input.name.trim()) throw new Error("Team name is required");
  const body = { name: input.name, leader_id: input.leader_id || null };
  if (input.id) {
    return apiMutate<Team>(`/api/v1/teams/${input.id}`, "PUT", teamTags(), body);
  }
  return apiMutate<Team>("/api/v1/teams", "POST", teamTags(), body);
}

export async function deleteTeam(id: string) {
  await apiMutate(`/api/v1/teams/${id}`, "DELETE", teamTags());
}

export async function saveUser(input: {
  isCreate: boolean;
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  tier: string;
  organization_id: string | null;
  role: string;
  team_id: string | null;
  is_verified: boolean;
}) {
  if (!input.email.trim()) throw new Error("Email is required");
  if (input.isCreate) {
    return apiMutate<User>("/api/v1/users", "POST", userTags(), {
      id: input.id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone,
      tier: input.tier,
      organization_id: input.organization_id,
      role: input.role,
      team_id: input.team_id,
      is_verified: input.is_verified,
    });
  }
  return apiMutate<User>(`/api/v1/users/${input.id}`, "PUT", userTags(), {
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    phone: input.phone,
    tier: input.tier,
    role: input.role,
    team_id: input.team_id,
    is_verified: input.is_verified,
  });
}

export async function deleteUser(id: string) {
  if (id === "00000000-0000-0000-0000-000000000001") {
    throw new Error("Cannot delete default manager profile");
  }
  await apiMutate(`/api/v1/users/${id}`, "DELETE", userTags());
}

export async function verifyUser(id: string) {
  return apiMutate<User>(`/api/v1/users/${id}`, "PUT", userTags(), {
    is_verified: true,
  });
}

export async function saveBusiness(input: {
  isCreate: boolean;
  id?: string;
  organization_id: string;
  name: string;
  domain: string;
  industry: string;
  primary_city: string;
  primary_state: string;
  country: string;
  service_focuses: string[];
  target_suburbs: string[];
}) {
  if (!input.name.trim() || !input.domain.trim() || !input.organization_id) {
    throw new Error("Name, domain, and organization are required");
  }
  const full = {
    name: input.name,
    domain: input.domain,
    industry: input.industry,
    primary_city: input.primary_city,
    primary_state: input.primary_state,
    country: input.country,
    service_focuses: input.service_focuses,
    target_suburbs: input.target_suburbs,
    organization_id: input.organization_id,
  };
  if (input.isCreate) {
    return apiMutate<Business>("/api/v1/businesses", "POST", businessTags(), full);
  }
  const { organization_id: _o, ...update } = full;
  return apiMutate<Business>(
    `/api/v1/businesses/${input.id}`,
    "PUT",
    businessTags(),
    update
  );
}

export async function deleteBusiness(id: string) {
  await apiMutate(`/api/v1/businesses/${id}`, "DELETE", businessTags());
}

export async function saveScan(input: {
  isCreate: boolean;
  id?: string;
  business_id?: string;
  overall_score: number | null;
  status: string;
  summary: Record<string, unknown>;
  recommendations: unknown[];
}) {
  if (input.isCreate) {
    if (!input.business_id) throw new Error("Business is required");
    return apiMutate("/api/v1/scans", "POST", scanTags(), {
      business_id: input.business_id,
    });
  }
  return apiMutate(`/api/v1/scans/${input.id}`, "PUT", scanTags(), {
    overall_score: input.overall_score,
    status: input.status,
    summary: input.summary,
    recommendations: input.recommendations,
  });
}

export async function deleteScan(id: string) {
  await apiMutate(`/api/v1/scans/${id}`, "DELETE", scanTags());
}

export async function saveScanResult(input: {
  isCreate: boolean;
  id?: string;
  scan_id: string;
  provider: string;
  model: string | null;
  display_name: string | null;
  status: string;
  score: number | null;
  rank_position: number | null;
  mentioned: boolean;
  actionable: boolean;
  domain_match: boolean;
  reason: string | null;
  error: string | null;
}) {
  const body = {
    scan_id: input.scan_id,
    provider: input.provider,
    model: input.model,
    display_name: input.display_name,
    status: input.status,
    score: input.score,
    rank_position: input.rank_position,
    mentioned: input.mentioned,
    actionable: input.actionable,
    domain_match: input.domain_match,
    reason: input.reason,
    error: input.error,
  };
  if (input.isCreate) {
    return apiMutate("/api/v1/scan_results", "POST", scanResultTags(), body);
  }
  const { scan_id: _s, ...update } = body;
  return apiMutate(`/api/v1/scan_results/${input.id}`, "PUT", scanResultTags(), update);
}

export async function deleteScanResult(id: string) {
  await apiMutate(`/api/v1/scan_results/${id}`, "DELETE", scanResultTags());
}

export async function saveLead(input: {
  isCreate: boolean;
  id?: string;
  business_id: string;
  team_id: string | null;
  assigned_agent_id: string | null;
  visibility_score: number;
  status: string;
}) {
  if (!input.business_id) throw new Error("Business is required");
  const body = {
    business_id: input.business_id,
    team_id: input.team_id,
    assigned_agent_id: input.assigned_agent_id,
    visibility_score: input.visibility_score,
    status: input.status,
  };
  if (input.isCreate) {
    return apiMutate("/api/v1/leads", "POST", leadTags(), body);
  }
  return apiMutate(`/api/v1/leads/${input.id}`, "PUT", leadTags(), body);
}

export async function deleteLead(id: string) {
  await apiMutate(`/api/v1/leads/${id}`, "DELETE", leadTags());
}

export async function saveProviderConfig(input: Record<string, unknown>) {
  return apiMutate("/api/v1/providers", "POST", providerTags(), input);
}

export async function updateProviderConfig(
  id: string,
  input: Record<string, unknown>
) {
  return apiMutate(`/api/v1/providers/${id}`, "PUT", providerTags(), input);
}

export async function saveSystemConfigs(input: Record<string, unknown>[]) {
  return apiMutate("/api/v1/configs", "POST", configTags(), input);
}
