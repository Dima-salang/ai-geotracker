"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteOrganization,
  saveOrganization,
} from "@/app/admin/actions";
import type { Organization } from "@/lib/api/types";
import { AdminConsole } from "./AdminConsole";
import { AdminFooter } from "./AdminFooter";
import { useAdminConsole } from "./useAdminConsole";

interface OrganizationsPanelProps {
  organizations: Organization[];
}

export function OrganizationsPanel({ organizations }: OrganizationsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { consoleLogs, consoleContainerRef, addLog } = useAdminConsole(
    `[${new Date().toLocaleTimeString()}] LOAD: ${organizations.length} organizations (server cache).`
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formName, setFormName] = useState("");

  const filteredOrgs = useMemo(
    () =>
      organizations.filter((o) =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [organizations, searchTerm]
  );
  const paginatedOrgs = filteredOrgs.slice(offset, offset + limit);

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleOpenCreateModal = () => {
    setEditingOrg(null);
    setFormName("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: Organization) => {
    setEditingOrg(org);
    setFormName(org.name);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      addLog("[WARNING] SAVE: Name cannot be empty.");
      return;
    }
    const isCreate = !editingOrg;
    addLog(`SAVE: Saving ${isCreate ? "new" : "updated"} organization [${formName}]...`);
    try {
      await saveOrganization({
        id: editingOrg?.id,
        name: formName,
      });
      addLog(`[SUCCESS] SAVE: Organization [${formName}] successfully saved.`);
      setIsModalOpen(false);
      refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      addLog(`[ERROR] SAVE: ${message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === "00000000-0000-0000-0000-000000000000") {
      addLog("[PROTECTED] DELETE: Default Organization is protected.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete ${name}? All linked business locations and scans will be deleted.`
      )
    ) {
      return;
    }
    addLog(`DELETE: Deleting organization [${name}]...`);
    try {
      await deleteOrganization(id);
      addLog(`[SUCCESS] DELETE: Organization [${name}] deleted.`);
      refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed";
      addLog(`[ERROR] DELETE: ${message}`);
    }
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
        <div className="mb-12 border-b border-foreground/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
              ORGANIZATIONS
            </span>
            <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
              Organizations Directory
            </h1>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            disabled={pending}
            className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all disabled:opacity-50"
          >
            [+] Create Organization
          </button>
        </div>

        <div className="border border-foreground/10 bg-background p-4 mb-6">
          <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">
            Search Org Name
          </label>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setOffset(0);
            }}
            className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
          />
        </div>

        {paginatedOrgs.length === 0 ? (
          <div className="w-full border border-foreground/10 bg-background p-12 text-center">
            <span className="font-mono text-xs text-text-muted uppercase block">
              No matching organization profiles found.
            </span>
          </div>
        ) : (
          <div className="border border-foreground/10 bg-background overflow-x-auto mb-6">
            <table className="w-full border-collapse font-sans text-xs text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
                  <th className="p-4 font-bold">Organization ID</th>
                  <th className="p-4 font-bold">Name</th>
                  <th className="p-4 font-bold">Created At</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrgs.map((org) => {
                  const isDefault = org.id === "00000000-0000-0000-0000-000000000000";
                  return (
                    <tr
                      key={org.id}
                      className="border-b border-foreground/5 hover:bg-surface-container-lowest"
                    >
                      <td className="p-4 font-mono text-foreground/80">{org.id}</td>
                      <td className="p-4 font-bold text-foreground">
                        {org.name}
                        {isDefault && (
                          <span className="ml-2 font-mono text-[9px] bg-primary/10 text-primary border border-primary/20 px-1 py-0.5 uppercase font-bold">
                            DEFAULT
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-foreground/60">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(org)}
                          className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold transition-all"
                        >
                          [Edit]
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(org.id, org.name)}
                          disabled={isDefault || pending}
                          className={`font-mono text-[10px] border px-3 py-1 uppercase font-bold transition-all ${
                            isDefault
                              ? "border-foreground/5 text-foreground/25 cursor-not-allowed"
                              : "border-rose-600/30 hover:border-rose-600 text-rose-600"
                          }`}
                        >
                          {isDefault ? "[🔒 Protected]" : "[Delete]"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredOrgs.length > limit && (
          <div className="flex justify-between items-center mb-12">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
            >
              [← Previous]
            </button>
            <span className="font-mono text-xs text-text-muted uppercase">
              SHOWING {offset + 1}-{Math.min(offset + limit, filteredOrgs.length)} OF{" "}
              {filteredOrgs.length}
            </span>
            <button
              type="button"
              disabled={offset + limit >= filteredOrgs.length}
              onClick={() => setOffset(offset + limit)}
              className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
            >
              [Next →]
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-foreground bg-background p-6 md:p-8 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 font-mono text-xs hover:text-primary uppercase font-bold"
            >
              [Close X]
            </button>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight mb-6 text-foreground border-b border-foreground/10 pb-2">
              {editingOrg ? "Edit Organization" : "Create Organization"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                  placeholder="e.g. Acme Corp"
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
                  disabled={pending}
                  className="font-mono text-xs bg-primary text-white px-6 py-2.5 uppercase font-bold hover:bg-primary-hover disabled:opacity-50"
                >
                  Save Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConsole logs={consoleLogs} containerRef={consoleContainerRef} />
      <AdminFooter />
    </>
  );
}
