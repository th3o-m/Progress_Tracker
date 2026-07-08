import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useProjectActivities } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";

export function WorkPlan() {
  const { data: activities, loading, error } = useProjectActivities();
  const [sort, setSort] = useState<"code" | "name" | "status">("code");
  const [ascending, setAscending] = useState(true);
  const [category, setCategory] = useState("All");
  const categories = ["All", ...new Set(activities.map((item) => item.category))];
  const rows = useMemo(() => activities.filter((item) => category === "All" || item.category === category).sort((a, b) => (ascending ? 1 : -1) * String(a[sort]).localeCompare(String(b[sort]))), [activities, category, sort, ascending]);
  const toggle = (field: typeof sort) => { if (field === sort) setAscending((value) => !value); else { setSort(field); setAscending(true); } };
  if (loading) return <p className="text-sm text-muted-foreground">Loading activities...</p>;
  if (error) return <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (activities.length === 0) return <EmptyState message="Create an activity in Data Entry to build the work plan." />;
  return <div className="space-y-5">
    <section className="rounded-md border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold uppercase tracking-wide">Activity Progress</h3><div className="flex gap-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded px-3 py-1 text-xs ${category === item ? "bg-[#1a3a6b] text-white" : "bg-secondary text-muted-foreground"}`}>{item}</button>)}</div></div><div className="space-y-3">{rows.map((item) => <div key={item.id}><div className="mb-1 flex justify-between text-xs"><span><strong>{item.code}</strong> · {item.name}</span><span>{item.progress_pct}%</span></div><div className="h-2 overflow-hidden rounded bg-secondary"><div className="h-full rounded bg-[#0e7490]" style={{ width: `${item.progress_pct}%` }} /></div></div>)}</div></section>
    <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h3 className="text-sm font-semibold uppercase tracking-wide">Activity Register</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr>{[["code", "Code"], ["name", "Activity"], ["status", "Status"]].map(([field, label]) => <th key={field} onClick={() => toggle(field as typeof sort)} className="cursor-pointer px-4 py-2 text-left text-xs uppercase"><span className="flex items-center gap-1">{label}{sort === field ? ascending ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" /> : null}</span></th>)}{["Category", "District", "Start", "End", "Progress"].map((item) => <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={item.id} className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">{item.code}</td><td className="px-4 py-2">{item.name}</td><td className="px-4 py-2">{item.status}</td><td className="px-4 py-2 text-xs text-muted-foreground">{item.category}</td><td className="px-4 py-2 text-xs text-muted-foreground">{item.district}</td><td className="px-4 py-2 text-xs">{item.start_date}</td><td className="px-4 py-2 text-xs">{item.end_date}</td><td className="px-4 py-2">{item.progress_pct}%</td></tr>)}</tbody></table></div></section>
  </div>;
}
