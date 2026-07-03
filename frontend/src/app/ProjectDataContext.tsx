import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "../lib/api";

export interface Activity { id: string; code: string; name: string; category: string; district: string; responsible_officer: string; start_date: string; end_date: string; status: string; progress_pct: number; created_at: string; }
export interface ProgressUpdate { id: string; activity_id: string; officer_id: string; progress_pct: number; status: string; narrative: string; report_date: string; created_at: string; }
export interface Challenge { id: string; activity_id: string; challenge_type: string; description: string; mitigation_plan: string | null; resolved: boolean; created_at: string; activities?: { code: string; name: string; district: string } | null; }
export interface Beneficiary { id: string; full_name: string; national_id: string; beneficiary_type: string; district: string; contact_number: string | null; created_at: string; }
export interface FinancialEntry { id: string; activity_id: string; expense_category: string; amount: number; description: string; status: "pending" | "approved" | "rejected"; created_at: string; }
export interface GeneratedReport { id: string; name: string; report_type: "pdf" | "excel"; file_url: string; created_at: string; }
export type ProjectRole = "officer" | "supervisor" | "finance" | "admin";
export interface ProjectMember { id: string; role: ProjectRole; district: string | null; added_at?: string; profiles: { id: string; email: string; full_name: string; phone?: string | null; active: boolean } | null; }

interface ProjectData {
  projectId: string;
  role: ProjectRole;
  activities: Activity[];
  progress: ProgressUpdate[];
  challenges: Challenge[];
  beneficiaries: Beneficiary[];
  financial: FinancialEntry[];
  reports: GeneratedReport[];
  members: ProjectMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const Context = createContext<ProjectData | null>(null);

export function ProjectDataProvider({ projectId, role, children }: { projectId: string; role: ProjectRole; children: ReactNode }) {
  const [data, setData] = useState<Omit<ProjectData, "loading" | "error" | "refresh">>({ activities: [], progress: [], challenges: [], beneficiaries: [], financial: [], reports: [], members: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const base = `/projects/${projectId}`;
      const hasOperationalAccess = role !== "finance";
      const hasManagementAccess = role === "admin" || role === "supervisor";
      const [activities, progress, challenges, beneficiaries, financial, reports, members] = await Promise.all([
        apiRequest<Activity[]>(`${base}/activities`),
        hasOperationalAccess ? apiRequest<ProgressUpdate[]>(`${base}/progress-updates`) : Promise.resolve([]),
        hasOperationalAccess ? apiRequest<Challenge[]>(`${base}/challenges`) : Promise.resolve([]),
        hasOperationalAccess ? apiRequest<Beneficiary[]>(`${base}/beneficiaries`) : Promise.resolve([]),
        apiRequest<FinancialEntry[]>(`${base}/financial-entries`),
        hasManagementAccess ? apiRequest<GeneratedReport[]>(`${base}/reports`) : Promise.resolve([]),
        hasManagementAccess ? apiRequest<ProjectMember[]>(`${base}/members`) : Promise.resolve([]),
      ]);
      setData({ activities, progress, challenges, beneficiaries, financial, reports, members });
    } catch (loadError) {
      setData({ activities: [], progress: [], challenges: [], beneficiaries: [], financial: [], reports: [], members: [] });
      setError(loadError instanceof Error ? loadError.message : "Unable to load project data");
    } finally { setLoading(false); }
  }, [projectId, role]);

  useEffect(() => { void refresh(); }, [refresh]);
  return <Context.Provider value={{ projectId, role, ...data, loading, error, refresh }}>{children}</Context.Provider>;
}

export function useProjectData() {
  const value = useContext(Context);
  if (!value) throw new Error("useProjectData must be used inside ProjectDataProvider");
  return value;
}
