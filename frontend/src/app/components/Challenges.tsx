import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useProjectChallenges } from "../ProjectDataContext";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./ui/skeleton";

type Filter = "open" | "resolved" | "all";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-BW", { year: "numeric", month: "short", day: "numeric" });
}

function ChallengesSkeleton() {
  return <div className="space-y-5" aria-busy="true">
    <section className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4"><div className="space-y-2"><Skeleton className="h-5 w-64" /><Skeleton className="h-4 w-80" /></div><div className="flex gap-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-8 w-28" />)}</div></div>
    </section>
    <section className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
    </section>
  </div>;
}

export function Challenges() {
  const { data: challenges, loading, error } = useProjectChallenges();
  const [filter, setFilter] = useState<Filter>("open");
  const openCount = challenges.filter((item) => !item.resolved).length;
  const resolvedCount = challenges.length - openCount;
  const rows = useMemo(() => challenges.filter((item) => filter === "all" || (filter === "open" ? !item.resolved : item.resolved)), [challenges, filter]);
  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: "open", label: "Currently faced", count: openCount },
    { id: "resolved", label: "Resolved", count: resolvedCount },
    { id: "all", label: "All", count: challenges.length },
  ];

  if (loading) return <ChallengesSkeleton />;
  if (error) return <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-foreground">Challenges Currently Being Faced</h2>
            <p className="mt-1 text-sm text-muted-foreground">Open risks and blockers linked to project activities.</p>
          </div>
          <div className="flex gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${filter === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState message={filter === "open" ? "No current challenges are recorded for this project." : "No challenges match this filter."} />
      ) : (
        <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                {["Status", "Challenge", "Activity", "Mitigation", "Reported"].map((item) => (
                  <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ${item.resolved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {item.resolved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {item.resolved ? "Resolved" : "Open"}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="font-semibold text-foreground">{item.challenge_type}</p>
                    <p className="mt-1 text-muted-foreground">{item.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-muted-foreground">{item.activities?.code ?? "Unlinked"}</p>
                    <p className="mt-1 text-foreground">{item.activities?.name ?? "No activity details"}</p>
                    {item.activities?.district && <p className="mt-1 text-xs text-muted-foreground">{item.activities.district}</p>}
                  </td>
                  <td className="max-w-sm px-4 py-3 text-muted-foreground">{item.mitigation_plan || "No mitigation plan recorded."}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
