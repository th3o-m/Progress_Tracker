import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const activities = [
  { id: "A-001", name: "Stakeholder Consultation – Maun", responsible: "R. Moeti", start: "2026-01-10", end: "2026-02-15", status: "Completed", progress: 100, district: "Ngamiland", category: "Consultation" },
  { id: "A-002", name: "Benefit-sharing Framework Review", responsible: "T. Sebele", start: "2026-02-01", end: "2026-07-30", status: "In Progress", progress: 55, district: "Central", category: "Policy" },
  { id: "A-003", name: "Community Sensitisation – Ghanzi", responsible: "B. Kefilwe", start: "2026-03-01", end: "2026-05-31", status: "Overdue", progress: 30, district: "Ghanzi", category: "Consultation" },
  { id: "A-004", name: "Data Collection – Chobe NP", responsible: "O. Ntshane", start: "2026-04-01", end: "2026-08-31", status: "In Progress", progress: 45, district: "Chobe", category: "Research" },
  { id: "A-005", name: "ABS Protocol Documentation", responsible: "L. Ditshego", start: "2026-01-15", end: "2026-03-30", status: "Completed", progress: 100, district: "South East", category: "Policy" },
  { id: "A-006", name: "Capacity Building Training – Francistown", responsible: "M. Gabarone", start: "2026-05-01", end: "2026-06-30", status: "In Progress", progress: 70, district: "Central", category: "Training" },
  { id: "A-007", name: "NBSAP Alignment Workshop", responsible: "P. Kgosi", start: "2026-06-15", end: "2026-07-15", status: "Not Started", progress: 0, district: "South East", category: "Policy" },
  { id: "A-008", name: "Financial Reporting Q2", responsible: "S. Modise", start: "2026-06-01", end: "2026-06-30", status: "In Progress", progress: 60, district: "South East", category: "Finance" },
  { id: "A-009", name: "Biodiversity Assessment – Okavango", responsible: "D. Tsheko", start: "2026-03-15", end: "2026-09-30", status: "In Progress", progress: 35, district: "Ngamiland", category: "Research" },
  { id: "A-010", name: "Beneficiary Registration Drive", responsible: "K. Moatlhodi", start: "2026-07-01", end: "2026-09-30", status: "Not Started", progress: 0, district: "Kgatleng", category: "Outreach" },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEAR_START = new Date("2026-01-01").getTime();
const YEAR_END = new Date("2026-12-31").getTime();
const YEAR_SPAN = YEAR_END - YEAR_START;

function pct(dateStr: string) {
  const t = new Date(dateStr).getTime();
  return Math.min(100, Math.max(0, ((t - YEAR_START) / YEAR_SPAN) * 100));
}

const statusColor: Record<string, string> = {
  "Completed": "#16a34a",
  "In Progress": "#0e7490",
  "Overdue": "#c0392b",
  "Not Started": "#94aac4",
};

const statusBadge: Record<string, string> = {
  "Completed": "bg-green-100 text-green-800",
  "In Progress": "bg-cyan-100 text-cyan-800",
  "Overdue": "bg-red-100 text-red-700",
  "Not Started": "bg-gray-100 text-gray-600",
};

export function WorkPlan() {
  const [sortField, setSortField] = useState<string>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("All");

  const categories = ["All", ...Array.from(new Set(activities.map((a) => a.category)))];

  const sorted = [...activities]
    .filter((a) => filter === "All" || a.category === filter)
    .sort((a, b) => {
      const av = (a as any)[sortField] ?? "";
      const bv = (b as any)[sortField] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Gantt Chart */}
      <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Gantt Chart — Activity Timeline 2026</h3>
          <span className="text-muted-foreground text-xs">Fiscal Year 2026</span>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 900 }}>
            {/* Month headers */}
            <div className="flex border-b border-border" style={{ paddingLeft: 260 }}>
              {months.map((m) => (
                <div key={m} className="flex-1 text-center py-1 text-muted-foreground border-r border-border" style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em" }}>
                  {m}
                </div>
              ))}
            </div>
            {/* Today marker position */}
            {sorted.map((a, i) => {
              const left = pct(a.start);
              const width = Math.max(0.5, pct(a.end) - pct(a.start));
              return (
                <div key={a.id} className={`flex items-center border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-secondary/30"}`} style={{ height: 36 }}>
                  <div className="flex items-center gap-2 px-3" style={{ width: 260, minWidth: 260 }}>
                    <span className="font-mono text-muted-foreground" style={{ fontSize: "0.65rem" }}>{a.id}</span>
                    <span className="truncate" style={{ fontSize: "0.75rem", maxWidth: 180 }}>{a.name}</span>
                  </div>
                  <div className="flex-1 relative" style={{ height: "100%" }}>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded-sm flex items-center px-1"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        height: 18,
                        backgroundColor: statusColor[a.status],
                        opacity: 0.85,
                      }}
                    >
                      {width > 5 && (
                        <span className="text-white truncate" style={{ fontSize: "0.6rem", fontWeight: 600 }}>{a.progress}%</span>
                      )}
                    </div>
                    {/* Progress fill */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded-sm"
                      style={{
                        left: `${left}%`,
                        width: `${width * a.progress / 100}%`,
                        height: 18,
                        backgroundColor: statusColor[a.status],
                        opacity: 1,
                        zIndex: 1,
                      }}
                    />
                    {/* Today line */}
                    <div
                      className="absolute top-0 bottom-0 border-l-2 border-dashed border-amber-500 z-10"
                      style={{ left: `${pct("2026-06-12")}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="px-5 py-2 bg-secondary/30 flex items-center gap-4">
          {Object.entries(statusColor).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
              <span className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border-l-2 border-dashed border-amber-500" />
            <span className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>Today</span>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Activity Register</h3>
          <div className="flex gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-1 rounded text-xs transition-colors ${filter === c ? "bg-[#1a3a6b] text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                style={{ fontWeight: 600 }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary">
                {[
                  ["id", "ID"], ["name", "Activity"], ["category", "Category"], ["district", "District"],
                  ["responsible", "Officer"], ["start", "Start"], ["end", "End"], ["status", "Status"], ["progress", "Progress"],
                ].map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
                    className="px-4 py-2.5 text-left cursor-pointer select-none hover:bg-secondary/80"
                    style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    <div className="flex items-center gap-1">
                      {label} <SortIcon field={field} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((a, i) => (
                <tr key={a.id} className={i % 2 === 0 ? "bg-white" : "bg-secondary/30"}>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{a.id}</td>
                  <td className="px-4 py-2 text-foreground">{a.name}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{a.category}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{a.district}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{a.responsible}</td>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{a.start}</td>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{a.end}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusBadge[a.status]}`} style={{ fontWeight: 600 }}>{a.status}</span>
                  </td>
                  <td className="px-4 py-2 w-28">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${a.progress}%`, backgroundColor: statusColor[a.status] }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{a.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
