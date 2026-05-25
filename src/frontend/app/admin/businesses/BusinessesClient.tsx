"use client";

import type { Business, Organization } from "@/lib/api/types";
import { deleteBusiness, saveBusiness } from "@/app/admin/actions";
import { useAdminRefresh } from "@/lib/admin/refresh";
import { useSyncProp } from "@/lib/admin/sync-props";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { AdminFooter } from "@/components/admin/AdminFooter";
import { useAdminConsole } from "@/components/admin/useAdminConsole";

import { useEffect, useState } from "react";

interface BusinessesClientProps {
  initialBusinesses: Business[];
  initialOrganizations: Organization[];
}

export function BusinessesClient({initialBusinesses, initialOrganizations}: BusinessesClientProps) {
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Pagination & Filtering
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrgId, setFilterOrgId] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formCountry, setFormCountry] = useState("US");
  const [formServiceFocuses, setFormServiceFocuses] = useState("");
  const [formTargetSuburbs, setFormTargetSuburbs] = useState("");
  const [formOrgId, setFormOrgId] = useState("");
  
  const { consoleLogs, consoleContainerRef, addLog } = useAdminConsole();
  const { refresh, pending } = useAdminRefresh();

  useSyncProp(initialBusinesses, setBusinesses);
  useSyncProp(initialOrganizations, setOrganizations);

  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);


  useEffect(() => {
    addLog("LOAD: Data supplied by server (cached).");
  }, []);

  const handleOpenCreateModal = () => {
    setEditingBiz(null);
    setFormName("");
    setFormDomain("");
    setFormIndustry("");
    setFormCity("");
    setFormState("");
    setFormCountry("US");
    setFormServiceFocuses("");
    setFormTargetSuburbs("");
    setFormOrgId(organizations[0]?.id || "");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (biz: Business) => {
    setEditingBiz(biz);
    setFormName(biz.name);
    setFormDomain(biz.domain);
    setFormIndustry(biz.industry);
    setFormCity(biz.primary_city);
    setFormState(biz.primary_state);
    setFormCountry(biz.country);
    setFormServiceFocuses(biz.service_focuses.join(", "));
    setFormTargetSuburbs(biz.target_suburbs.join(", "));
    setFormOrgId(biz.organization_id);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDomain || !formOrgId) {
      addLog("[WARNING] SAVE: Name, Domain, and Organization are required.");
      return;
    }

    const payload = {
      name: formName,
      domain: formDomain,
      industry: formIndustry,
      primary_city: formCity,
      primary_state: formState,
      country: formCountry,
      service_focuses: formServiceFocuses.split(",").map(s => s.trim()).filter(Boolean),
      target_suburbs: formTargetSuburbs.split(",").map(s => s.trim()).filter(Boolean),
      organization_id: formOrgId
    };

    const isCreate = !editingBiz;
    addLog(`SAVE: Saving ${isCreate ? "new" : "updated"} business profile [${formName}]...`);

    try {
      await saveBusiness({
        isCreate,
        id: editingBiz?.id,
        organization_id: formOrgId,
        name: formName,
        domain: formDomain,
        industry: formIndustry,
        primary_city: formCity,
        primary_state: formState,
        country: formCountry,
        service_focuses: formServiceFocuses.split(",").map((s) => s.trim()).filter(Boolean),
        target_suburbs: formTargetSuburbs.split(",").map((s) => s.trim()).filter(Boolean),
      });
      addLog(`[SUCCESS] SAVE: Business profile [${formName}] successfully saved.`);
      setIsModalOpen(false);
      refresh();
    } catch (err: unknown) {
      addLog(`[ERROR] SAVE: ${err instanceof Error ? err.message : "Save failed"}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? All linked scans will be deleted.`)) return;

    addLog(`DELETE: Deleting business [${name}]...`);

    try {
      await deleteBusiness(id);
      addLog(`[SUCCESS] DELETE: Business [${name}] deleted.`);
      refresh();
    } catch (err: unknown) {
      addLog(`[ERROR] DELETE: ${err instanceof Error ? err.message : "Delete failed"}`);
    }
  };

  const filteredBizs = businesses.filter((b) => {
    const matchesSearch = 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.domain.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.primary_city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = filterOrgId ? b.organization_id === filterOrgId : true;
    return matchesSearch && matchesOrg;
  });

  const paginatedBizs = filteredBizs.slice(offset, offset + limit);

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
          {/* Header Section */}
          <div className="mb-12 border-b border-foreground/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                BUSINESS LOCATIONS
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                Businesses Directory
              </h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all"
            >
              [+] Register Business
            </button>
          </div>

          {/* Filters & Search */}
          <div className="border border-foreground/10 bg-background p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/2">
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Search business name, domain, or city</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }}
                className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Filter By Parent Org</label>
              <select
                value={filterOrgId}
                onChange={(e) => { setFilterOrgId(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block">
                ● Loading registered businesses...
              </span>
            </div>
          ) : paginatedBizs.length === 0 ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs text-text-muted uppercase block">
                No matching business profiles found.
              </span>
            </div>
          ) : (
            <div className="border border-foreground/10 bg-background overflow-x-auto mb-6">
              <table className="w-full border-collapse font-sans text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
                    <th className="p-4 font-bold">Business Name</th>
                    <th className="p-4 font-bold">Domain</th>
                    <th className="p-4 font-bold">Industry</th>
                    <th className="p-4 font-bold">Geography</th>
                    <th className="p-4 font-bold">Parent Organization</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBizs.map((b) => {
                    const org = organizations.find((o) => o.id === b.organization_id);
                    return (
                      <tr key={b.id} className="border-b border-foreground/5 hover:bg-surface-container-lowest">
                        <td className="p-4 font-bold text-foreground">{b.name}</td>
                        <td className="p-4 font-mono text-foreground/80">{b.domain}</td>
                        <td className="p-4 font-mono text-foreground/75 uppercase">{b.industry}</td>
                        <td className="p-4 font-mono text-foreground/60">{b.primary_city}, {b.primary_state} ({b.country})</td>
                        <td className="p-4 font-mono text-foreground/60">{org ? org.name : "Unknown Org"}</td>
                        <td className="p-4 text-right flex justify-end gap-3">
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Edit]
                          </button>
                          <button
                            onClick={() => handleDelete(b.id, b.name)}
                            className="font-mono text-[10px] border border-rose-600/30 hover:border-rose-600 text-rose-600 px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Delete]
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredBizs.length > limit && (
            <div className="flex justify-between items-center mb-12">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [← Previous]
              </button>
              <span className="font-mono text-xs text-text-muted uppercase">
                SHOWING {offset + 1}-{Math.min(offset + limit, filteredBizs.length)} OF {filteredBizs.length}
              </span>
              <button
                disabled={offset + limit >= filteredBizs.length}
                onClick={() => setOffset(offset + limit)}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [Next →]
              </button>
            </div>
          )}

        {/* ═══════════════════════ MODAL CONTAINER ═══════════════════════ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl border border-foreground bg-background p-6 md:p-8 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 font-mono text-xs hover:text-primary uppercase font-bold"
              >
                [Close X]
              </button>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight mb-6 text-foreground border-b border-foreground/10 pb-2">
                {editingBiz ? "Edit Business Profile" : "Register Business"}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Business Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                      placeholder="Acme Dental"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Domain (Website)</label>
                    <input
                      type="text"
                      required
                      value={formDomain}
                      onChange={(e) => setFormDomain(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                      placeholder="acmedental.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Industry Segment</label>
                    <input
                      type="text"
                      required
                      value={formIndustry}
                      onChange={(e) => setFormIndustry(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                      placeholder="dental, medical, legal..."
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Parent Organization</label>
                    <select
                      value={formOrgId}
                      onChange={(e) => setFormOrgId(e.target.value)}
                      className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Primary City</label>
                    <input
                      type="text"
                      required
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Primary State</label>
                    <input
                      type="text"
                      required
                      value={formState}
                      onChange={(e) => setFormState(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Country Code</label>
                    <input
                      type="text"
                      required
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Service Focuses (Comma Separated)</label>
                  <input
                    type="text"
                    value={formServiceFocuses}
                    onChange={(e) => setFormServiceFocuses(e.target.value)}
                    className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    placeholder="teeth whitening, dental implants, pediatric dentistry"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Target Suburbs / Neighborhoods (Comma Separated)</label>
                  <input
                    type="text"
                    value={formTargetSuburbs}
                    onChange={(e) => setFormTargetSuburbs(e.target.value)}
                    className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    placeholder="downtown, brickell, south beach"
                  />
                </div>

                <div className="pt-4 border-t border-foreground/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="font-mono text-xs border border-foreground/20 px-4 py-2.5 uppercase font-bold hover:border-foreground"
                  >
                    [Cancel]
                  </button>
                  <button
                    type="submit"
                    className="font-mono text-xs bg-primary text-white px-6 py-2.5 uppercase font-bold hover:bg-primary-hover"
                  >
                    Save Business
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <AdminConsole logs={consoleLogs} containerRef={consoleContainerRef} />
      <AdminFooter />
    </>
  );
}
