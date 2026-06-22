import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const pieData = [
  { name: "Consultation", value: 12, color: "#1a3a6b" },
  { name: "Research", value: 10, color: "#0e7490" },
  { name: "Policy", value: 8, color: "#16a34a" },
  { name: "Training", value: 9, color: "#d97706" },
  { name: "Finance", value: 5, color: "#7c3aed" },
  { name: "Outreach", value: 4, color: "#c0392b" },
];

const completionRates = [
  { category: "Policy", rate: 67 },
  { category: "Research", rate: 40 },
  { category: "Consultation", rate: 58 },
  { category: "Training", rate: 72 },
  { category: "Finance", rate: 60 },
  { category: "Outreach", rate: 0 },
];

const lineData = [
  { week: "W1 Jan", cumulative: 2 },
  { week: "W3 Jan", cumulative: 4 },
  { week: "W1 Feb", cumulative: 7 },
  { week: "W3 Feb", cumulative: 9 },
  { week: "W1 Mar", cumulative: 11 },
  { week: "W3 Mar", cumulative: 13 },
  { week: "W1 Apr", cumulative: 14 },
  { week: "W3 Apr", cumulative: 15 },
  { week: "W1 May", cumulative: 16 },
  { week: "W3 May", cumulative: 17 },
  { week: "W1 Jun", cumulative: 19 },
];

const districtData = [
  { district: "Ngamiland", activities: 7, completed: 3 },
  { district: "Central", activities: 9, completed: 4 },
  { district: "Ghanzi", activities: 5, completed: 1 },
  { district: "Chobe", activities: 6, completed: 2 },
  { district: "South East", activities: 8, completed: 5 },
  { district: "Kgatleng", district: "Kgatleng", activities: 4, completed: 2 },
  { district: "Kweneng", activities: 5, completed: 2 },
  { district: "North East", activities: 4, completed: 0 },
];

const statusSummary = [
  { status: "Completed", count: 19, pct: "39.6%", color: "#16a34a" },
  { status: "In Progress", count: 21, pct: "43.8%", color: "#0e7490" },
  { status: "Overdue", count: 8, pct: "16.7%", color: "#c0392b" },
  { status: "Not Started", count: 0, pct: "0.0%", color: "#94aac4" },
];

export function ProgressTracking() {
  return (
    <div className="space-y-6">
      {/* Status summary row */}
      <div className="grid grid-cols-4 gap-3">
        {statusSummary.map((s) => (
          <div key={s.status} className="bg-card border border-border rounded-md p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>{s.status}</span>
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{s.pct} of total</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pie */}
        <div className="bg-card border border-border rounded-md p-5 shadow-sm">
          <h3 className="mb-4" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Resource Allocation by Category</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                  {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} activities`]} contentStyle={{ fontSize: 12, borderRadius: 4 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{d.name}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="bg-card border border-border rounded-md p-5 shadow-sm">
          <h3 className="mb-4" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Completion Rate by Category (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completionRates} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={(v: any) => [`${v}%`]} contentStyle={{ fontSize: 12, borderRadius: 4 }} />
              <Bar dataKey="rate" fill="#1a3a6b" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line chart */}
      <div className="bg-card border border-border rounded-md p-5 shadow-sm">
        <h3 className="mb-4" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cumulative Activities Completed Over Time</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
            <Line type="monotone" dataKey="cumulative" name="Completed Activities" stroke="#0e7490" strokeWidth={2.5} dot={{ r: 4, fill: "#0e7490" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* District breakdown */}
      <div className="bg-card border border-border rounded-md p-5 shadow-sm">
        <h3 className="mb-4" style={{ fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress by District</h3>
        <div className="space-y-3">
          {districtData.map((d) => {
            const pct = d.activities > 0 ? Math.round((d.completed / d.activities) * 100) : 0;
            return (
              <div key={d.district} className="flex items-center gap-4">
                <span className="text-muted-foreground w-28 text-right" style={{ fontSize: "0.78rem" }}>{d.district}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 60 ? "#16a34a" : pct >= 30 ? "#0e7490" : "#c0392b" }} />
                </div>
                <span className="w-20 text-xs text-muted-foreground font-mono">{d.completed}/{d.activities} — {pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
