import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, TrendingUp, PenLine,
  BarChart3, Settings, Menu, X, ChevronRight, Bell, LogOut,
} from "lucide-react";
import { Overview } from "./components/Overview";
import { WorkPlan } from "./components/WorkPlan";
import { ProgressTracking } from "./components/ProgressTracking";
import { DataEntry } from "./components/DataEntry";
import { Reports } from "./components/Reports";

type Page = "home" | "workplan" | "progress" | "dataentry" | "reports" | "settings";

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "workplan", label: "Work Plan & Activities", icon: ClipboardList },
  { id: "progress", label: "Progress Tracking", icon: TrendingUp },
  { id: "dataentry", label: "Data Entry", icon: PenLine },
  { id: "reports", label: "Reports & Charts", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const pageTitle: Record<Page, string> = {
  home: "Dashboard Overview",
  workplan: "Work Plan & Activities",
  progress: "Progress Tracking",
  dataentry: "Data Entry",
  reports: "Reports & Charts",
  settings: "Settings",
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-200"
        style={{
          width: sidebarOpen ? 240 : 64,
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "var(--sidebar-border)", minHeight: 64 }}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "var(--sidebar-primary)" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.85rem" }}>ABS</span>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p style={{ color: "var(--sidebar-foreground)", fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.2 }}>ABS Phase II</p>
              <p style={{ color: "var(--sidebar-foreground)", fontSize: "0.65rem", opacity: 0.6, lineHeight: 1.2 }}>Botswana Dashboard</p>
            </div>
          )}
          <button
            className="ml-auto flex-shrink-0 hover:opacity-80 transition-opacity"
            style={{ color: "var(--sidebar-foreground)" }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map((item) => {
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
                  <p style={{ color: "var(--sidebar-foreground)", fontSize: "0.75rem", fontWeight: 600 }}>Project Officer</p>
                  <p style={{ color: "var(--sidebar-foreground)", fontSize: "0.65rem", opacity: 0.5 }}>DEA, Botswana</p>
                </div>
                <LogOut className="w-3.5 h-3.5 flex-shrink-0 opacity-50 hover:opacity-100 cursor-pointer" style={{ color: "var(--sidebar-foreground)" }} />
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
              Access & Benefit Sharing Phase II — Republic of Botswana &nbsp;|&nbsp; {new Date().toLocaleDateString("en-BW", { year: "numeric", month: "long", day: "numeric" })}
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
        <main className="flex-1 overflow-y-auto p-6">
          {page === "home" && <Overview />}
          {page === "workplan" && <WorkPlan />}
          {page === "progress" && <ProgressTracking />}
          {page === "dataentry" && <DataEntry />}
          {page === "reports" && <Reports />}
          {page === "settings" && (
            <div className="bg-card border border-border rounded-md p-6 shadow-sm">
              <h2 className="text-foreground mb-4">System Settings</h2>
              <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                Settings for user management, role-based access control, and data configuration will be managed here by the system administrator.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {["User Management", "Role & Permissions", "Notification Preferences", "Data Export Settings", "Audit Log", "System Information"].map((s) => (
                  <div key={s} className="border border-border rounded-md p-4 hover:bg-secondary/40 cursor-pointer transition-colors">
                    <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>{s}</p>
                    <p className="text-muted-foreground text-xs mt-1">Configure {s.toLowerCase()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
