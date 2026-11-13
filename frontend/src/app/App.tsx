import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, ClipboardList, TrendingUp, PenLine,
  BarChart3, Settings, Menu, X, ChevronRight, LogOut, FileSpreadsheet, ClipboardCheck, MonitorPlay,
} from "lucide-react";
import { Overview } from "./components/Overview";
import { Login } from "./components/Login";
import { supabase } from "../lib/supabase";
import { apiRequest } from "../lib/api";
import { normalizeProjectMemberships } from "../lib/projectMemberships";
import { ProjectSwitcher, type ProjectMembership } from "./components/ProjectSwitcher";
import { ProjectDataProvider } from "./ProjectDataContext";
import { ThemeToggle } from "./components/ThemeToggle";
import { Skeleton } from "./components/ui/skeleton";
import { NotificationsBell } from "./components/NotificationsBell";
import { ActivityPage } from "./pages/ActivityPage";
import type { AcceptedInvitationProject } from "./pages/InvitationPage";

const WorkPlan = lazy(() => import("./components/WorkPlan").then((module) => ({ default: module.WorkPlan })));
const ProgressTracking = lazy(() => import("./components/ProgressTracking").then((module) => ({ default: module.ProgressTracking })));
const Challenges = lazy(() => import("./components/Challenges").then((module) => ({ default: module.Challenges })));
const DataEntry = lazy(() => import("./components/DataEntry").then((module) => ({ default: module.DataEntry })));
const ImportSpreadsheet = lazy(() => import("./components/ImportSpreadsheet").then((module) => ({ default: module.ImportSpreadsheet })));
const ImportedDataReview = lazy(() => import("./components/ImportedDataReview").then((module) => ({ default: module.ImportedDataReview })));
const Reports = lazy(() => import("./components/Reports").then((module) => ({ default: module.Reports })));
const ProjectSettings = lazy(() => import("./components/Settings").then((module) => ({ default: module.Settings })));
const ProjectPresentation = lazy(() => import("./pages/ProjectPresentation").then((module) => ({ default: module.ProjectPresentation })));
const InvitationPage = lazy(() => import("./pages/InvitationPage").then((module) => ({ default: module.InvitationPage })));

type Page = "home" | "workplan" | "progress" | "challenges" | "dataentry" | "import" | "review-imports" | "reports" | "settings";
type Theme = "light" | "dark";

function hasPasswordRecoveryToken(): boolean {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("type") === "recovery" || hash.get("type") === "recovery";
}

function projectIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("project");
}

function mainPageFromUrl(): Page {
  const page = new URLSearchParams(window.location.search).get("page");
  if (page === "home" || page === "workplan" || page === "progress" || page === "challenges" || page === "dataentry" || page === "import" || page === "review-imports" || page === "reports" || page === "settings") return page;
  return "home";
}

function activityRouteFromPath(): { projectId: string; activityId: string } | null {
  const match = window.location.pathname.match(/^\/projects\/([^/]+)\/activities\/([^/]+)\/?$/);
  if (!match?.[1] || !match?.[2]) return null;
  return { projectId: decodeURIComponent(match[1]), activityId: decodeURIComponent(match[2]) };
}

function presentationProjectIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/projects\/([^/]+)\/presentation\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function invitationTokenFromPath(): string | null {
  const match = window.location.pathname.match(/^\/invite\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function getInitialTheme(): Theme {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function PageLoadingFallback() {
  return <div className="space-y-4" aria-busy="true">
    <Skeleton className="h-8 w-48" />
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
    </div>
    <Skeleton className="h-48" />
  </div>;
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
  challenges: "Current Challenges",
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

export default function App() {
  const presentationProjectId = presentationProjectIdFromPath();
  const invitationToken = invitationTokenFromPath();
  const activityRoute = activityRouteFromPath();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [page, setPage] = useState<Page>(mainPageFromUrl);
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia("(max-width: 767px)").matches);
  const [authenticated, setAuthenticated] = useState<boolean | null>(supabase ? null : true);
  const [passwordRecovery, setPasswordRecovery] = useState(hasPasswordRecoveryToken);
  const [signingOut, setSigningOut] = useState(false);
  const [memberships, setMemberships] = useState<ProjectMembership[]>(supabase ? [] : [demoMembership]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(supabase ? null : demoMembership.projects.id);
  const [isOrgAdmin, setIsOrgAdmin] = useState(!supabase);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(Boolean(supabase));
  const [projectError, setProjectError] = useState<string | null>(null);
  const [newlyJoinedProjectId, setNewlyJoinedProjectId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => current === "dark" ? "light" : "dark");
  }

  const loadProjects = useCallback(async (preferredProjectId?: string) => {
    if (!supabase) return;
    setProjectsLoading(true);
    setProjectError(null);
    try {
      const currentUser = await apiRequest<unknown>("/users/me");
      if (
        !currentUser || typeof currentUser !== "object" || Array.isArray(currentUser) ||
        !("id" in currentUser) || typeof currentUser.id !== "string" || !currentUser.id
      ) {
        throw new Error(
          "The account API returned an incomplete profile. Check VITE_API_URL and confirm the backend /api/users/me endpoint returns your user ID.",
        );
      }
      const activeMemberships = normalizeProjectMemberships(
        "projects" in currentUser ? currentUser.projects : undefined,
      );
      setMemberships(activeMemberships);
      setIsOrgAdmin("is_org_admin" in currentUser && currentUser.is_org_admin === true);
      setCurrentUserId(currentUser.id);
      const requestedProjectId = projectIdFromUrl();
      const storedProjectId = sessionStorage.getItem("selectedProjectId");
      const nextProjectId = [preferredProjectId, requestedProjectId, storedProjectId, activeMemberships[0]?.projects.id]
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
    if (authenticated && supabase && !activityRoute) void loadProjects();
  }, [authenticated, loadProjects, activityRoute]);

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    if (projectId === newlyJoinedProjectId) setNewlyJoinedProjectId(null);
    sessionStorage.setItem("selectedProjectId", projectId);
    setPage("home");
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  }

  const handleInvitationAccepted = useCallback(async (project: AcceptedInvitationProject) => {
    await loadProjects(project.id);
    setNewlyJoinedProjectId(project.id);
    setPage("home");
    window.history.replaceState({}, document.title, "/");
  }, [loadProjects]);

  useEffect(() => {
    if (!newlyJoinedProjectId) return;
    const timeout = window.setTimeout(() => setNewlyJoinedProjectId(null), 10000);
    return () => window.clearTimeout(timeout);
  }, [newlyJoinedProjectId]);

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
    return <div className="min-h-screen bg-background flex items-center justify-center p-6" aria-busy="true"><div className="w-full max-w-sm space-y-4"><Skeleton className="mx-auto h-10 w-10 rounded-full" /><Skeleton className="h-5 w-full" /><Skeleton className="mx-auto h-4 w-2/3" /></div></div>;
  }

  if (!authenticated) {
    return (
      <Login
        theme={theme}
        onToggleTheme={toggleTheme}
        passwordRecovery={passwordRecovery}
        onSignedIn={() => setAuthenticated(true)}
        onPasswordReset={() => {
          setPasswordRecovery(false);
          setAuthenticated(false);
        }}
      />
    );
  }

  if (presentationProjectId) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background p-8" aria-busy="true"><Skeleton className="mb-6 h-10 w-56" /><Skeleton className="h-[70vh] w-full" /></div>}>
        <ProjectPresentation projectId={presentationProjectId} />
      </Suspense>
    );
  }

  if (invitationToken) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background p-8" aria-busy="true"><Skeleton className="mx-auto mt-24 h-48 max-w-xl" /></div>}>
        <InvitationPage token={invitationToken} onAccepted={handleInvitationAccepted} />
      </Suspense>
    );
  }

  if (activityRoute) {
    return <ActivityPage projectId={activityRoute.projectId} activityId={activityRoute.activityId} fromPage={new URLSearchParams(window.location.search).get("from") ?? new URLSearchParams(window.location.search).get("page")} />;
  }

  const selectedMembership = memberships.find((membership) => membership.projects.id === selectedProjectId);
  const visibleNavItems = navItems.filter((item) => item.id !== "import" || memberships.some((membership) => membership.role === "admin" || membership.role === "supervisor"));
  function openActivity(activityId: string) {
    if (!selectedMembership) return;
    const returnPage = page === "home" ? "" : `&from=${encodeURIComponent(page)}`;
    window.location.href = `/projects/${selectedMembership.projects.id}/activities/${activityId}?project=${encodeURIComponent(selectedMembership.projects.id)}${returnPage}`;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/40 md:hidden"
        />
      )}
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "flex" : "hidden md:flex"} fixed inset-y-0 left-0 z-40 flex-col transition-[width] duration-200 md:static md:z-auto`
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
                <p style={{ color: "var(--sidebar-foreground)", fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.2 }}>Project Tracker</p>
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
              newlyJoinedProjectId={newlyJoinedProjectId}
              onSelect={selectProject}
              onProjectsChanged={loadProjects}
            />
          )}
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-3">
          {visibleNavItems.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false); }}
                aria-current={active ? "page" : undefined}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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
        <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6" style={{ flexShrink: 0 }}>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md border border-border p-2 text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{pageTitle[page]}</h1>
            <p className="max-w-[65ch] truncate text-xs text-muted-foreground sm:text-sm">
              {selectedMembership?.projects.name || "No project selected"} — Republic of Botswana &nbsp;|&nbsp; {new Date().toLocaleDateString("en-BW", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Date range */}
            <div className="hidden items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 sm:flex">
              <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>FY 2026</span>
              <select className="bg-transparent text-foreground focus:outline-none" style={{ fontSize: "0.75rem" }}>
                <option>Jan – Dec 2026</option>
                <option>Q1 2026</option>
                <option>Q2 2026</option>
              </select>
            </div>
            <NotificationsBell projectId={selectedProjectId} onNavigate={(target) => setPage(target)} />
            {selectedMembership && (
              <button
                type="button"
                onClick={() => { window.location.href = `/projects/${selectedMembership.projects.id}/presentation`; }}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <MonitorPlay className="h-4 w-4" />
                Presentation Mode
              </button>
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} showLabel />
          </div>
        </header>

        {/* Content */}
        <main key={selectedProjectId ?? "no-project"} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {projectsLoading && supabase && (
            <div className="mb-4 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground" role="status" aria-live="polite">
              Loading your projects...
            </div>
          )}
          {projectError && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-card p-4" role="alert">
              <p className="text-sm text-foreground">{projectError}</p>
              <button
                type="button"
                onClick={() => void loadProjects()}
                disabled={projectsLoading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Retry loading projects
              </button>
            </div>
          )}
          {!projectsLoading && !projectError && !selectedMembership && supabase && (
            <div className="rounded-md border border-border bg-card p-8 text-center shadow-sm">
              <h2 className="font-bold text-foreground">No active project selected</h2>
              <p className="mt-2 text-sm text-muted-foreground">Ask an organization administrator to add you to a project, or create one if you are an organization administrator.</p>
            </div>
          )}
          {selectedMembership && page === "home" && <Overview projectId={selectedMembership.projects.id} onViewChallenges={() => setPage("challenges")} onOpenActivity={openActivity} />}
          {selectedMembership && page !== "home" && <ProjectDataProvider projectId={selectedMembership.projects.id} role={selectedMembership.role}>
            <Suspense fallback={<PageLoadingFallback />}>
            {page === "workplan" && <WorkPlan onOpenActivity={openActivity} />}
            {page === "progress" && <ProgressTracking onOpenActivity={openActivity} />}
            {page === "challenges" && <Challenges />}
            {page === "dataentry" && <DataEntry memberships={memberships} />}
            {page === "import" && <ImportSpreadsheet memberships={memberships} />}
            {page === "review-imports" && <ImportedDataReview />}
            {page === "reports" && <Reports />}
            {page === "settings" && <ProjectSettings currentUserId={currentUserId} />}
            </Suspense>
          </ProjectDataProvider>}
        </main>
      </div>
    </div>
  );
}
