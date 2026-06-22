import { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

const activities = [
  "A-001 – Stakeholder Consultation – Maun",
  "A-002 – Benefit-sharing Framework Review",
  "A-003 – Community Sensitisation – Ghanzi",
  "A-004 – Data Collection – Chobe NP",
  "A-005 – ABS Protocol Documentation",
  "A-006 – Capacity Building Training – Francistown",
  "A-007 – NBSAP Alignment Workshop",
  "A-008 – Financial Reporting Q2",
  "A-009 – Biodiversity Assessment – Okavango",
  "A-010 – Beneficiary Registration Drive",
];

const districts = ["Ngamiland", "Central", "Ghanzi", "Chobe", "South East", "Kgatleng", "Kweneng", "North East", "Kgalagadi"];
const officers = ["R. Moeti", "T. Sebele", "B. Kefilwe", "O. Ntshane", "L. Ditshego", "M. Gabarone", "P. Kgosi", "S. Modise", "D. Tsheko", "K. Moatlhodi"];

type FormTab = "progress" | "challenge" | "beneficiary" | "financial";

export function DataEntry() {
  const [tab, setTab] = useState<FormTab>("progress");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    activity: "", officer: "", district: "", date: "2026-06-12",
    progressPct: "", statusUpdate: "", challengeDesc: "", challengeType: "",
    mitigationPlan: "", beneficiaryName: "", beneficiaryId: "", beneficiaryDistrict: "",
    beneficiaryType: "", contactNumber: "", amount: "", expenseCategory: "", description: "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  }

  const tabs: { id: FormTab; label: string }[] = [
    { id: "progress", label: "Activity Progress" },
    { id: "challenge", label: "Challenges & Issues" },
    { id: "beneficiary", label: "Beneficiary Data" },
    { id: "financial", label: "Financial Report" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-[#1a3a6b] rounded-md p-5 text-white">
        <p style={{ fontSize: "0.78rem", opacity: 0.8 }}>Access restricted to authorised project officers. All submissions are logged and auditable.</p>
      </div>

      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-green-800" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Data submitted successfully and recorded.</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 transition-colors ${tab === t.id ? "bg-[#1a3a6b] text-white" : "text-muted-foreground hover:bg-secondary"}`}
              style={{ fontSize: "0.82rem", fontWeight: 600 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Common fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity *</label>
              <select value={form.activity} onChange={(e) => set("activity", e.target.value)} required
                className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}>
                <option value="">Select activity...</option>
                {activities.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reporting Officer *</label>
              <select value={form.officer} onChange={(e) => set("officer", e.target.value)} required
                className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}>
                <option value="">Select officer...</option>
                {officers.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>District</label>
              <select value={form.district} onChange={(e) => set("district", e.target.value)}
                className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}>
                <option value="">Select district...</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Report Date *</label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required
                className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }} />
            </div>
          </div>

          <hr className="border-border mb-6" />

          {/* Tab-specific fields */}
          {tab === "progress" && (
            <div className="space-y-4">
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Percentage Complete: {form.progressPct || 0}%
                </label>
                <input type="range" min={0} max={100} step={5} value={form.progressPct || 0}
                  onChange={(e) => set("progressPct", e.target.value)}
                  className="w-full accent-[#1a3a6b]" />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status Update *</label>
                <select value={form.statusUpdate} onChange={(e) => set("statusUpdate", e.target.value)} required
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}>
                  <option value="">Select status...</option>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Progress Narrative *</label>
                <textarea rows={4} required placeholder="Describe activities undertaken, outputs achieved, and next steps..."
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none" style={{ fontSize: "0.875rem" }} />
              </div>
            </div>
          )}

          {tab === "challenge" && (
            <div className="space-y-4">
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Challenge Type *</label>
                <select value={form.challengeType} onChange={(e) => set("challengeType", e.target.value)} required
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}>
                  <option value="">Select type...</option>
                  <option>Financial</option>
                  <option>Human Resources</option>
                  <option>Logistics</option>
                  <option>Stakeholder Engagement</option>
                  <option>Technical</option>
                  <option>Policy / Regulatory</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Challenge Description *</label>
                <textarea rows={4} required placeholder="Describe the challenge or issue encountered..."
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none" style={{ fontSize: "0.875rem" }}
                  value={form.challengeDesc} onChange={(e) => set("challengeDesc", e.target.value)} />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Proposed Mitigation Plan</label>
                <textarea rows={3} placeholder="Describe the proposed mitigation or resolution steps..."
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none" style={{ fontSize: "0.875rem" }}
                  value={form.mitigationPlan} onChange={(e) => set("mitigationPlan", e.target.value)} />
              </div>
            </div>
          )}

          {tab === "beneficiary" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Beneficiary Full Name *</label>
                <input type="text" required placeholder="e.g. Kabo Mosweu"
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}
                  value={form.beneficiaryName} onChange={(e) => set("beneficiaryName", e.target.value)} />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>National ID / Omang *</label>
                <input type="text" required placeholder="e.g. 900101XXXX"
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}
                  value={form.beneficiaryId} onChange={(e) => set("beneficiaryId", e.target.value)} />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Beneficiary Type *</label>
                <select required className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}
                  value={form.beneficiaryType} onChange={(e) => set("beneficiaryType", e.target.value)}>
                  <option value="">Select type...</option>
                  <option>Individual</option>
                  <option>Community Group</option>
                  <option>Trust</option>
                  <option>CBO</option>
                  <option>NGO</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact Number</label>
                <input type="tel" placeholder="e.g. +267 71 234 567"
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}
                  value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</label>
                <textarea rows={3} placeholder="Additional context about this beneficiary..."
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none" style={{ fontSize: "0.875rem" }} />
              </div>
            </div>
          )}

          {tab === "financial" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Expense Category *</label>
                <select required className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}
                  value={form.expenseCategory} onChange={(e) => set("expenseCategory", e.target.value)}>
                  <option value="">Select category...</option>
                  <option>Personnel Costs</option>
                  <option>Travel & Transport</option>
                  <option>Workshops & Meetings</option>
                  <option>Equipment & Supplies</option>
                  <option>Consultancy</option>
                  <option>Beneficiary Transfers</option>
                  <option>Indirect Costs</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount (BWP) *</label>
                <input type="number" required placeholder="0.00" min="0" step="0.01"
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent" style={{ fontSize: "0.875rem" }}
                  value={form.amount} onChange={(e) => set("amount", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-muted-foreground mb-1" style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description *</label>
                <textarea rows={3} required placeholder="Describe what the expenditure covers..."
                  className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none" style={{ fontSize: "0.875rem" }}
                  value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-1 flex-shrink-0" style={{ minWidth: 16 }} />
                <p className="text-amber-800" style={{ fontSize: "0.8rem" }}>Ensure supporting documents (receipts, invoices) are attached to this submission. Financial entries are subject to audit verification.</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setForm((f) => ({ ...f, progressPct: "", statusUpdate: "", challengeDesc: "", challengeType: "", mitigationPlan: "", beneficiaryName: "", beneficiaryId: "", beneficiaryDistrict: "", beneficiaryType: "", contactNumber: "", amount: "", expenseCategory: "", description: "" }))}
              className="px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              Clear
            </button>
            <button type="submit"
              className="px-6 py-2 rounded-md bg-[#1a3a6b] text-white hover:bg-[#163264] transition-colors" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              Submit Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
