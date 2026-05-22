"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

interface ProviderConfig {
  id: string;
  provider: string;
  model: string;
  api_base: string | null;
  is_active: boolean;
  timeout_seconds: number;
  has_key: boolean;
}

interface SystemConfig {
  id: string;
  key: string;
  is_encrypted: boolean;
  has_value: boolean;
  created_at: string;
  updated_at: string;
}

interface SavingStates {
  [key: string]: boolean;
}

export default function AdminProviders() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [savingStates, setSavingStates] = useState<SavingStates>({});
  const [savingSystemStates, setSavingSystemStates] = useState<SavingStates>({});
  
  // Local form state for API keys to allow editing
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});
  const [systemKeys, setSystemKeys] = useState<{ [key: string]: string }>({});
  
  // State for the Create Platform form
  const [newProvider, setNewProvider] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newApiBase, setNewApiBase] = useState("");
  const [newTimeout, setNewTimeout] = useState(15);
  const [newApiKey, setNewApiKey] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const scrollToCreateForm = () => {
    setShowCreateForm(true);
    setTimeout(() => {
      document.getElementById("create-provider-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  
  // Console logging state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const consoleContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.trim() || !newModel.trim()) {
      setErrorMsg("Provider code and model name are required.");
      addLog("[ERROR] CREATE_FAIL: Missing required form fields.");
      return;
    }

    setCreating(true);
    addLog(`CREATE: Registering custom AI Platform [${newProvider.toUpperCase()}]...`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/providers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: newProvider.trim().toLowerCase(),
          model: newModel.trim(),
          api_base: newApiBase.trim() || null,
          is_active: newIsActive,
          timeout_seconds: Number(newTimeout),
          api_key: newApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const created = await response.json();
      addLog(`[SUCCESS] CREATE: Custom Platform [${created.provider.toUpperCase()}] registered successfully.`);
      
      // Reset form fields
      setNewProvider("");
      setNewModel("");
      setNewApiBase("");
      setNewTimeout(15);
      setNewApiKey("");
      setNewIsActive(true);
      setShowCreateForm(false);

      // Refresh configs list
      await fetchConfigs(true);
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] CREATE_FAIL: Registration failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfig = async (id: string, providerName: string) => {
    const confirmDelete = window.confirm(`Are you absolutely sure you want to delete the [${providerName.toUpperCase()}] engine registry?`);
    if (!confirmDelete) return;

    addLog(`DELETE: Removing AI Platform [${providerName.toUpperCase()}] registry...`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/providers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      addLog(`[SUCCESS] DELETE: Platform [${providerName.toUpperCase()}] completely de-registered from core database.`);
      
      // Refresh configs list
      await fetchConfigs(true);
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] DELETE_FAIL: De-registration failed for [${providerName.toUpperCase()}]: ${err.message}`);
    }
  };

  // Fetch configs on load
  const fetchConfigs = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      addLog("LOAD: Fetching AI Search Platforms and System Configurations from local database...");
    }
    
    try {
      // 1. Fetch AI Search Platforms
      const response = await fetch(`${BACKEND_URL}/api/v1/providers`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data: ProviderConfig[] = await response.json();
      setConfigs(data);
      
      // Initialize API keys to "__NO_CHANGE__" for platforms that have a key
      const keysMap: { [key: string]: string } = {};
      data.forEach((c) => {
        keysMap[c.provider] = c.has_key ? "__NO_CHANGE__" : "";
      });
      setApiKeys(keysMap);

      // 2. Fetch System Configurations
      const sysResponse = await fetch(`${BACKEND_URL}/api/v1/configs`);
      if (!sysResponse.ok) {
        throw new Error(`HTTP error ${sysResponse.status}`);
      }
      const sysData: SystemConfig[] = await sysResponse.json();
      setSystemConfigs(sysData);

      // Initialize system keys to "__NO_CHANGE__" if they have value
      const sysKeysMap: { [key: string]: string } = {};
      sysData.forEach((c) => {
        sysKeysMap[c.key] = c.has_value ? "__NO_CHANGE__" : "";
      });
      setSystemKeys(sysKeysMap);
      
      if (!silent) {
        addLog(`CONFIG: Successfully loaded ${data.length} engine configurations and ${sysData.length} system parameters.`);
        addLog("GATEWAY: Dashboard interface synchronized.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load dashboard configurations.");
      addLog(`[ERROR] LOAD_FAIL: Unable to sync dashboard configurations. ${err.message}`);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    addLog("INIT: Starting secure dashboard connection...");
    addLog("GATEWAY: Active registry online.");
    fetchConfigs();
  }, []);


  // Update a specific field inside the local config array
  const handleFieldChange = (provider: string, field: keyof ProviderConfig, value: any) => {
    setConfigs((prev) =>
      prev.map((c) => (c.provider === provider ? { ...c, [field]: value } : c))
    );
  };

  // Update API key field locally
  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }));
  };

  // Save a single platform's config
  const handleSaveConfig = async (providerName: string) => {
    const config = configs.find((c) => c.provider === providerName);
    if (!config) return;

    setSavingStates((prev) => ({ ...prev, [providerName]: true }));
    addLog(`SAVE: Initiating synchronization for AI Platform [${providerName.toUpperCase()}]...`);

    const apiKeyVal = apiKeys[providerName] || "";

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/providers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          api_base: config.api_base || null,
          is_active: config.is_active,
          timeout_seconds: Number(config.timeout_seconds),
          api_key: apiKeyVal,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const updated = await response.json();
      
      addLog(`[SUCCESS] SYNC: Platform [${providerName.toUpperCase()}] successfully saved.`);
      addLog(`SYNC: Model = "${updated.model}", Active = ${updated.is_active ? "TRUE" : "FALSE"}, Key Saved = ${updated.has_key ? "YES" : "NO"}`);
      
      // Update has_key state and reset API key field to "__NO_CHANGE__" if needed
      setConfigs((prev) =>
        prev.map((c) => (c.provider === providerName ? { ...c, has_key: updated.has_key } : c))
      );
      if (updated.has_key) {
        setApiKeys((prev) => ({ ...prev, [providerName]: "__NO_CHANGE__" }));
      }
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] SYNC_FAIL: Save failed for [${providerName.toUpperCase()}]: ${err.message}`);
    } finally {
      setSavingStates((prev) => ({ ...prev, [providerName]: false }));
    }
  };

  // Save a single system config key
  const handleSaveSystemConfig = async (keyName: string) => {
    const config = systemConfigs.find((c) => c.key === keyName);
    if (!config) return;

    setSavingSystemStates((prev) => ({ ...prev, [keyName]: true }));
    addLog(`SAVE: Initiating synchronization for System Configuration [${keyName.toUpperCase()}]...`);

    const valueVal = systemKeys[keyName] || "";

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/configs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: keyName,
          value: valueVal,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const updated = await response.json();
      
      addLog(`[SUCCESS] SYNC: System Configuration [${keyName.toUpperCase()}] successfully saved.`);
      
      // Update has_value state and reset system API key field to "__NO_CHANGE__" if needed
      setSystemConfigs((prev) =>
        prev.map((c) => (c.key === keyName ? { ...c, has_value: updated.has_value } : c))
      );
      if (updated.has_value) {
        setSystemKeys((prev) => ({ ...prev, [keyName]: "__NO_CHANGE__" }));
      }
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] SYNC_FAIL: Save failed for [${keyName.toUpperCase()}]: ${err.message}`);
    } finally {
      setSavingSystemStates((prev) => ({ ...prev, [keyName]: false }));
    }
  };


  // Helper translations for display titles & descriptions
  const getPlatformDetails = (provider: string) => {
    switch (provider) {
      case "gemini_grounding":
        return {
          title: "Google Gemini (Search Grounding)",
          desc: "Dedicated search engine configuration used specifically for initial web grounding and business classification.",
        };
      case "gemini":
        return {
          title: "Google Gemini (Parallel Auditing)",
          desc: "Direct integration with Google's native multimodal LLM search indexing architecture.",
        };
      case "perplexity":
        return {
          title: "Perplexity AI",
          desc: "Real-time citation tracking engine that queries index networks in parallel.",
        };
      case "groq":
        return {
          title: "Groq (Llama)",
          desc: "High-throughput model execution engine for ultra-low latency brand citation discovery.",
        };
      case "deepseek":
        return {
          title: "DeepSeek AI",
          desc: "Deeply aligned, cost-efficient reasoning model for complex relational query extraction.",
        };
      case "mistral":
        return {
          title: "Mistral AI",
          desc: "European open-source standard for flexible local semantic visibility audits.",
        };
      default:
        return {
          title: provider.toUpperCase(),
          desc: "AI search engine configuration used for visibility tracking.",
        };
    }
  };


  return (
    <>
      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav
        id="top-nav"
        className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border"
      >
        <div className="flex items-center gap-8">
          <Link href="/admin" className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
            GeoTracker
          </Link>
          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
            Operator Settings / AI Providers
          </span>
        </div>
        <Link
          href="/admin"
          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold"
        >
          [← RETURN TO PORTAL]
        </Link>
      </nav>

      <main className="pt-16 min-h-screen blueprint-bg flex flex-col justify-between">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
          {/* Header Description Section */}
          <div className="mb-12 border-b border-foreground/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                ADMINISTRATION & ENGINE SETTINGS
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                AI Search Platforms
              </h1>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 shrink-0">
              <p className="font-sans text-sm text-text-muted max-w-sm leading-relaxed">
                Configure the API endpoint URLs, active AI model versions, and secure API keys utilized by the AI search agents. All keys are encrypted.
              </p>
              <button
                onClick={scrollToCreateForm}
                className="font-mono text-xs tracking-tighter bg-foreground text-background border border-foreground px-6 py-3 hover:bg-primary hover:text-white transition-all uppercase font-bold shrink-0"
              >
                [+ ADD CUSTOM ENGINE]
              </button>
            </div>
          </div>


          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center my-8">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse block uppercase font-bold">
                ● SYNCHRONIZING WITH DATABASE SCHEMA...
              </span>
            </div>
          ) : errorMsg ? (
            <div className="w-full border border-rose-600/30 bg-rose-600/5 p-8 text-center my-8">
              <span className="font-mono text-xs font-bold text-rose-600 block uppercase mb-2">
                [SYNC ERROR] {errorMsg}
              </span>
              <button
                onClick={() => fetchConfigs()}
                className="font-mono text-xs bg-rose-600 text-white px-5 py-2.5 hover:bg-rose-700 transition-all font-bold uppercase"
              >
                Retry Sync
              </button>
            </div>

          ) : (
            <div className="space-y-8 mb-12">
              {/* Dedicated External Search Integrations Section */}
              <div className="border border-primary/20 bg-background/80 backdrop-blur-sm p-6 md:p-8 hover:border-primary/45 transition-all duration-300 relative overflow-hidden">
                {/* Micro-glow effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-foreground/10 pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter animate-pulse">
                        SYSTEM INTEGRATION
                      </span>
                      <span className="font-mono text-[10px] bg-foreground text-background px-2 py-0.5 uppercase font-bold tracking-tighter">
                        GLOBAL SEARCH INDEX
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
                      External Search Integrations
                    </h2>
                    <p className="font-sans text-xs text-text-muted mt-2 max-w-2xl leading-relaxed">
                      Configure third-party API indexes that allow our autonomous agents to gather real-time web search grounding and brand citation signals.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
                      Google Serper Dev Integration
                    </h3>
                    <p className="font-sans text-xs text-text-muted leading-relaxed">
                      Used by parallel LLM audits to query Google Search index pages. If not configured, agents will fall back to DuckDuckGo parsing, which is slower and rate-limited.
                    </p>
                    
                    <div className="pt-2">
                      <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                        Serper Dev API Key
                      </label>
                      <div className="relative max-w-xl">
                        <input
                          type="password"
                          value={systemKeys["serper_api_key"] || ""}
                          onChange={(e) => setSystemKeys(prev => ({ ...prev, serper_api_key: e.target.value }))}
                          className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 pr-20 text-foreground"
                          placeholder={systemConfigs.find(c => c.key === "serper_api_key")?.has_value ? "••••••••••••••••" : "Configure Serper API Key"}
                        />
                        {systemConfigs.find(c => c.key === "serper_api_key")?.has_value && systemKeys["serper_api_key"] === "__NO_CHANGE__" && (
                          <span className="absolute right-0 top-2 font-mono text-[8px] bg-primary/10 text-primary border border-primary/20 px-1 py-0.5 uppercase font-bold tracking-tighter">
                            SECURED (FERNET)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end items-end md:border-l md:border-foreground/10 md:pl-8">
                    <button
                      onClick={() => handleSaveSystemConfig("serper_api_key")}
                      disabled={savingSystemStates["serper_api_key"]}
                      className="w-full md:w-auto font-mono text-xs tracking-tighter bg-primary text-white px-8 py-3.5 hover:bg-primary-hover disabled:bg-primary/50 transition-all uppercase font-bold flex items-center justify-center gap-2"
                    >
                      {savingSystemStates["serper_api_key"] ? (
                        <>
                          <span className="inline-block w-2 h-2 bg-white animate-ping"></span>
                          SYNCHRONIZING...
                        </>
                      ) : (
                        "SAVE_SEARCH_CREDENTIALS"
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Title separator for AI engines */}
              <div className="pt-4 border-t border-foreground/10">
                <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                  PARALLEL MULTI-ENGINE COMPLETIONS
                </span>
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
                  LLM Provider Registries
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {configs.map((config) => {
                const details = getPlatformDetails(config.provider);
                const isSaving = savingStates[config.provider] || false;
                const apiKeyVal = apiKeys[config.provider] || "";
                const hasSavedKey = config.has_key;

                return (
                  <div
                    key={config.provider}
                    className="border border-foreground/10 bg-background flex flex-col justify-between transition-all duration-300 hover:border-foreground/20"
                  >
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-foreground/10 bg-surface-container-low flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-[10px] bg-foreground text-background px-2 py-0.5 uppercase font-bold tracking-tighter">
                            {config.provider.toUpperCase()}
                          </span>
                          <span className={`w-2.5 h-2.5 ${config.is_active ? "bg-emerald-600" : "bg-foreground/20"}`}></span>
                        </div>
                        <h3 className="font-display text-[1.6rem] font-bold uppercase tracking-tight text-foreground">
                          {details.title}
                        </h3>
                        <p className="font-sans text-xs text-text-muted leading-relaxed mt-2">
                          {details.desc}
                        </p>
                      </div>
                      
                      {/* Active Status Switch */}
                      <button
                        onClick={() => handleFieldChange(config.provider, "is_active", !config.is_active)}
                        className={`font-mono text-[10px] font-bold px-3 py-1.5 border transition-all uppercase ${
                          config.is_active
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-transparent border-foreground/20 text-text-muted hover:border-foreground"
                        }`}
                      >
                        {config.is_active ? "ENABLED" : "DISABLED"}
                      </button>
                    </div>

                    {/* Configuration Form */}
                    <div className="p-6 md:p-8 space-y-5 flex-grow">
                      {/* AI Brain Version */}
                      <div>
                        <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                          AI Brain Version
                        </label>
                        <input
                          type="text"
                          value={config.model}
                          onChange={(e) => handleFieldChange(config.provider, "model", e.target.value)}
                          className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground"
                          placeholder="e.g. provider/model-name"
                        />
                      </div>

                      {/* Connection Address */}
                      <div>
                        <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                          Connection Address (Optional)
                        </label>
                        <input
                          type="text"
                          value={config.api_base || ""}
                          onChange={(e) => handleFieldChange(config.provider, "api_base", e.target.value)}
                          className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground placeholder:text-foreground/20"
                          placeholder="Default Platform Endpoint"
                        />
                      </div>

                      {/* Search Limit & Access Credentials */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Search Limit */}
                        <div>
                          <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                            Search Limit (Seconds)
                          </label>
                          <input
                            type="number"
                            value={config.timeout_seconds}
                            onChange={(e) => handleFieldChange(config.provider, "timeout_seconds", e.target.value)}
                            className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground"
                            min={1}
                            max={120}
                          />
                        </div>

                        {/* Access Credentials */}
                        <div>
                          <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                            Access Key / Credentials
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              value={apiKeyVal}
                              onChange={(e) => handleApiKeyChange(config.provider, e.target.value)}
                              className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground"
                              placeholder={hasSavedKey ? "••••••••••••••••" : "Empty Access Key"}
                            />
                            {hasSavedKey && apiKeyVal === "__NO_CHANGE__" && (
                              <span className="absolute right-0 top-2 font-mono text-[8px] bg-primary/10 text-primary border border-primary/20 px-1 py-0.5 uppercase font-bold tracking-tighter">
                                SECURED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-6 md:p-8 bg-surface-container-low border-t border-foreground/10 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[9px] text-text-muted uppercase">
                          ID: {config.provider}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteConfig(config.id, config.provider)}
                          className="font-mono text-[10px] text-rose-600 hover:text-rose-800 transition-colors uppercase font-bold"
                        >
                          [DELETE]
                        </button>
                      </div>
                      
                      <button
                        onClick={() => handleSaveConfig(config.provider)}
                        disabled={isSaving}
                        className="font-mono text-xs tracking-tighter bg-primary text-white px-6 py-2.5 hover:bg-primary-hover disabled:bg-primary/50 transition-all uppercase font-bold flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <span className="inline-block w-2 h-2 bg-white animate-ping"></span>
                            SAVING...
                          </>
                        ) : (
                          "SAVE_PLATFORM_CONFIG"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Custom Engine Collapsible Trigger / Form Card */}
              <div id="create-provider-form">
                {!showCreateForm ? (
                  <div 
                    onClick={() => setShowCreateForm(true)}
                    className="border border-dashed border-foreground/30 bg-background/50 hover:bg-surface-container-low hover:border-foreground/60 transition-all duration-300 flex flex-col items-center justify-center p-12 text-center cursor-pointer min-h-[350px] group"
                  >
                    <div className="w-16 h-16 rounded-none border border-dashed border-foreground/30 flex items-center justify-center text-2xl font-bold text-text-muted group-hover:text-primary group-hover:border-primary transition-colors mb-4 bg-background">
                      +
                    </div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                      Add custom engine
                    </h3>
                    <p className="font-sans text-xs text-text-muted max-w-xs mt-2 leading-relaxed">
                      Register a custom LLM provider dynamically. Newly registered active engines will automatically execute in parallel during audits.
                    </p>
                    <button
                      type="button"
                      className="mt-6 font-mono text-[10px] bg-foreground text-background px-4 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold"
                    >
                      [+ REGISTER NEW AI ENGINE]
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-foreground/30 bg-background/50 flex flex-col justify-between transition-all duration-300 hover:border-foreground/50">
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-foreground/10 bg-surface-container-low/50 flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-[10px] bg-primary text-white px-2 py-0.5 uppercase font-bold tracking-tighter animate-pulse">
                            NEW_ENGINE
                          </span>
                        </div>
                        <h3 className="font-display text-[1.6rem] font-bold uppercase tracking-tight text-foreground">
                          Add custom engine
                        </h3>
                        <p className="font-sans text-xs text-text-muted leading-relaxed mt-2">
                          Register a custom LLM provider dynamically. Newly registered active engines will automatically execute in parallel during audits.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCreateForm(false);
                        }}
                        className="font-mono text-[10px] text-foreground/50 hover:text-foreground font-bold border border-foreground/20 hover:border-foreground px-3 py-1.5 transition-colors uppercase"
                      >
                        [CANCEL]
                      </button>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleCreateConfig} className="p-6 md:p-8 space-y-5 flex-grow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Provider Code */}
                        <div>
                          <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                            Platform Code *
                          </label>
                          <input
                            type="text"
                            value={newProvider}
                            onChange={(e) => setNewProvider(e.target.value)}
                            className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground"
                            placeholder="e.g. openai"
                            required
                          />
                        </div>

                        {/* Model ID */}
                        <div>
                          <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                            Model ID / Brain Version *
                          </label>
                          <input
                            type="text"
                            value={newModel}
                            onChange={(e) => setNewModel(e.target.value)}
                            className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground"
                            placeholder="e.g. openai/gpt-4o"
                            required
                          />
                        </div>
                      </div>

                      {/* Connection Endpoint */}
                      <div>
                        <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                          Endpoint Base Address (Optional)
                        </label>
                        <input
                          type="text"
                          value={newApiBase}
                          onChange={(e) => setNewApiBase(e.target.value)}
                          className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground placeholder:text-foreground/20"
                          placeholder="e.g. https://api.openai.com/v1"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Timeout */}
                        <div>
                          <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                            Timeout (Seconds)
                          </label>
                          <input
                            type="number"
                            value={newTimeout}
                            onChange={(e) => setNewTimeout(Number(e.target.value))}
                            className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground"
                            min={1}
                            max={120}
                          />
                        </div>

                        {/* API Key */}
                        <div>
                          <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold tracking-wider">
                            Access Key / API Credentials
                          </label>
                          <input
                            type="password"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            className="w-full bg-transparent border-b border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs py-2 text-foreground"
                            placeholder="sk-..."
                          />
                        </div>
                      </div>

                      {/* Form Footer Actions */}
                      <div className="pt-6 border-t border-foreground/10 flex justify-between items-center bg-transparent">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setNewIsActive(!newIsActive)}
                            className={`font-mono text-[10px] font-bold px-3 py-1.5 border transition-all uppercase ${
                              newIsActive
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "bg-transparent border-foreground/20 text-text-muted hover:border-foreground"
                            }`}
                          >
                            {newIsActive ? "ACTIVE ON CREATE" : "INACTIVE ON CREATE"}
                          </button>
                        </div>
                        
                        <button
                          type="submit"
                          disabled={creating}
                          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2.5 hover:bg-primary hover:text-white disabled:bg-foreground/50 transition-all uppercase font-bold flex items-center gap-2"
                        >
                          {creating ? "REGISTERING..." : "REGISTER_AI_ENGINE"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>


        {/* ═══════════════════════ CONSOLE TERMINAL PANEL ═══════════════════════ */}
        <section className="w-full border-t border-foreground/10 bg-foreground text-background py-6 px-6 md:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary"></span>
                Console & Sync Logs
              </span>
              <span className="font-mono text-[9px] text-text-muted uppercase">
                System Status: Secure
              </span>
            </div>

            {/* Retro Blueprint Terminal Log Console */}
            <div 
              ref={consoleContainerRef}
              className="font-mono text-[10px] p-4 bg-background text-foreground border border-foreground/10 h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-none"
            >
              {consoleLogs.map((log, index) => (
                <div key={index} className="mb-1 border-b border-foreground/5 pb-0.5">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer
          id="site-footer"
          className="w-full py-2 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center bg-surface-container-low border-t border-border h-16 gap-2"
        >
          <div className="font-mono text-xs font-bold text-foreground">
            GeoTracker Admin
          </div>
          <div className="flex gap-6 flex-wrap justify-center">
            <a href="#" className="font-mono text-[10px] uppercase text-text-muted hover:text-primary transition-colors terminal-flicker">
              DOCS
            </a>
            <a href="#" className="font-mono text-[10px] uppercase text-text-muted hover:text-primary transition-colors terminal-flicker">
              API_REF
            </a>
            <span className="font-mono text-[10px] uppercase text-primary font-bold">
              Uptime: 100%
            </span>
          </div>
          <div className="font-mono text-[10px] uppercase text-text-muted">
            ©2024 GeoTracker Admin
          </div>
        </footer>

      </main>
    </>
  );
}
