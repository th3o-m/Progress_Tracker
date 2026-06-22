import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp, Users, MapPin } from "lucide-react";

const kpis = [
  { label: "Total Activities", value: 48, icon: ListTodo, color: "bg-[#1a3a6b]", light: "bg-blue-50", text: "text-[#1a3a6b]" },
  { label: "Completed", value: 19, icon: CheckCircle2, color: "bg-[#16a34a]", light: "bg-green-50", text: "text-green-700" },
  { label: "In Progress", value: 21, icon: Clock, color: "bg-[#0e7490]", light: "bg-cyan-50", text: "text-cyan-700" },
  { label: "Overdue", value: 8, icon: AlertTriangle, color: "bg-[#c0392b]", light: "bg-red-50", text: "text-red-700" },
];

const monthlyProgress = [
  { month: "Jan", planned: 6, actual: 4 },
  { month: "Feb", planned: 8, actual: 7 },
  { month: "Mar", planned: 7, actual: 6 },
  { month: "Apr", planned: 9, actual: 8 },
  { month: "May", planned: 10, actual: 7 },
  { month: "Jun", planned: 8, actual: 5 },
];

const recentActivities = [
  { id: "A-001", name: "Stakeholder Consultation – Maun", status: "Completed", officer: "R. Moeti", date: "2026-06-05", district: "Ngamiland" },
  { id: "A-002", name: "Benefit-sharing Framework Review", status: "In Progress", officer: "T. Sebele", date: "2026-06-08", district: "Central" },
  { id: "A-003", name: "Community Sensitisation – Ghanzi", status: "Overdue", officer: "B. Kefilwe", date: "2026-05-30", district: "Ghanzi" },
  { id: "A-004", name: "Data Collection – Chobe NP", status: "In Progress", officer: "O. Ntshane", date: "2026-06-10", district: "Chobe" },
  { id: "A-005", name: "ABS Protocol Documentation", status: "Completed", officer: "L. Ditshego", date: "2026-06-03", district: "South East" },
];

const statusBadge: Record<string, string> = {
  "Completed": "bg-green-100 text-green-800",
  "In Progress": "bg-cyan-100 text-cyan-800",
  "Overdue": "bg-red-100 text-red-700",
  "Not Started": "bg-gray-100 text-gray-600",
};

export function Overview() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-md border border-border p-5 flex items-center gap-4 shadow-sm">
            <div className={`${k.light} rounded-md p-3`}>
              <k.icon className={`w-6 h-6 ${k.text}`} />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-widest">{k.label}</p>
              <p className={`text-3xl ${k.text}`} style={{ fontWeight: 700 }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-md border border-border p-4 flex items-center gap-3 shadow-sm">
          <Users className="w-5 h-5 text-[#1a3a6b]" />
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">Project Officers</p>
            <p className="text-[#1a3a6b]" style={{ fontWeight: 700, fontSize: "1.4rem" }}>12</p>
          </div>
        </div>
        <div className="bg-card rounded-md border border-border p-4 flex items-center gap-3 shadow-sm">
          <MapPin className="w-5 h-5 text-[#0e7490]" />
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">Districts Covered</p>
            <p className="text-[#0e7490]" style={{ fontWeight: 700, fontSize: "1.4rem" }}>9</p>
          </div>
        </div>
        <div className="bg-card rounded-md border border-border p-4 flex items-center gap-3 shadow-sm">
          <TrendingUp className="w-5 h-5 text-green-700" />
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">Overall Completion</p>
            <p className="text-green-700" style={{ fontWeight: 700, fontSize: "1.4rem" }}>39.6%</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-md border border-border p-5 shadow-sm">
        <h3 className="text-foreground mb-4" style={{ fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Planned vs Actual Progress (2026)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyProgress} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid var(--border)", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="planned" name="Planned" fill="#1a3a6b" radius={[2, 2, 0, 0]} />
            <Bar dataKey="actual" name="Actual" fill="#0e7490" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activities */}
      <div className="bg-card rounded-md border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recent Activity Updates</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-muted-foreground">
              {["ID", "Activity", "District", "Officer", "Date", "Status"].map((h) => (
                <th key={h} className="px-4 py-2 text-left" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentActivities.map((a, i) => (
              <tr key={a.id} className={i % 2 === 0 ? "bg-white" : "bg-secondary/40"}>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{a.id}</td>
                <td className="px-4 py-2 text-foreground">{a.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.district}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.officer}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.date}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${statusBadge[a.status]}`} style={{ fontWeight: 600 }}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
