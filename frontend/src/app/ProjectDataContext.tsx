import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "../lib/api";

export interface Activity { id: string; code: string | null; name: string; category: string; district: string; responsible_officer: string | null; start_date: string; end_date: string; status: string; progress_pct: number; created_at: string; }
export interface ProgressUpdate { id: string; activity_id: string; officer_id: string; progress_pct: number; status: string; narrative: string; report_date: string; created_at: string; }
export interface Challenge { id: string; activity_id: string; challenge_type: string; description: string; mitigation_plan: string | null; resolved: boolean; created_at: string; activities?: { code: string; name: string; district: string } | null; }
export interface FinancialEntry { id: string; activity_id: string; expense_category: string; amount: number; description: string; status: "pending" | "approved" | "rejected"; created_at: string; }
export interface GeneratedReport { id: string; name: string; report_type: "pdf" | "excel"; file_url: string; created_at: string; }
export type ProjectRole = "officer" | "supervisor" | "finance" | "admin";
export interface ProjectMember { id: string; role: ProjectRole; district: string | null; added_at?: string; profiles: { id: string; email: string; full_name: string; phone?: string | null; active: boolean } | null; }

interface ProjectData {
  projectId: string;
  role: ProjectRole;
  refresh: () => Promise<void>;
  refreshVersion: number;
}

const Context = createContext<ProjectData | null>(null);

export function ProjectDataProvider({ projectId, role, children }: { projectId: string; role: ProjectRole; children: ReactNode }) {
  const [refreshVersion, setRefreshVersion] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshVersion((value) => value + 1);
  }, []);

  return <Context.Provider value={{ projectId, role, refresh, refreshVersion }}>{children}</Context.Provider>;
}

export function useProjectData() {
  const value = useContext(Context);
  if (!value) throw new Error("useProjectData must be used inside ProjectDataProvider");
  return value;
}

interface DatasetState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function useProjectDataset<T>(path: string | null, emptyValue: T, enabled = true): DatasetState<T> {
  const { projectId, refreshVersion } = useProjectData();
  const [data, setData] = useState<T>(emptyValue);
  const activePath = enabled ? path : null;
  const [loading, setLoading] = useState(Boolean(activePath));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activePath) {
      setData(emptyValue);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await apiRequest<T>(activePath));
    } catch (loadError) {
      setData(emptyValue);
      setError(loadError instanceof Error ? loadError.message : "Unable to load project data");
    } finally {
      setLoading(false);
    }
  }, [activePath]);

  useEffect(() => { void load(); }, [load, projectId, refreshVersion]);
  return { data, loading, error, refresh: load };
}

export function useProjectActivities(enabled = true) {
  const { projectId } = useProjectData();
  return useProjectDataset<Activity[]>(`/projects/${projectId}/activities`, [], enabled);
}

export function useProjectProgressUpdates(enabled = true) {
  const { projectId, role } = useProjectData();
  return useProjectDataset<ProgressUpdate[]>(role === "finance" ? null : `/projects/${projectId}/progress-updates`, [], enabled);
}

export function useProjectChallenges(enabled = true) {
  const { projectId, role } = useProjectData();
  return useProjectDataset<Challenge[]>(role === "finance" ? null : `/projects/${projectId}/challenges`, [], enabled);
}

export function useProjectFinancials(enabled = true) {
  const { projectId } = useProjectData();
  return useProjectDataset<FinancialEntry[]>(`/projects/${projectId}/financial-entries`, [], enabled);
}

export function useProjectReports(enabled = true) {
  const { projectId, role } = useProjectData();
  return useProjectDataset<GeneratedReport[]>(role === "admin" || role === "supervisor" ? `/projects/${projectId}/reports` : null, [], enabled);
}

export function useProjectMembers(enabled = true) {
  const { projectId, role } = useProjectData();
  return useProjectDataset<ProjectMember[]>(role === "admin" || role === "supervisor" ? `/projects/${projectId}/members` : null, [], enabled);
}
