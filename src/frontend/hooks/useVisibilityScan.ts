"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProviderResult, ResearchedDetails, ScanRecommendation } from "@/components/ResultsDashboard";
import { supabase } from "@/utils/supabase";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ResearchFact = {
  id: string;
  label: string;
  value: string;
};

export type ScanResultState = {
  overallScore: number;
  summary: { green: number; yellow: number; red: number };
  recommendations: ScanRecommendation[];
  details: ResearchedDetails;
  providerResults: ProviderResult[];
  scanId?: string;
};

const PROGRESS_LABELS: Record<string, string> = {
  initiated: "Starting your visibility check…",
  validated: "Checking your website…",
  classification: "Learning about your business and service area…",
  geocoding: "Mapping your local market…",
  querying_providers: "Asking AI tools who they recommend…",
  complete: "Putting together your report…",
};

function friendlyFactLabel(id: string, fallback: string): string {
  const map: Record<string, string> = {
    init: "Status",
    val: "Website",
    name: "Business",
    ind: "Category",
    foot: "Market",
    rad: "Service area",
    prom: "Searches prepared",
    geo: "Location",
    svc: "Top service",
  };
  return map[id] ?? fallback;
}

export function useVisibilityScan() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [isVirtualDetected, setIsVirtualDetected] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [streamingProviders, setStreamingProviders] = useState<ProviderResult[]>([]);
  const [providerCount, setProviderCount] = useState(0);
  const [researchedCategory, setResearchedCategory] = useState("");
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [researchedFacts, setResearchedFacts] = useState<ResearchFact[]>([]);
  const [liveDetails, setLiveDetails] = useState<ResearchedDetails | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthToken(session.access_token);
        setUserSession({
          id: session.user.id,
          email: session.user.email || "",
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthToken(session.access_token);
        setUserSession({
          id: session.user.id,
          email: session.user.email || "",
        });
      } else {
        setAuthToken(null);
        setUserSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (progressStage) {
      setProgressMessage(PROGRESS_LABELS[progressStage] ?? "Working on your report…");
    }
  }, [progressStage, providerCount]);

  useEffect(() => {
    if (showDashboard) {
      const t = setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [showDashboard]);

  const trackEngagement = useCallback(async (eventType: string, target?: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/v1/telemetry/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: eventType, target: target || "" }),
      });
    } catch {
      /* non-blocking */
    }
  }, []);

  const resetScan = useCallback(() => {
    setScanResult(null);
    setDomain("");
    setProgressStage("");
    setShowDashboard(false);
    setErrorMsg("");
    setResearchedFacts([]);
    setLiveDetails(null);
  }, []);

  const upsertFact = useCallback((fact: ResearchFact) => {
    setResearchedFacts((prev) => {
      if (prev.some((f) => f.id === fact.id)) return prev;
      return [...prev, { ...fact, label: friendlyFactLabel(fact.id, fact.label) }];
    });
  }, []);

  const startScan = useCallback(async () => {
    if (!domain.trim()) {
      setErrorMsg("Please enter your business website");
      return;
    }

    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, "");
    cleanDomain = cleanDomain.split("/")[0];

    setLoading(true);
    setErrorMsg("");
    setIsRateLimited(false);
    setScanResult(null);
    setIsVirtualDetected(null);
    setProgressStage("initiated");
    setStreamingProviders([]);
    setProviderCount(0);
    setResearchedCategory("");
    setShowDashboard(false);
    setResearchedFacts([]);
    setLiveDetails(null);

    trackEngagement("click_cta", "check_visibility");

    setTimeout(() => {
      document.getElementById("scan-progress-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          domain: cleanDomain,
          business_name: "",
          industry: "",
          primary_city: "",
          primary_state: "",
          country: "",
          user_id: userSession?.id,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          setIsRateLimited(true);
          setLoading(false);
          return;
        }
        throw new Error(`Could not start check (error ${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Your browser could not read the live response");

      let buffer = "";
      let activeScanId = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.substring(7).trim();
            else if (line.startsWith("data: ")) dataStr = line.substring(6).trim();
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === "progress") {
              if (data.stage === "initiated") {
                setProgressStage("initiated");
                activeScanId = data.scan_id;
                upsertFact({ id: "init", label: "Status", value: "Check started" });
              } else if (data.stage === "validated") {
                setProgressStage("validated");
                upsertFact({ id: "val", label: "Website", value: "Verified" });
              } else if (data.stage === "classification") {
                setProgressStage("classification");
                setIsVirtualDetected(data.is_virtual);
                setResearchedCategory(data.industry || "");
                if (data.industry) {
                  upsertFact({ id: "ind", label: "Category", value: data.industry });
                }
                upsertFact({
                  id: "foot",
                  label: "Market",
                  value: data.is_virtual ? "Online business" : "Local customers",
                });
                if (data.radius_miles != null) {
                  upsertFact({
                    id: "rad",
                    label: "Service area",
                    value: `${data.radius_miles} mile radius`,
                  });
                }
                if (data.prompts_generated) {
                  upsertFact({
                    id: "prom",
                    label: "Searches prepared",
                    value: `${data.prompts_generated} customer-style questions`,
                  });
                }

                (async () => {
                  try {
                    const detailsRes = await fetch(
                      `${BACKEND_URL}/api/v1/scans/${data.scan_id || activeScanId}`
                    );
                    if (!detailsRes.ok) return;
                    const fullScan = await detailsRes.json();
                    setLiveDetails({
                      business_name: fullScan.business_name,
                      domain: fullScan.business_domain,
                      industry: fullScan.business_industry,
                      primary_city: fullScan.business_city,
                      primary_state: fullScan.business_state,
                      country: fullScan.business_country || "",
                      service_focuses: fullScan.business_service_focuses || [],
                      is_virtual: fullScan.is_virtual ?? data.is_virtual ?? false,
                      latitude: fullScan.business_latitude,
                      longitude: fullScan.business_longitude,
                      google_maps_url: fullScan.business_google_maps_url,
                      formatted_address: fullScan.business_formatted_address,
                    });
                    if (fullScan.business_name) {
                      upsertFact({ id: "name", label: "Business", value: fullScan.business_name });
                    }
                    if (fullScan.business_service_focuses?.[0]) {
                      upsertFact({
                        id: "svc",
                        label: "Top service",
                        value: fullScan.business_service_focuses[0],
                      });
                    }
                  } catch {
                    /* optional early details */
                  }
                })();
              } else if (data.stage === "geocoding") {
                setProgressStage("geocoding");
                upsertFact({ id: "geo", label: "Location", value: "Mapped" });
              } else if (data.stage === "querying_providers") {
                setProgressStage("querying_providers");
                setProviderCount(data.provider_count ?? 0);

                if (data.providers && Array.isArray(data.providers)) {
                  const initial = data.providers.map((p: unknown) => {
                    const row = typeof p === "string" ? { provider: p } : (p as Record<string, unknown>);
                    return {
                      provider: String(row.provider ?? ""),
                      model: (row.model as string | null) ?? null,
                      display_name: (row.display_name as string | null) ?? null,
                      config_id: (row.id as string | null) ?? (row.config_id as string | null) ?? null,
                      status: "loading" as const,
                      score: 0,
                      mentioned: false,
                      actionable: false,
                      domain_match: false,
                      rank_position: null,
                      error: null,
                    };
                  });
                  setStreamingProviders(initial);
                }

                setTimeout(() => setShowDashboard(true), 4000);
              }
            } else if (eventType === "provider_result") {
              setProgressStage("querying_providers");
              setStreamingProviders((prev) => {
                let matchIndex = -1;
                if (data.config_id) {
                  matchIndex = prev.findIndex((p) => p.config_id === data.config_id);
                }
                if (matchIndex === -1) {
                  const cleanModel = (m: string | null | undefined) =>
                    (m ?? "").toLowerCase().replace(/^(openrouter|gemini|groq|deepseek|mistral|perplexity|qwen)\//, "").trim();
                  matchIndex = prev.findIndex(
                    (p) =>
                      p.provider.toLowerCase() === data.provider.toLowerCase() &&
                      cleanModel(p.model) === cleanModel(data.model)
                  );
                }
                if (matchIndex === -1) {
                  matchIndex = prev.findIndex(
                    (p) => p.provider.toLowerCase() === data.provider.toLowerCase()
                  );
                }
                if (matchIndex !== -1) {
                  const next = [...prev];
                  next[matchIndex] = { ...next[matchIndex], ...(data as ProviderResult) };
                  return next;
                }
                return [...prev, data as ProviderResult];
              });
            } else if (eventType === "complete") {
              setProgressStage("complete");
              if (activeScanId) {
                const detailsRes = await fetch(`${BACKEND_URL}/api/v1/scans/${activeScanId}`);
                if (detailsRes.ok) {
                  const fullScan = await detailsRes.json();
                  setScanResult({
                    overallScore: fullScan.overall_score,
                    summary: fullScan.summary,
                    recommendations: fullScan.recommendations,
                    details: {
                      business_name: fullScan.business_name,
                      domain: fullScan.business_domain,
                      industry: fullScan.business_industry,
                      primary_city: fullScan.business_city,
                      primary_state: fullScan.business_state,
                      country: fullScan.business_country || "",
                      service_focuses: fullScan.business_service_focuses || [],
                      is_virtual: fullScan.is_virtual ?? isVirtualDetected ?? false,
                      latitude: fullScan.business_latitude,
                      longitude: fullScan.business_longitude,
                      google_maps_url: fullScan.business_google_maps_url,
                      formatted_address: fullScan.business_formatted_address,
                    },
                    providerResults: fullScan.results,
                    scanId: activeScanId,
                  });
                  trackEngagement("view_report", activeScanId);
                }
              }
              setLoading(false);
            } else if (eventType === "error") {
              setErrorMsg(data.message || "Something went wrong. Please try again.");
              setLoading(false);
            }
          } catch (err) {
            console.error("Scan stream parse error:", err);
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not connect to the server.";
      setErrorMsg(message);
      setLoading(false);
    }
  }, [
    domain,
    authToken,
    userSession,
    isVirtualDetected,
    trackEngagement,
    upsertFact,
  ]);

  const completedProviders = streamingProviders.filter((p) => p.status !== "loading");
  const activeResults = loading ? streamingProviders : scanResult?.providerResults || [];

  const liveOverallScore = loading
    ? completedProviders.length > 0
      ? Math.round(
          completedProviders.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedProviders.length
        )
      : 0
    : scanResult?.overallScore || 0;

  const liveSummary = loading
    ? {
        green: completedProviders.filter((p) => p.status === "green").length,
        yellow: completedProviders.filter((p) => p.status === "yellow").length,
        red: completedProviders.filter((p) => p.status === "red").length,
      }
    : scanResult?.summary || { green: 0, yellow: 0, red: 0 };

  const liveRecommendations = loading ? [] : scanResult?.recommendations || [];

  const liveResearchedDetails: ResearchedDetails =
    liveDetails ||
    ({
      business_name: domain.split(".")[0] || "Your business",
      domain,
      industry: researchedCategory || "Analyzing…",
      primary_city: "",
      primary_state: "",
      country: "US",
      service_focuses: isVirtualDetected ? ["Online business"] : [],
      is_virtual: isVirtualDetected ?? false,
    } as ResearchedDetails);

  const clearRateLimit = useCallback(() => {
    setIsRateLimited(false);
    setProgressStage("");
    setDomain("");
    setErrorMsg("");
  }, []);

  return {
    domain,
    setDomain,
    loading,
    progressStage,
    progressMessage,
    errorMsg,
    isRateLimited,
    clearRateLimit,
    researchedFacts,
    showDashboard,
    scanResult,
    startScan,
    resetScan,
    activeResults,
    liveOverallScore,
    liveSummary,
    liveRecommendations,
    liveResearchedDetails,
    providerCount,
  };
}
