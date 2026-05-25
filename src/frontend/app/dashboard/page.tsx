"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";
import { ProviderResult } from "../../components/ResultsDashboard";

// Modular Dashboard Components
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import ProfileTab from "../../components/dashboard/ProfileTab";
import AuditTab from "../../components/dashboard/AuditTab";
import HistoryTab from "../../components/dashboard/HistoryTab";
import SettingsTab from "../../components/dashboard/SettingsTab";
import VerificationGate from "../../components/VerificationGate";
import LeadsTab from "../../components/dashboard/LeadsTab";
import TeamTab from "../../components/dashboard/TeamTab";

const ALL_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CV", name: "Cape Verde" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KP", name: "North Korea" },
  { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MK", name: "Macedonia" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SZ", name: "Swaziland" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" }
];

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  tier: string;
  is_verified: boolean;
  team_id: string | null;
  team_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  businesses: Array<{
    id: string;
    name: string;
    domain: string;
    industry: string;
    primary_city: string;
    primary_state: string;
    country: string;
    service_focuses: string[];
    target_suburbs: string[];
    formatted_address: string | null;
  }>;
}

export default function UserDashboard() {
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Onboarding Wizard States
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);

  // Phase 1: User details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Phase 2: Organization
  const [orgName, setOrgName] = useState("");

  // Phase 3: Business profile
  const [bizName, setBizName] = useState("");
  const [bizDomain, setBizDomain] = useState("");
  const [bizIndustry, setBizIndustry] = useState("");
  const [bizCity, setBizCity] = useState("");
  const [bizState, setBizState] = useState("");
  const [bizCountry, setBizCountry] = useState("US");
  const [serviceFocusStr, setServiceFocusStr] = useState("");
  const [targetSuburbsStr, setTargetSuburbsStr] = useState("");

  // Active Tab panel state
  const [activeTab, setActiveTab] = useState<"profile" | "audit" | "history" | "settings" | "leads" | "team">("profile");

  // Dashboard Active Scanner Hub States
  const [scanDomain, setScanDomain] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanProgressStage, setScanProgressStage] = useState("");
  const [scanStreamingProviders, setScanStreamingProviders] = useState<ProviderResult[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  const [showActiveDashboardReport, setShowActiveDashboardReport] = useState(false);

  // Past Scans History States
  const [historyLoading, setHistoryLoading] = useState(false);
  const [scansHistory, setScansHistory] = useState<any[]>([]);
  const [selectedHistoricalScan, setSelectedHistoricalScan] = useState<any>(null);

  // Subscription Upgrading state
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Load active session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionUser(session.user);
        setAuthToken(session.access_token);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSessionUser(session.user);
        setAuthToken(session.access_token);
      } else {
        setSessionUser(null);
        setAuthToken(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch complete profile using authenticated token
  const fetchProfile = async (token: string) => {
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Unable to retrieve user dashboard directory context.");
      }
      const data: ProfileData = await res.json();
      setProfile(data);
      
      // Auto fill onboarding states with current info if present
      if (data.first_name) setFirstName(data.first_name);
      if (data.last_name) setLastName(data.last_name);
      if (data.phone) setPhone(data.phone);

      // Auto populate scan domain
      if (data.businesses && data.businesses.length > 0) {
        setScanDomain(data.businesses[0].domain);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load dashboard profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchProfile(authToken);
    }
  }, [authToken]);

  // Fetch Past Scans History list
  const fetchScansHistory = async () => {
    if (!authToken) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/scans`, {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setScansHistory(data);
      }
    } catch (err) {
      console.error("Failed to load historical scan logs", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.organization_id && profile.organization_id !== "00000000-0000-0000-0000-000000000000") {
      fetchScansHistory();
    }
  }, [profile]);

  // Check if onboarding is required
  const requiresOnboarding = !profile || (
    ["user", "client"].includes(profile.role) && (
      !profile.organization_id || 
      profile.organization_id === "00000000-0000-0000-0000-000000000000" ||
      profile.businesses.length === 0
    )
  );

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !profile) return;
    
    setSubmittingOnboarding(true);
    setErrorMsg("");

    try {
      // 1. Update user contact
      const userRes = await fetch(`${BACKEND_URL}/api/v1/users/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: phone
        })
      });

      if (!userRes.ok) {
        const errText = await userRes.text().catch(() => "");
        throw new Error("Failed to update user profile parameters: " + errText);
      }

      // 2. Create organization
      const orgRes = await fetch(`${BACKEND_URL}/api/v1/organizations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: orgName
        })
      });

      if (!orgRes.ok) {
        const errText = await orgRes.text().catch(() => "");
        throw new Error("Failed to register custom parent franchise organization: " + errText);
      }
      const orgData = await orgRes.json();
      const newOrgId = orgData.id;

      // 3. Link user to organization
      const linkRes = await fetch(`${BACKEND_URL}/api/v1/users/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          organization_id: newOrgId
        })
      });

      if (!linkRes.ok) {
        const errText = await linkRes.text().catch(() => "");
        throw new Error("Failed to link user profile to franchise organization: " + errText);
      }

      // 4. Register location business
      const serviceFocuses = serviceFocusStr.split(",").map(s => s.trim()).filter(Boolean);
      const targetSuburbs = targetSuburbsStr.split(",").map(s => s.trim()).filter(Boolean);

      const bizRes = await fetch(`${BACKEND_URL}/api/v1/businesses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          organization_id: newOrgId,
          name: bizName,
          domain: bizDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0],
          industry: bizIndustry,
          primary_city: bizCity,
          primary_state: bizState,
          country: bizCountry,
          service_focuses: serviceFocuses,
          target_suburbs: targetSuburbs
        })
      });

      if (!bizRes.ok) {
        const errorDetail = await bizRes.json().catch(() => ({}));
        throw new Error(errorDetail.detail || "Failed to register physical storefront location parameters.");
      }

      // Reload profile
      await fetchProfile(authToken);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit onboarding parameters.");
    } finally {
      setSubmittingOnboarding(false);
    }
  };

  // Run dynamic visibility scan audit inside dashboard
  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanDomain.trim() || !authToken) return;

    let cleanDomain = scanDomain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, "");
    cleanDomain = cleanDomain.split("/")[0];

    setScanLoading(true);
    setScanError("");
    setScanResult(null);
    setScanProgressStage("initiated");
    setScanStreamingProviders([]);
    setShowActiveDashboardReport(false);
    setSelectedHistoricalScan(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          domain: cleanDomain,
          business_name: "",
          industry: "",
          primary_city: "",
          primary_state: "",
          country: "",
          user_id: profile?.id
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errBody = await response.json().catch(() => ({ detail: "" }));
          setScanError(errBody.detail || "Rate limit exceeded. Active tier upgrade required.");
          setScanLoading(false);
          return;
        }
        throw new Error(`HTTP node server failure: status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("ReadableStream not supported by local environment.");

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

          const lines = block.split("\n");
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.substring(6).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventType === "progress") {
                if (data.stage === "initiated") {
                  setScanProgressStage("initiated");
                  activeScanId = data.scan_id;
                } else if (data.stage === "validated") {
                  setScanProgressStage("validated");
                } else if (data.stage === "classification") {
                  setScanProgressStage("classification");
                } else if (data.stage === "geocoding") {
                  setScanProgressStage("geocoding");
                } else if (data.stage === "querying_providers") {
                  setScanProgressStage("querying_providers");
                  setShowActiveDashboardReport(true);
                  
                  if (data.providers && Array.isArray(data.providers)) {
                    setScanStreamingProviders(data.providers.map((p: any) => ({
                      provider: p.provider,
                      model: p.model,
                      display_name: p.display_name,
                      config_id: p.id || p.config_id || null,
                      status: "loading",
                      score: 0,
                      mentioned: false,
                      actionable: false,
                      domain_match: false,
                      rank_position: null,
                      error: null
                    })));
                  }
                }
              } else if (eventType === "provider_result") {
                setScanStreamingProviders((prev) => {
                  let matchIndex = -1;

                  const cleanId = (id: string | null | undefined) => {
                    if (!id) return "";
                    return id.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
                  };

                  if (data.config_id) {
                    matchIndex = prev.findIndex(
                      (p) => cleanId(p.config_id) === cleanId(data.config_id)
                    );
                  }

                  if (matchIndex === -1) {
                    const cleanModel = (m: string | null | undefined) => {
                      if (!m) return "";
                      return m.toLowerCase().replace(/^(openrouter|gemini|groq|deepseek|mistral|perplexity|qwen)\//, "").trim();
                    };

                    matchIndex = prev.findIndex(
                      (p) =>
                        p.provider.toLowerCase() === data.provider.toLowerCase() &&
                        cleanModel(p.model) === cleanModel(data.model)
                    );
                  }

                  if (matchIndex === -1) {
                    matchIndex = prev.findIndex(
                      (p) =>
                        p.provider.toLowerCase() === data.provider.toLowerCase()
                    );
                  }

                  if (matchIndex !== -1) {
                    const next = [...prev];
                    next[matchIndex] = { ...next[matchIndex], ...data };
                    return next;
                  } else {
                    return [...prev, data];
                  }
                });
              } else if (eventType === "complete") {
                setScanProgressStage("complete");
                
                if (activeScanId) {
                  const detailsRes = await fetch(`${BACKEND_URL}/api/v1/scans/${activeScanId}`, {
                    headers: { "Authorization": `Bearer ${authToken}` }
                  });
                  if (detailsRes.ok) {
                    const fullScan = await detailsRes.json();
                    setScanResult(fullScan);
                  }
                }
                
                setScanLoading(false);
                fetchScansHistory(); // Refresh history
              } else if (eventType === "error") {
                setScanError(data.message);
                setScanLoading(false);
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || "Failed to establish connection to monitoring nodes.");
      setScanLoading(false);
    }
  };

  // Upgrade active tier (Subscription Simulation)
  const handleUpgradeTier = async (targetTier: string) => {
    if (!authToken || !profile) return;
    setUpgradingTier(targetTier);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          tier: targetTier
        })
      });

      if (!res.ok) throw new Error("Failed to complete subscription integration handshake.");
      
      await fetchProfile(authToken);
      alert(`Subscription setup complete! You are now subscribed to the ${targetTier === "enterprise" ? "ULTRA PREMIUM" : "PREMIUM"} package.`);
    } catch (err: any) {
      alert(`Subscription failed: ${err.message}`);
    } finally {
      setUpgradingTier(null);
    }
  };

  // Load a historical scan from the tracker log
  const handleSelectHistoricalScan = async (scanId: string) => {
    if (!authToken) return;
    setSelectedHistoricalScan(null);
    setShowActiveDashboardReport(false);
    setScanResult(null);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/scans/${scanId}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedHistoricalScan(data);
        
        setTimeout(() => {
          document.getElementById("history-report-display")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        alert("Failed to load historical scan scorecard.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background blueprint-bg">
        <div className="border border-foreground/10 bg-white p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] rounded-none">
          <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block mb-4">
            ◆ DEPLOYING SECURE MONITORING NODES...
          </span>
          <p className="font-sans text-xs text-text-muted">Connecting to Iozera GeoTracker Core Services.</p>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background blueprint-bg px-6">
        <div className="max-w-md w-full border border-rose-600/30 bg-rose-600/5 p-8 text-center shadow-lg bg-white rounded-none">
          <span className="font-mono text-xs font-bold text-rose-600 block uppercase mb-4">
            [ACCESS RESTRICTED]
          </span>
          <h2 className="font-display text-xl font-bold uppercase mb-4 text-black">Secure Sign-In Required</h2>
          <p className="font-sans text-xs text-text-muted mb-8 leading-relaxed">
            Please log in via the primary client portal home page to unlock franchises directory registries and historical audits trackers.
          </p>
          <Link href="/" className="font-mono text-xs px-6 py-3 bg-[#0055FF] text-white hover:bg-primary-hover transition-all uppercase font-bold block rounded-none">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ── SECURITY VERIFICATION WALL GATE ──
  if (profile && ["agent", "team_leader"].includes(profile.role) && !profile.is_verified) {
    return (
      <VerificationGate
        userEmail={profile.email}
        onRefresh={() => authToken && fetchProfile(authToken)}
      />
    );
  }

  // ── ONBOARDING PROCESS WIZARD ──
  if (requiresOnboarding) {
    return (
      <div className="min-h-screen blueprint-bg pt-20 pb-20 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl bg-[#FAF9F6] border-2 border-foreground p-8 md:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none relative">
          
          {/* Header indicator */}
          <div className="flex justify-between items-center border-b border-foreground/20 pb-4 mb-6">
            <div>
              <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-1">
                ◆ Security Registry Setup Protocol
              </span>
              <h2 className="font-display text-2xl font-black uppercase text-black">
                Account Onboarding
              </h2>
            </div>
            <div className="font-mono text-xs bg-black text-white px-2 py-0.5 font-bold uppercase rounded-none">
              Phase {onboardingStep} / 3
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 border border-rose-600 bg-rose-600/5 text-rose-600 font-mono text-[10px] font-bold uppercase">
              [ONBOARDING ERROR]: {errorMsg}
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleCompleteOnboarding} className="space-y-6">
            
            {/* STAGE 1: Profile setup */}
            {onboardingStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <p className="font-sans text-xs text-text-muted mb-4 font-bold">
                  Let's begin by configuring your user account profile metadata parameters.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                    />
                  </div>
                </div>
                <div className="pt-6 border-t border-foreground/10 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    disabled={!firstName || !lastName}
                    className="font-mono text-xs tracking-wider bg-[#0055FF] text-white px-6 py-3 hover:bg-primary-hover font-black uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-none"
                  >
                    Continue to Organization →
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 2: Organization Setup */}
            {onboardingStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <p className="font-sans text-xs text-text-muted mb-4 font-bold">
                  Define your parent franchise organization name, or enter your business company name.
                </p>
                <div>
                  <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Organization / Franchise Name</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Urban Smiles Group"
                    className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                  />
                  <span className="font-mono text-[9px] text-text-muted uppercase block mt-1 leading-normal">
                    *Multiple locations and storefront directory profiles will be registered under this group directory.
                  </span>
                </div>

                <div className="pt-6 border-t border-foreground/10 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="font-mono text-xs tracking-wider border border-foreground/30 text-foreground px-6 py-3 hover:bg-black/5 font-bold uppercase transition-all cursor-pointer rounded-none"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(3)}
                    disabled={!orgName}
                    className="font-mono text-xs tracking-wider bg-[#0055FF] text-white px-6 py-3 hover:bg-primary-hover font-black uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-none"
                  >
                    Continue to Storefront →
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: Location storefront details */}
            {onboardingStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <p className="font-sans text-xs text-text-muted mb-4 font-bold">
                  Configure the primary storefront location details for monitoring.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Storefront Name</label>
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      placeholder="Urban Smiles Dentistry - Houston"
                      className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Target Website Domain</label>
                    <input
                      type="text"
                      required
                      value={bizDomain}
                      onChange={(e) => setBizDomain(e.target.value)}
                      placeholder="urbansmiles.com"
                      className="w-full font-mono text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Industry / Category</label>
                    <input
                      type="text"
                      required
                      value={bizIndustry}
                      onChange={(e) => setBizIndustry(e.target.value)}
                      placeholder="Modern Dentistry & Orthodontics"
                      className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Country Code</label>
                    <select
                      value={bizCountry}
                      onChange={(e) => setBizCountry(e.target.value)}
                      className="w-full font-mono text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                    >
                      {ALL_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Primary City</label>
                    <input
                      type="text"
                      required
                      value={bizCity}
                      onChange={(e) => setBizCity(e.target.value)}
                      placeholder="Houston"
                      className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Primary State (Optional)</label>
                    <input
                      type="text"
                      value={bizState}
                      onChange={(e) => setBizState(e.target.value)}
                      placeholder="e.g. Texas"
                      className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Service Offerings (Comma-separated)</label>
                  <input
                    type="text"
                    value={serviceFocusStr}
                    onChange={(e) => setServiceFocusStr(e.target.value)}
                    placeholder="Invisalign, Teeth Whitening, Cosmetic Crowns"
                    className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                  />
                </div>

                <div>
                  <label className="font-mono text-[9px] text-[#0055FF] uppercase block mb-1.5 font-bold">Target Geographic Suburbs (Comma-separated)</label>
                  <input
                    type="text"
                    value={targetSuburbsStr}
                    onChange={(e) => setTargetSuburbsStr(e.target.value)}
                    placeholder="Downtown, Memorial, Heights"
                    className="w-full font-sans text-xs border border-foreground/30 px-3 py-2.5 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                  />
                </div>

                <div className="pt-6 border-t border-foreground/10 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="font-mono text-xs tracking-wider border border-foreground/30 text-foreground px-6 py-3 hover:bg-black/5 font-bold uppercase transition-all cursor-pointer rounded-none"
                  >
                    ← Back
                  </button>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="submit"
                      disabled={submittingOnboarding || !bizName || !bizDomain || !bizIndustry || !bizCity}
                      className="font-mono text-xs tracking-widest bg-emerald-600 text-white px-8 py-3.5 hover:bg-emerald-700 font-black uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border border-black rounded-none"
                    >
                      {submittingOnboarding ? "SUBMITTING HANDSHAKE..." : "[✓ COMPLETE SECURE SETUP]"}
                    </button>
                    {(!bizName || !bizDomain || !bizIndustry || !bizCity) && (
                      <span className="font-mono text-[9px] text-rose-600 block text-right font-bold">
                        *Missing required fields: {[!bizName && "Name", !bizDomain && "Domain", !bizIndustry && "Industry", !bizCity && "City"].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ── MAIN ACTIVE USER DASHBOARD PANEL ──
  const activeBusiness = profile.businesses[0] || null;

  return (
    <>
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
            GeoTracker
          </Link>
          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
            User Workspace
          </span>
        </div>
        <Link
          href="/"
          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-[#0055FF] hover:text-white transition-all uppercase font-bold"
        >
          [HOME PORTAL]
        </Link>
      </nav>

      {/* Two-Column Responsive Workspace Area */}
      <main className="pt-16 min-h-screen flex flex-col md:flex-row">
        
        {/* Persistent Left Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={profile}
        />

        {/* Dynamic Panel Viewport */}
        <section className="flex-1 bg-white p-6 md:p-10 overflow-y-auto min-h-[600px]">
          
          {activeTab === "profile" && (
            <ProfileTab profile={profile} />
          )}

          {activeTab === "audit" && (
            <AuditTab
              scanDomain={scanDomain}
              setScanDomain={setScanDomain}
              scanLoading={scanLoading}
              scanProgressStage={scanProgressStage}
              scanError={scanError}
              showActiveDashboardReport={showActiveDashboardReport}
              scanResult={scanResult}
              scanStreamingProviders={scanStreamingProviders}
              handleStartScan={handleStartScan}
              activeBusiness={activeBusiness}
            />
          )}

          {activeTab === "history" && (
            <HistoryTab
              scansHistory={scansHistory}
              historyLoading={historyLoading}
              selectedHistoricalScan={selectedHistoricalScan}
              handleSelectHistoricalScan={handleSelectHistoricalScan}
              setSelectedHistoricalScan={setSelectedHistoricalScan}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              profile={profile}
              upgradingTier={upgradingTier}
              handleUpgradeTier={handleUpgradeTier}
            />
          )}

          {activeTab === "leads" && profile && (
            <LeadsTab
              authToken={authToken}
              userRole={profile.role}
            />
          )}

          {activeTab === "team" && profile && (
            <TeamTab
              authToken={authToken}
              teamId={profile.team_id}
              teamName={profile.team_name}
            />
          )}

        </section>
      </main>
    </>
  );
}
