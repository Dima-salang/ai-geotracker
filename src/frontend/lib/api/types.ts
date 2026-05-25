export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  leader_id: string | null;
  created_at: string;
}

export interface User {
  id: string;
  organization_id: string | null;
  role: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  auth_provider: string | null;
  tier: string;
  created_at: string;
  last_scan_at: string | null;
  team_id: string | null;
  is_verified: boolean;
}

export interface Business {
  id: string;
  organization_id: string;
  name: string;
  domain: string;
  industry: string;
  primary_city: string;
  primary_state: string;
  country: string;
  service_focuses: string[];
  target_suburbs: string[];
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  business_id: string;
  business_name?: string | null;
  business_domain?: string | null;
  overall_score: number | null;
  status: string;
  summary: Record<string, unknown> | null;
  recommendations: unknown[];
  created_at: string;
  completed_at: string | null;
}

export interface ScanResult {
  id: string;
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
  raw_response?: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  business_name?: string;
  business_domain?: string;
  team_id: string | null;
  team_name?: string | null;
  assigned_agent_id: string | null;
  agent_name?: string | null;
  visibility_score: number;
  status: string;
  created_at: string;
}

export interface ProviderConfig {
  id: string;
  provider: string;
  model: string;
  display_name: string | null;
  api_base: string | null;
  is_active: boolean;
  timeout_seconds: number;
  has_key: boolean;
}

export interface SystemConfig {
  id: string;
  key: string;
  is_encrypted: boolean;
  has_value: boolean;
  value?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  providers: number;
  users: number;
  organizations: number;
  businesses: number;
  scans: number;
  results: number;
  teams: number;
  leads: number;
}

export interface ObservabilityStats {
  success_rate: number;
  average_score: number;
  tokens_by_provider: Array<{ provider: string; tokens: number }>;
  latency_by_provider: Array<{ provider: string; latency_ms: number }>;
  scans_by_date: Array<{ date: string; count: number }>;
}
