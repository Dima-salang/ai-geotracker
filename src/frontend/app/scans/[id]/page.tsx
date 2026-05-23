"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import ResultsDashboard from "../../../components/ResultsDashboard";

interface ScanReportPageProps {
  params: Promise<{ id: string }>;
}

export default function ScanReportPage({ params }: ScanReportPageProps) {
  const resolvedParams = use(params);
  const scanId = resolvedParams.id;
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [scanData, setScanData] = useState<any>(null);
  
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!scanId) return;
    
    const fetchScan = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/scans/${scanId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Visibility report not found in historical directory.");
          }
          throw new Error("Unable to sync details from scan database.");
        }
        const data = await res.json();
        setScanData(data);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Failed to load historical scan.");
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
  }, [scanId]);

  return (
    <>
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
            GeoTracker
          </Link>
          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter animate-pulse">
            Client Share Portal
          </span>
        </div>
        <Link href="/" className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold">
          [← RUN NEW AUDIT]
        </Link>
      </nav>

      <main className="pt-16 min-h-screen blueprint-bg flex flex-col justify-between">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-24 text-center shadow-md">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block mb-4">
                ◆ RETRIEVING VISIBILITY SCORE FROM DATABASE...
              </span>
              <p className="font-sans text-xs text-text-muted">
                Connecting to AI Search database. Please wait.
              </p>
            </div>
          ) : errorMsg ? (
            <div className="w-full border border-rose-600/30 bg-rose-600/5 p-12 text-center shadow-lg max-w-2xl mx-auto my-12">
              <span className="font-mono text-xs font-bold text-rose-600 block uppercase mb-4">
                [DATABASE ERROR] {errorMsg}
              </span>
              <p className="font-sans text-sm text-text-muted mb-8 leading-relaxed">
                The visibility scorecard URL might have expired, or the scan record was removed from the database directory.
              </p>
              <Link href="/" className="font-mono text-xs px-6 py-3 bg-foreground text-background hover:bg-primary hover:text-white transition-all uppercase font-bold">
                Run New Audit
              </Link>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-foreground/10 pb-4 gap-4">
                <div>
                  <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                    ◆ SHARED AUDIT DISCOVERY SCORECARD
                  </span>
                  <h2 className="font-display text-[2rem] font-bold tracking-tight uppercase leading-none">
                    Visibility Report
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-text-muted mb-1 uppercase tracking-widest">
                  AUDIT_RECORD: {scanData.id.slice(0, 8)}
                </span>
              </div>

              <ResultsDashboard
                overallScore={scanData.overall_score || 0}
                summary={scanData.summary || { green: 0, yellow: 0, red: 0 }}
                recommendations={scanData.recommendations || []}
                details={{
                  business_name: scanData.business_name,
                  domain: scanData.business_domain,
                  industry: scanData.business_industry,
                  primary_city: scanData.business_city,
                  primary_state: scanData.business_state,
                  country: "US",
                  service_focuses: scanData.business_service_focuses || [],
                  is_virtual: scanData.is_virtual ?? false,
                }}
                providerResults={scanData.results || []}
                scanId={scanData.id}
                isScanning={false}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
