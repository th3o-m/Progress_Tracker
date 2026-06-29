import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, ClipboardList, TrendingUp, PenLine,
  BarChart3, Settings, Menu, X, ChevronRight, Bell, LogOut, FileSpreadsheet, ClipboardCheck,
} from "lucide-react";
import { Overview } from "./components/Overview";
import { WorkPlan } from "./components/WorkPlan";
import { ProgressTracking } from "./components/ProgressTracking";
import { DataEntry } from "./components/DataEntry";
import { Reports } from "./components/Reports";
import { Login } from "./components/Login";
import { supabase } from "../lib/supabase";
import { apiRequest } from "../lib/api";
import { ProjectSwitcher, type ProjectMembership } from "./components/ProjectSwitcher";
import { ProjectDataProvider } from "./ProjectDataContext";
import { Settings as ProjectSettings } from "./components/Settings";
import { ImportSpreadsheet } from "./components/ImportSpreadsheet";
import { ImportedDataReview } from "./components/ImportedDataReview";

type Page = "home" | "workplan" | "progress" | "dataentry" | "import" | "review-imports" | "reports" | "settings";

function hasPasswordRecoveryToken(): boolean {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("type") === "recovery" || hash.get("type") === "recovery";
}

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "workplan", label: "Work Plan & Activities", icon: ClipboardList },
  { id: "progress", label: "Progress Tracking", icon: TrendingUp },
  { id: "dataentry", label: "Data Entry", icon: PenLine },
  { id: "import", label: "Import Spreadsheet", icon: FileSpreadsheet },
  { id: "review-imports", label: "Overview", icon: ClipboardCheck },
  { id: "reports", label: "Reports & Charts", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const pageTitle: Record<Page, string> = {
  home: "Dashboard Overview",
  workplan: "Work Plan & Activities",
  progress: "Progress Tracking",
  dataentry: "Data Entry",
  import: "Import Spreadsheet",
  "review-imports": "Overview",
  reports: "Reports & Charts",
  settings: "Settings",
};

const demoMembership: ProjectMembership = {
  role: "admin",
  district: "Botswana",
  projects: { id: "demo-project", name: "Projectt Tracker Demo", description: "Demo project", district: "Botswana", sector: "Environment", status: "active" },
};

interface CurrentUserResponse {
  id: string;
  is_org_admin: boolean;
  projects: Array<Omit<ProjectMembership, "projects"> & { projects: ProjectMembership["projects"] | ProjectMembership["projects"][] | null }>;
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(supabase ? null : true);
  const [passwordRecovery, setPasswordRecovery] = useState(hasPasswordRecoveryToken);
  const [signingOut, setSigningOut] = useState(false);
  const [memberships, setMemberships] = useState<ProjectMembership[]>(supabase ? [] : [demoMembership]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(supabase ? null : demoMembership.projects.id);
  const [isOrgAdmin, setIsOrgAdmin] = useState(!supabase);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(Boolean(supabase));
  const [projectError, setProjectError] = useState<string | null>(null);

  const loadProjects = useCallback(async (preferredProjectId?: string) => {
    if (!supabase) return;
    setProjectsLoading(true);
    setProjectError(null);
    try {
      const currentUser = await apiRequest<CurrentUserResponse>("/users/me");
      const activeMemberships = (currentUser.projects ?? []).flatMap((membership) => {
        const project = Array.isArray(membership.projects) ? membership.projects[0] : membership.projects;
        return project && project.status !== "cancelled" ? [{ ...membership, projects: project } as ProjectMembership] : [];
      });
      setMemberships(activeMemberships);
      setIsOrgAdmin(currentUser.is_org_admin);
      setCurrentUserId(currentUser.id);
      const storedProjectId = sessionStorage.getItem("selectedProjectId");
      const nextProjectId = [preferredProjectId, storedProjectId, activeMemberships[0]?.projects.id]
        .find((candidate) => candidate && activeMemberships.some((membership) => membership.projects.id === candidate)) ?? null;
      setSelectedProjectId(nextProjectId);
      if (nextProjectId) sessionStorage.setItem("selectedProjectId", nextProjectId);
      else sessionStorage.removeItem("selectedProjectId");
    } catch (error) {
      setMemberships([]);
      setSelectedProjectId(null);
      setCurrentUserId(null);
      setProjectError(error instanceof Error ? error.message : "Unable to load projects");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const recoveryFromUrl = hasPasswordRecoveryToken();
    void supabase.auth.getSession().then(({ data }) => setAuthenticated(recoveryFromUrl ? false : Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || recoveryFromUrl) {
        setPasswordRecovery(true);
        setAuthenticated(false);
        return;
      }
      setAuthenticated(Boolean(session));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authenticated && supabase) void loadProjects();
  }, [authenticated, loadProjects]);

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    sessionStorage.setItem("selectedProjectId", projectId);
    setPage("home");
  }

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    if (supabase) await supabase.auth.signOut({ scope: "local" });
    sessionStorage.removeItem("selectedProjectId");
    setMemberships([]);
    setSelectedProjectId(null);
    setCurrentUserId(null);
    setPage("home");
    setAuthenticated(false);
    setSigningOut(false);
  }

  if (authenticated === null) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading session...</div>;
  }

  if (!authenticated) {
    return (
      <Login
        passwordRecovery={passwordRecovery}
        onSignedIn={() => setAuthenticated(true)}
        onPasswordReset={() => {
          setPasswordRecovery(false);
          setAuthenticated(false);
        }}
      />
    );
  }

  const selectedMembership = memberships.find((membership) => membership.projects.id === selectedProjectId);
  const visibleNavItems = navItems.filter((item) => item.id !== "import" || memberships.some((membership) => membership.role === "admin" || membership.role === "supervisor"));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-200"
        style={{
          width: sidebarOpen ? 280 : 64,
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div className="px-3 py-3 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "var(--sidebar-primary)" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.85rem" }}>PT</span>
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p style={{ color: "var(--sidebar-foreground)", fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.2 }}>Projectt Tracker</p>
                <p className="truncate" style={{ color: "var(--sidebar-foreground)", fontSize: "0.65rem", opacity: 0.6, lineHeight: 1.2 }}>{selectedMembership?.projects.name || "Project Dashboard"}</p>
              </div>
            )}
            <button className="ml-auto flex-shrink-0 hover:opacity-80 transition-opacity" style={{ color: "var(--sidebar-foreground)" }} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
          {sidebarOpen && (
            <ProjectSwitcher
              memberships={memberships}
              selectedProjectId={selectedProjectId}
              isOrgAdmin={isOrgAdmin}
              loading={projectsLoading}
              onSelect={selectProject}
              onProjectsChanged={loadProjects}
            />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
                style={{
                  background: active ? "var(--sidebar-accent)" : "transparent",
                  color: active ? "#fff" : "var(--sidebar-foreground)",
                  opacity: active ? 1 : 0.75,
                  borderLeft: active ? "3px solid var(--sidebar-primary)" : "3px solid transparent",
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && (
                  <span style={{ fontSize: "0.82rem", fontWeight: active ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                  </span>
                )}
                {sidebarOpen && active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#0e7490] flex items-center justify-center flex-shrink-0">
              <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 700 }}>PO</span>
            </div>
            {sidebarOpen && (
              <>
                <div className="overflow-hidden flex-1">
                  <p style={{ color: "var(--sidebar-foreground)", fontSize: "0.75rem", fontWeight: 600 }}>{selectedMembership?.role === "admin" ? "Project Manager" : selectedMembership?.role || "Employee"}</p>
                  <p className="truncate" style={{ color: "var(--sidebar-foreground)", fontSize: "0.65rem", opacity: 0.5 }}>{selectedMembership?.district || "Organization access"}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={signingOut}
                  aria-label="Log out"
                  title="Log out"
                  className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-white/10 disabled:cursor-wait transition-all"
                  style={{ color: "var(--sidebar-foreground)" }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 bg-card border-b border-border" style={{ height: 64, flexShrink: 0 }}>
          <div>
            <h1 className="text-foreground" style={{ fontSize: "1rem", fontWeight: 700 }}>{pageTitle[page]}</h1>
            <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
              {selectedMembership?.projects.name || "No project selected"} — Republic of Botswana &nbsp;|&nbsp; {new Date().toLocaleDateString("en-BW", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range */}
            <div className="flex items-center gap-2 bg-secondary rounded-md px-3 py-1.5 border border-border">
              <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>FY 2026</span>
              <select className="bg-transparent text-foreground focus:outline-none" style={{ fontSize: "0.75rem" }}>
                <option>Jan – Dec 2026</option>
                <option>Q1 2026</option>
                <option>Q2 2026</option>
              </select>
            </div>
            <button className="relative p-2 rounded-md hover:bg-secondary transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main key={selectedProjectId ?? "no-project"} className="flex-1 overflow-y-auto p-6">
          {projectError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{projectError}</div>}
          {!projectsLoading && !selectedMembership && supabase && (
            <div className="rounded-md border border-border bg-card p-8 text-center shadow-sm">
              <h2 className="font-bold text-foreground">No active project selected</h2>
              <p className="mt-2 text-sm text-muted-foreground">Ask an organization administrator to add you to a project, or create one if you are an organization administrator.</p>
            </div>
          )}
          {selectedMembership && <ProjectDataProvider projectId={selectedMembership.projects.id} role={selectedMembership.role}>
          {page === "home" && <Overview />}
          {page === "workplan" && <WorkPlan />}
          {page === "progress" && <ProgressTracking />}
          {page === "dataentry" && <DataEntry memberships={memberships} />}
          {page === "import" && <ImportSpreadsheet memberships={memberships} />}
          {page === "review-imports" && <ImportedDataReview />}
          {page === "reports" && <Reports />}
          {page === "settings" && <ProjectSettings currentUserId={currentUserId} />}
          </ProjectDataProvider>}
        </main>
      </div>
    </div>
  );
}
