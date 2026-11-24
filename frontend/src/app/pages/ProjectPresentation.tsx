import { useCallback, useEffect, useMemo, useState } from "react";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, Download, FileText, Landmark, Target, Trophy, AlertTriangle } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { LoadingScreen } from "../components/LoadingScreen";

interface PresentationData {
  project: {
    id: string;
    name: string;
    description: string | null;
    objectives: string | null;
    projectCode: string | null;
    projectManager: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    district: string | null;
    sector: string | null;
  };
  executiveSummary: string;
  progressOverview: {
    overallProgress: number;
    totalActivities: number;
    completedActivities: number;
    ongoingActivities: number;
    delayedActivities: number;
    notStartedActivities: number;
    unresolvedChallenges: number;
  };
  recentUpdates: Array<{ id: string; title: string | null; description: string | null; progress: number; createdAt: string | null }>;
  achievements: string[];
  challenges: Array<{ id: string; title: string | null; description: string | null; mitigation: string | null; status: string | null }>;
  financialSummary: { totalBudget: number; totalSpent: number; remainingBudget: number; budgetUtilizationPct: number; latestReportingDate: string | null };
  financialReports: Array<{ id: string; reporting_date: string; amount_spent: number; cumulative_expenditure: number; notes: string | null; created_by: string; created_at: string }>;
  nextSteps: string[];
}

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleDateString("en-BW", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-BW", { style: "currency", currency: "BWP", maximumFractionDigits: 0 }).format(value || 0);
}

function EmptyLine({ children = "No records available yet." }: { children?: string }) {
  return <p className="rounded-md border border-dashed border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">{children}</p>;
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof ClipboardList }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 inline-flex rounded-md bg-background p-2 text-foreground"><Icon className="h-5 w-5" /></div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

