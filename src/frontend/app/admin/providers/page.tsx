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

interface SavingStates {
  [key: string]: boolean;
}

export default function AdminProviders() {
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [savingStates, setSavingStates] = useState<SavingStates>({});
  
  // Local form state for API keys to allow editing
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});
  
  // Console logging state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch configs on load
  const fetchConfigs = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      addLog("LOAD: Fetching AI Search Platforms from local database...");
    }
    
    try {
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
      
      if (!silent) {
        addLog(`CONFIG: Successfully loaded ${data.length}/${data.length} active AI engine configurations.`);
        addLog("GATEWAY: Dashboard interface synchronized.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load provider configurations.");
      addLog(`[ERROR] LOAD_FAIL: Unable to sync AI engine configurations. ${err.message}`);
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


  // Helper translations for display titles & descriptions
  const getPlatformDetails = (provider: string) => {
    switch (provider) {
      case "gemini":
        return {
          title: "Google Gemini",
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
            <p className="font-sans text-sm text-text-muted max-w-md leading-relaxed">
              Configure the API endpoint URLs, active AI model versions, and secure API keys utilized by the AI search agents. All keys are encrypted.
            </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
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
                      <div className="font-mono text-[9px] text-text-muted uppercase">
                        Engine ID: {config.provider}
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
            <div className="font-mono text-[10px] p-4 bg-background text-foreground border border-foreground/10 h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-none">
              {consoleLogs.map((log, index) => (
                <div key={index} className="mb-1 border-b border-foreground/5 pb-0.5">
                  {log}
                </div>
              ))}
              <div ref={consoleEndRef}></div>
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
