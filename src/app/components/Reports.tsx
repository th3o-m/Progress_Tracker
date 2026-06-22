import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Download, FileText, Table2 } from "lucide-react";

const quarterlyData = [
  { quarter: "Q1 2026", budget: 520000, spent: 487000, activities: 14, completed: 9 },
  { quarter: "Q2 2026", budget: 480000, spent: 312000, activities: 16, completed: 7 },
  { quarter: "Q3 2026", budget: 560000, spent: 0, activities: 10, completed: 0 },
  { quarter: "Q4 2026", budget: 440000, spent: 0, activities: 8, completed: 0 },
];

const challengeTypes = [
  { type: "Logistics", count: 5, color: "#1a3a6b" },
  { type: "Stakeholder", count: 4, color: "#0e7490" },
  { type: "Financial", count: 3, color: "#d97706" },
  { type: "Technical", count: 2, color: "#7c3aed" },
  { type: "HR", count: 2, color: "#c0392b" },
];

const beneficiaryTrend = [
  { month: "Jan", registered: 24 },
  { month: "Feb", registered: 41 },
  { month: "Mar", registered: 58 },
  { month: "Apr", registered: 72 },
  { month: "May", registered: 89 },
  { month: "Jun", registered: 103 },
];

const reports = [
  { name: "ABS Phase II Q1 2026 Progress Report", type: "PDF", date: "2026-04-10", size: "2.4 MB" },
  { name: "Activity Completion Summary – Jan–Mar 2026", type: "Excel", date: "2026-04-12", size: "380 KB" },
  { name: "Beneficiary Register – Q1 2026", type: "Excel", date: "2026-04-15", size: "540 KB" },
  { name: "Financial Report Q1 2026", type: "PDF", date: "2026-04-20", size: "1.1 MB" },
  { name: "Challenge & Risk Register – H1 2026", type: "PDF", date: "2026-06-01", size: "820 KB" },
];

export function Reports() {
  return (
    <div className="space-y-6">
      {/* Budget vs Spend */}
      <div className="bg-card border border-border rounded-md p-5 shadow-sm">
        <h3 className="mb-4" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Budget vs Actual Expenditure by Quarter (BWP)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={quarterlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: any) => [`BWP ${v.toLocaleString()}`]} contentStyle={{ fontSize: 12, borderRadius: 4 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="budget" name="Budgeted" fill="#1a3a6b" radius={[2, 2, 0, 0]} />
            <Bar dataKey="spent" name="Spent" fill="#0e7490" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Challenge pie */}
        <div className="bg-card border border-border rounded-md p-5 shadow-sm">
          <h3 className="mb-4" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Challenges Reported by Type</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={challengeTypes} cx="50%" cy="50%" outerRadius={70} dataKey="count" stroke="none">
                  {challengeTypes.map((d) => <Cell key={d.type} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} reported`]} contentStyle={{ fontSize: 12, borderRadius: 4 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {challengeTypes.map((d) => (
                <div key={d.type} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{d.type}</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Beneficiary trend */}
        <div className="bg-card border border-border rounded-md p-5 shadow-sm">
          <h3 className="mb-4" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Beneficiary Registrations (Cumulative)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={beneficiaryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
              <Line type="monotone" dataKey="registered" name="Beneficiaries" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quarterly summary table */}
      <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Quarterly Summary</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              {["Quarter", "Budget (BWP)", "Spent (BWP)", "Absorption %", "Activities", "Completed", "Completion %"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left" style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quarterlyData.map((q, i) => {
              const absPct = q.budget > 0 ? ((q.spent / q.budget) * 100).toFixed(1) : "—";
              const compPct = q.activities > 0 ? ((q.completed / q.activities) * 100).toFixed(1) : "—";
              return (
                <tr key={q.quarter} className={i % 2 === 0 ? "bg-white" : "bg-secondary/30"}>
                  <td className="px-4 py-2" style={{ fontWeight: 600 }}>{q.quarter}</td>
                  <td className="px-4 py-2 font-mono text-sm">{q.budget.toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-sm">{q.spent > 0 ? q.spent.toLocaleString() : "—"}</td>
                  <td className="px-4 py-2">
                    {q.spent > 0 ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${parseFloat(absPct as string) > 80 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`} style={{ fontWeight: 600 }}>{absPct}%</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2">{q.activities}</td>
                  <td className="px-4 py-2">{q.completed}</td>
                  <td className="px-4 py-2">
                    {q.completed > 0 ? (
                      <span className="text-green-700" style={{ fontWeight: 600 }}>{compPct}%</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Downloadable reports */}
      <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Generated Reports</h3>
          <button className="px-4 py-1.5 bg-[#1a3a6b] text-white rounded-md hover:bg-[#163264] transition-colors flex items-center gap-2" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            <Download className="w-3.5 h-3.5" /> Generate New Report
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              {["Report Name", "Type", "Generated", "Size", "Action"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left" style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={r.name} className={i % 2 === 0 ? "bg-white" : "bg-secondary/30"}>
                <td className="px-4 py-2 flex items-center gap-2">
                  {r.type === "PDF" ? <FileText className="w-4 h-4 text-red-500" /> : <Table2 className="w-4 h-4 text-green-600" />}
                  {r.name}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${r.type === "PDF" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`} style={{ fontWeight: 600 }}>{r.type}</span>
                </td>
                <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{r.date}</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">{r.size}</td>
                <td className="px-4 py-2">
                  <button className="text-[#1a3a6b] hover:underline flex items-center gap-1" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