export function ProjectPresentation({ projectId }: { projectId: string }) {
  const [data, setData] = useState<PresentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const endpoint = `/projects/${projectId}/presentation`;
    console.log("[ProjectPresentation] fetching presentation", { projectId, endpoint });
    apiRequest<PresentationData>(endpoint)
      .then((payload) => {
        console.log("[ProjectPresentation] presentation loaded", { projectId, hasPayload: Boolean(payload), keys: payload ? Object.keys(payload) : [] });
        if (active) setData(payload);
      })
      .catch((loadError) => {
        console.error("[ProjectPresentation] presentation load failed", { projectId, loadError });
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load presentation");
      })
      .finally(() => {
        console.log("[ProjectPresentation] presentation request finished", { projectId });
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [projectId]);

  const activityBreakdown = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Completed", value: data.progressOverview.completedActivities, color: "#15803d" },
      { label: "Ongoing", value: data.progressOverview.ongoingActivities, color: "var(--chart-2)" },
      { label: "Delayed", value: data.progressOverview.delayedActivities, color: "#b91c1c" },
      { label: "Not Started", value: data.progressOverview.notStartedActivities, color: "#64748b" },
    ].filter((item) => item.value > 0);
  }, [data]);

  const financialData = useMemo(() => data?.financialReports ?? [], [data]);

  const totalSlides = 8;
  const goToSlide = useCallback((next: number) => setSlide(Math.max(0, Math.min(totalSlides - 1, next))), [totalSlides]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "PageDown") goToSlide(slide + 1);
      if (event.key === "ArrowLeft" || event.key === "PageUp") goToSlide(slide - 1);
      if (event.key === "Home") goToSlide(0);
      if (event.key === "End") goToSlide(totalSlides - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goToSlide, slide, totalSlides]);

  if (loading) return <LoadingScreen message="Opening presentation…" />;
  if (error || !data) return <div className="flex min-h-screen items-center justify-center bg-[#101e60] p-6 text-white"><div className="max-w-md rounded-md bg-card p-6 text-foreground"><p className="font-semibold">Presentation unavailable</p><p className="mt-2 text-sm text-muted-foreground">{error || "No presentation data returned."}</p><Button className="mt-4" onClick={backToDashboard}>Back to dashboard</Button></div></div>;

  function backToDashboard() {
    window.location.href = `/?project=${projectId}`;
  }

  const slides = [
    { title: "Project Overview", eyebrow: "Presentation Mode", content: <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]"><div><h1 className="text-5xl font-bold leading-tight text-foreground">{data.project.name}</h1><p className="mt-5 max-w-3xl text-xl leading-8 text-muted-foreground">{data.project.description || "No project description recorded yet."}</p><div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2"><span>Code: {data.project.projectCode || "Not recorded"}</span><span>Manager: {data.project.projectManager || "Not recorded"}</span><span>District: {data.project.district || "Not recorded"}</span><span>Sector: {data.project.sector || "Not recorded"}</span><span>Start: {formatDate(data.project.startDate)}</span><span>End: {formatDate(data.project.endDate)}</span></div></div><div className="rounded-md bg-[#101e60] p-6 text-white"><p className="text-sm uppercase text-[#b4cde6]">Overall Progress</p><p className="mt-4 text-6xl font-bold">{data.progressOverview.overallProgress}%</p><Progress className="mt-6 bg-white/20" value={data.progressOverview.overallProgress} /><p className="mt-6 text-sm text-[#b4cde6]">Status: {data.project.status || "Not recorded"}</p></div></div> },
    { title: "Executive Summary", eyebrow: "Current Position", content: <div className="max-w-5xl"><p className="text-3xl leading-relaxed text-foreground">{data.executiveSummary}</p><div className="mt-10 grid gap-4 sm:grid-cols-3"><MetricCard icon={ClipboardList} label="Activities" value={data.progressOverview.totalActivities} /><MetricCard icon={Trophy} label="Completed" value={data.progressOverview.completedActivities} /><MetricCard icon={AlertTriangle} label="Open Challenges" value={data.progressOverview.unresolvedChallenges} /></div></div> },
    { title: "Progress Overview", eyebrow: "Implementation", content: <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]"><div><p className="text-7xl font-bold text-foreground">{data.progressOverview.overallProgress}%</p><p className="mt-3 text-muted-foreground">Average activity progress</p><Progress className="mt-6 h-3" value={data.progressOverview.overallProgress} /></div><div className="h-80">{activityBreakdown.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={activityBreakdown}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{activityBreakdown.map((item) => <Cell key={item.label} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyLine>No activities recorded yet.</EmptyLine>}</div></div> },
    { title: "Recent Progress Updates", eyebrow: "Latest Records", content: <div className="space-y-4">{data.recentUpdates.length ? data.recentUpdates.map((item) => <div key={item.id} className="rounded-md border border-border bg-card p-5"><div className="flex items-center justify-between gap-4"><h3 className="font-semibold text-foreground">{item.title || "Progress update"}</h3><span className="text-sm text-muted-foreground">{formatDate(item.createdAt)}</span></div><p className="mt-3 text-muted-foreground">{item.description || "No narrative recorded."}</p><Progress className="mt-4" value={item.progress} /></div>) : <EmptyLine>Limited progress update data is currently available.</EmptyLine>}</div> },
    { title: "Key Achievements", eyebrow: "Completed Work", content: <div className="grid gap-4 md:grid-cols-2">{data.achievements.length ? data.achievements.map((item) => <div key={item} className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><Trophy className="mb-3 h-5 w-5" /><p className="font-semibold">{item}</p></div>) : <EmptyLine>No completed activities recorded yet.</EmptyLine>}</div> },
    { title: "Challenges and Mitigation", eyebrow: "Risks", content: <div className="space-y-4">{data.challenges.length ? data.challenges.map((item) => <div key={item.id} className="rounded-md border border-red-200 bg-card p-5"><h3 className="font-semibold text-foreground">{item.title || "Challenge"}</h3><p className="mt-2 text-muted-foreground">{item.description || "No description recorded."}</p><p className="mt-3 text-sm font-semibold text-foreground">Mitigation: <span className="font-normal">{item.mitigation || "No mitigation recorded yet."}</span></p></div>) : <EmptyLine>No unresolved challenges recorded.</EmptyLine>}</div> },
    { title: "Financial Summary", eyebrow: "Budget and Expenditure", content: <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"><div className="grid gap-4"><MetricCard icon={Landmark} label="Project Budget" value={formatMoney(data.financialSummary.totalBudget)} /><MetricCard icon={FileText} label="Spent to Date" value={formatMoney(data.financialSummary.totalSpent)} /><MetricCard icon={ClipboardList} label="Remaining Budget" value={formatMoney(data.financialSummary.remainingBudget)} /><MetricCard icon={Trophy} label="Budget Used" value={`${data.financialSummary.budgetUtilizationPct}%`} /><p className="rounded-md border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">Latest reporting date: {formatDate(data.financialSummary.latestReportingDate)}</p></div><div className="h-80">{financialData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={financialData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="reporting_date" /><YAxis /><Tooltip formatter={(value) => formatMoney(Number(value))} labelFormatter={(label) => `Reporting date: ${label}`} /><Area type="monotone" dataKey="cumulative_expenditure" stroke="var(--chart-1)" fill="#bfdbfe" /></AreaChart></ResponsiveContainer> : <EmptyLine>No financial reports recorded yet.</EmptyLine>}</div></div> },
    { title: "Next Steps", eyebrow: "Forward Actions", content: <div className="space-y-4">{data.nextSteps.map((item, index) => <div key={item} className="flex gap-4 rounded-md border border-border bg-card p-5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#101e60] text-sm font-bold text-white">{index + 1}</span><p className="text-lg text-foreground">{item}</p></div>)}</div> },
  ];

  const activeSlide = slides[slide];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`@media print { .presentation-toolbar { display: none !important; } .presentation-slide { min-height: auto !important; box-shadow: none !important; } }`}</style>
      <div className="presentation-toolbar fixed inset-x-0 top-0 z-20 border-b border-border bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={backToDashboard}><ArrowLeft className="h-4 w-4" />Back to dashboard</Button>
          <div className="min-w-0 text-center"><p className="truncate text-sm font-semibold">{data.project.name}</p><p className="text-xs text-muted-foreground">Slide {slide + 1} of {totalSlides}</p></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-4 w-4" />Print</Button></div>
        </div>
      </div>
      <main className="mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-24 pt-24">
        <section className="presentation-slide min-h-[72vh] w-full rounded-md bg-card p-8 shadow-sm md:p-12">
          <div className="mb-8 flex items-center gap-3 text-sm font-semibold uppercase text-cyan-700"><Target className="h-4 w-4" />{activeSlide.eyebrow}</div>
          <h2 className="mb-8 text-4xl font-bold text-foreground">{activeSlide.title}</h2>
          {activeSlide.content}
        </section>
      </main>
      <div className="presentation-toolbar fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Button variant="outline" onClick={() => goToSlide(slide - 1)} disabled={slide === 0}><ChevronLeft className="h-4 w-4" />Previous</Button>
          <div className="flex flex-1 justify-center gap-1">{slides.map((item, index) => <button key={item.title} className={`h-2 rounded-full transition-all ${index === slide ? "w-8 bg-cyan-700" : "w-2 bg-muted"}`} onClick={() => goToSlide(index)} aria-label={`Go to slide ${index + 1}`} />)}</div>
          <Button onClick={() => goToSlide(slide + 1)} disabled={slide === totalSlides - 1}>Next<ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
