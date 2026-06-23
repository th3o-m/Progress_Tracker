import { useState, type FormEvent } from "react";
import { FolderPlus, Trash2, X } from "lucide-react";
import { apiRequest } from "../../lib/api";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  district: string | null;
  sector: string | null;
  status: "active" | "completed" | "on_hold" | "cancelled";
}

export interface ProjectMembership {
  id?: string;
  role: "officer" | "supervisor" | "finance" | "admin";
  district: string | null;
  projects: Project;
}

interface ProjectSwitcherProps {
  memberships: ProjectMembership[];
  selectedProjectId: string | null;
  isOrgAdmin: boolean;
  loading: boolean;
  onSelect: (projectId: string) => void;
  onProjectsChanged: (preferredProjectId?: string) => Promise<void>;
}

export function ProjectSwitcher({ memberships, selectedProjectId, isOrgAdmin, loading, onSelect, onProjectsChanged }: ProjectSwitcherProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [district, setDistrict] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMembership = memberships.find((membership) => membership.projects.id === selectedProjectId);
  const canManage = isOrgAdmin || selectedMembership?.role === "admin" || selectedMembership?.role === "supervisor";
  const canRemove = selectedMembership?.role === "admin" || selectedMembership?.role === "supervisor";

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiRequest<Project & { membership: unknown }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          sector: sector.trim() || null,
          district: district.trim() || null,
          source_project_id: selectedProjectId || undefined,
        }),
      });
      setName(""); setDescription(""); setSector(""); setDistrict(""); setShowCreate(false);
      await onProjectsChanged(result.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create project");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeProject() {
    if (!selectedMembership) return;
    const confirmed = window.confirm(`Remove “${selectedMembership.projects.name}” from the active project list? Project history will be preserved.`);
    if (!confirmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest<null>(`/projects/${selectedMembership.projects.id}`, { method: "DELETE" });
      await onProjectsChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to remove project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2">
      <label className="sr-only" htmlFor="project-switcher">Selected project</label>
      <div className="flex items-center gap-1">
        <select
          id="project-switcher"
          value={selectedProjectId ?? ""}
          onChange={(event) => onSelect(event.target.value)}
          disabled={loading || memberships.length === 0}
          className="min-w-0 flex-1 rounded border border-white/15 bg-white/10 px-2 py-1.5 text-xs text-white outline-none disabled:opacity-60"
          title="Switch project"
        >
          {memberships.length === 0 && <option value="">No projects available</option>}
          {memberships.map((membership) => (
            <option key={membership.projects.id} value={membership.projects.id} className="text-slate-900">
              {membership.projects.name}
            </option>
          ))}
        </select>
        {canManage && (
          <button type="button" onClick={() => { setError(null); setShowCreate(true); }} className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white" title="Add project" aria-label="Add project">
            <FolderPlus className="w-4 h-4" />
          </button>
        )}
        {canRemove && (
          <button type="button" onClick={removeProject} disabled={submitting} className="rounded p-1.5 text-white/70 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-50" title="Remove selected project" aria-label="Remove selected project">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {selectedMembership && <p className="mt-1 truncate text-[10px] capitalize text-white/50">{selectedMembership.role} · {selectedMembership.district || "All districts"}</p>}
      {error && !showCreate && <p className="mt-1 text-[10px] text-red-200">{error}</p>}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-foreground shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Add project</h2>
                <p className="text-xs text-muted-foreground">You will become the new project's administrator.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded p-1 hover:bg-secondary" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={createProject} className="space-y-4">
              <label className="block text-sm">Project name
                <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-[#1a3a6b]" />
              </label>
              <label className="block text-sm">Description <span className="text-muted-foreground">(optional)</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-[#1a3a6b]" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Sector
                  <input value={sector} onChange={(event) => setSector(event.target.value)} placeholder="Environment" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-[#1a3a6b]" />
                </label>
                <label className="block text-sm">District
                  <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Chobe" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-[#1a3a6b]" />
                </label>
              </div>
              {error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Creating..." : "Create project"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
