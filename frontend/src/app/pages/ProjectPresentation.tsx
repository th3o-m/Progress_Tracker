import { useCallback, useEffect, useMemo, useState } from "react";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, Download, FileText, Landmark, Target, Trophy, AlertTriangle } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";

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
  financialSummary: { totalBudget: number; totalSpent: number; approvedAmount: number; pendingAmount: number; rejectedAmount: number };
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
  return <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">{children}</p>;
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof ClipboardList }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex rounded-md bg-slate-100 p-2 text-slate-700"><Icon className="h-5 w-5" /></div>
      <p className="text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</p>
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
    apiRequest<PresentationData>(`/projects/${projectId}/presentation`)
      .then((payload) => { if (active) setData(payload); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load presentation"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const activityBreakdown = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Completed", value: data.progressOverview.completedActivities, color: "#15803d" },
      { label: "Ongoing", value: data.progressOverview.ongoingActivities, color: "#0e7490" },
      { label: "Delayed", value: data.progressOverview.delayedActivities, color: "#b91c1c" },
      { label: "Not Started", value: data.progressOverview.notStartedActivities, color: "#64748b" },
    ].filter((item) => item.value > 0);
  }, [data]);

  const financialData = useMemo(() => data ? [
    { label: "Approved", value: data.financialSummary.approvedAmount },
    { label: "Pending", value: data.financialSummary.pendingAmount },
    { label: "Rejected", value: data.financialSummary.rejectedAmount },
  ].filter((item) => item.value > 0) : [], [data]);

  const slides = [
    { title: "Project Overview", eyebrow: "Presentation Mode", content: <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]"><div><h1 className="text-5xl font-bold leading-tight text-slate-950">{data.project.name}</h1><p className="mt-5 max-w-3xl text-xl leading-8 text-slate-600">{data.project.description || "No project description recorded yet."}</p><div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-2"><span>Code: {data.project.projectCode || "Not recorded"}</span><span>Manager: {data.project.projectManager || "Not recorded"}</span><span>District: {data.project.district || "Not recorded"}</span><span>Sector: {data.project.sector || "Not recorded"}</span><span>Start: {formatDate(data.project.startDate)}</span><span>End: {formatDate(data.project.endDate)}</span></div></div><div className="rounded-md bg-slate-950 p-6 text-white"><p className="text-sm uppercase text-slate-300">Overall Progress</p><p className="mt-4 text-6xl font-bold">{data.progressOverview.overallProgress}%</p><Progress className="mt-6 bg-white/20" value={data.progressOverview.overallProgress} /><p className="mt-6 text-sm text-slate-300">Status: {data.project.status || "Not recorded"}</p></div></div> },
    { title: "Executive Summary", eyebrow: "Current Position", content: <div className="max-w-5xl"><p className="text-3xl leading-relaxed text-slate-800">{data.executiveSummary}</p><div className="mt-10 grid gap-4 sm:grid-cols-3"><MetricCard icon={ClipboardList} label="Activities" value={data.progressOverview.totalActivities} /><MetricCard icon={Trophy} label="Completed" value={data.progressOverview.completedActivities} /><MetricCard icon={AlertTriangle} label="Open Challenges" value={data.progressOverview.unresolvedChallenges} /></div></div> },
    { title: "Progress Overview", eyebrow: "Implementation", content: <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]"><div><p className="text-7xl font-bold text-slate-950">{data.progressOverview.overallProgress}%</p><p className="mt-3 text-slate-600">Average activity progress</p><Progress className="mt-6 h-3" value={data.progressOverview.overallProgress} /></div><div className="h-80">{activityBreakdown.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={activityBreakdown}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{activityBreakdown.map((item) => <Cell key={item.label} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyLine>No activities recorded yet.</EmptyLine>}</div></div> },
    { title: "Recent Progress Updates", eyebrow: "Latest Records", content: <div className="space-y-4">{data.recentUpdates.length ? data.recentUpdates.map((item) => <div key={item.id} className="rounded-md border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-4"><h3 className="font-semibold text-slate-950">{item.title || "Progress update"}</h3><span className="text-sm text-slate-500">{formatDate(item.createdAt)}</span></div><p className="mt-3 text-slate-600">{item.description || "No narrative recorded."}</p><Progress className="mt-4" value={item.progress} /></div>) : <EmptyLine>Limited progress update data is currently available.</EmptyLine>}</div> },
    { title: "Key Achievements", eyebrow: "Completed Work", content: <div className="grid gap-4 md:grid-cols-2">{data.achievements.length ? data.achievements.map((item) => <div key={item} className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"><Trophy className="mb-3 h-5 w-5" /><p className="font-semibold">{item}</p></div>) : <EmptyLine>No completed activities recorded yet.</EmptyLine>}</div> },
    { title: "Challenges and Mitigation", eyebrow: "Risks", content: <div className="space-y-4">{data.challenges.length ? data.challenges.map((item) => <div key={item.id} className="rounded-md border border-red-200 bg-white p-5"><h3 className="font-semibold text-slate-950">{item.title || "Challenge"}</h3><p className="mt-2 text-slate-600">{item.description || "No description recorded."}</p><p className="mt-3 text-sm font-semibold text-slate-700">Mitigation: <span className="font-normal">{item.mitigation || "No mitigation recorded yet."}</span></p></div>) : <EmptyLine>No unresolved challenges recorded.</EmptyLine>}</div> },
    { title: "Financial Summary", eyebrow: "Budget and Expenditure", content: <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"><div className="grid gap-4"><MetricCard icon={Landmark} label="Project Budget" value={formatMoney(data.financialSummary.totalBudget)} /><MetricCard icon={FileText} label="Total Recorded Spend" value={formatMoney(data.financialSummary.totalSpent)} /></div><div className="h-80">{financialData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={financialData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => formatMoney(Number(value))} /><Area type="monotone" dataKey="value" stroke="#1a3a6b" fill="#bfdbfe" /></AreaChart></ResponsiveContainer> : <EmptyLine>No financial entries recorded or visible for this role.</EmptyLine>}</div></div> },
    { title: "Next Steps", eyebrow: "Forward Actions", content: <div className="space-y-4">{data.nextSteps.map((item, index) => <div key={item} className="flex gap-4 rounded-md border border-slate-200 bg-white p-5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">{index + 1}</span><p className="text-lg text-slate-700">{item}</p></div>)}</div> },
  ];
  const totalSlides = slides.length;
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
  }, [goToSlide, slide]);

  function backToDashboard() {
    window.location.href = `/?project=${projectId}`;
  }

  if (loading) return <div className="min-h-screen bg-slate-100 p-6 text-slate-950" aria-busy="true"><div className="mx-auto max-w-7xl space-y-6 pt-20"><div className="flex items-center justify-between"><Skeleton className="h-9 w-40 bg-slate-300" /><Skeleton className="h-5 w-48 bg-slate-300" /><Skeleton className="h-9 w-24 bg-slate-300" /></div><section className="min-h-[72vh] rounded-md bg-white p-8 shadow-sm md:p-12"><Skeleton className="mb-8 h-4 w-40 bg-slate-200" /><Skeleton className="mb-8 h-12 w-2/3 bg-slate-200" /><div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]"><div className="space-y-5"><Skeleton className="h-16 w-full bg-slate-200" /><Skeleton className="h-8 w-5/6 bg-slate-200" /><Skeleton className="h-8 w-3/4 bg-slate-200" /><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-5 bg-slate-200" />)}</div></div><Skeleton className="h-72 bg-slate-200" /></div></section></div></div>;
  if (error || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white"><div className="max-w-md rounded-md bg-white p-6 text-slate-950"><p className="font-semibold">Presentation unavailable</p><p className="mt-2 text-sm text-slate-600">{error || "No presentation data returned."}</p><Button className="mt-4" onClick={backToDashboard}>Back to dashboard</Button></div></div>;

  const activeSlide = slides[slide];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <style>{`@media print { .presentation-toolbar { display: none !important; } .presentation-slide { min-height: auto !important; box-shadow: none !important; } }`}</style>
      <div className="presentation-toolbar fixed inset-x-0 top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={backToDashboard}><ArrowLeft className="h-4 w-4" />Back to dashboard</Button>
          <div className="min-w-0 text-center"><p className="truncate text-sm font-semibold">{data.project.name}</p><p className="text-xs text-slate-500">Slide {slide + 1} of {totalSlides}</p></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-4 w-4" />Print</Button></div>
        </div>
      </div>
      <main className="mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-24 pt-24">
        <section className="presentation-slide min-h-[72vh] w-full rounded-md bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 flex items-center gap-3 text-sm font-semibold uppercase text-cyan-700"><Target className="h-4 w-4" />{activeSlide.eyebrow}</div>
          <h2 className="mb-8 text-4xl font-bold text-slate-950">{activeSlide.title}</h2>
          {activeSlide.content}
        </section>
      </main>
      <div className="presentation-toolbar fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Button variant="outline" onClick={() => goToSlide(slide - 1)} disabled={slide === 0}><ChevronLeft className="h-4 w-4" />Previous</Button>
          <div className="flex flex-1 justify-center gap-1">{slides.map((item, index) => <button key={item.title} className={`h-2 rounded-full transition-all ${index === slide ? "w-8 bg-cyan-700" : "w-2 bg-slate-300"}`} onClick={() => goToSlide(index)} aria-label={`Go to slide ${index + 1}`} />)}</div>
          <Button onClick={() => goToSlide(slide + 1)} disabled={slide === totalSlides - 1}>Next<ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
