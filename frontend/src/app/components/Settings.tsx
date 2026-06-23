import { useEffect, useState, type FormEvent } from "react";
import { Save, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useProjectData } from "../ProjectDataContext";

const roles = ["officer", "supervisor", "finance", "admin"] as const;
const roleLabel: Record<(typeof roles)[number], string> = { officer: "Officer", supervisor: "Supervisor", finance: "Finance", admin: "Project Manager (Admin)" };
const permissions: Record<(typeof roles)[number], string[]> = {
  officer: ["View assigned district data", "Submit progress and challenges", "Register beneficiaries", "Submit financial entries"],
  supervisor: ["View all project operations", "Create activities and projects", "Review project metrics", "Generate reports"],
  finance: ["View project activities", "Submit financial entries", "Approve or reject financial entries"],
  admin: ["Full project access", "Manage members and roles", "Create and archive projects", "Manage all project records"],
};

export function Settings() {
  const { projectId, role, members, refresh } = useProjectData();
  const canManage = role === "admin";
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<(typeof roles)[number]>("officer");
  const [district, setDistrict] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { role: string; district: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(Object.fromEntries(members.map((member) => [member.id, { role: member.role, district: member.district ?? "" }])));
  }, [members]);

  async function addMember(event: FormEvent) {
    event.preventDefault(); setBusy("add"); setError(null); setMessage(null);
    try {
      await apiRequest(`/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ email, role: newRole, district: district || null }) });
      setEmail(""); setDistrict(""); setNewRole("officer"); setMessage("User added and permissions assigned."); await refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to add user"); }
    finally { setBusy(null); }
  }

  async function saveMember(memberId: string) {
    const draft = drafts[memberId]; if (!draft) return;
    setBusy(memberId); setError(null); setMessage(null);
    try {
      await apiRequest(`/projects/${projectId}/members/${memberId}`, { method: "PATCH", body: JSON.stringify({ role: draft.role, district: draft.district || null }) });
      setMessage("Role and permissions updated."); await refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update user"); }
    finally { setBusy(null); }
  }

  async function removeMember(memberId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this project?`)) return;
    setBusy(memberId); setError(null); setMessage(null);
    try { await apiRequest(`/projects/${projectId}/members/${memberId}`, { method: "DELETE" }); setMessage("User removed from the project."); await refresh(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to remove user"); }
    finally { setBusy(null); }
  }

  return <div className="space-y-6">
    <section className="rounded-md border border-border bg-card p-6 shadow-sm"><div className="flex items-start gap-3"><ShieldCheck className="h-6 w-6 text-[#1a3a6b]" /><div><h2 className="font-bold text-foreground">Roles & Permissions</h2><p className="mt-1 text-sm text-muted-foreground">Roles apply only to the selected project. Each role grants the permission bundle shown below.</p></div></div>{error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="mt-4 rounded bg-green-50 p-3 text-sm text-green-700">{message}</p>}</section>
    <div className="grid grid-cols-4 gap-4">{roles.map((item) => <section key={item} className="rounded-md border border-border bg-card p-4"><h3 className="mb-3 font-bold text-[#1a3a6b]">{roleLabel[item]}</h3><ul className="space-y-2 text-xs text-muted-foreground">{permissions[item].map((permission) => <li key={permission} className="flex gap-2"><span className="text-green-600">✓</span>{permission}</li>)}</ul></section>)}</div>
    {canManage && <section className="rounded-md border border-border bg-card p-5 shadow-sm"><h3 className="mb-4 flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4" />Add existing employee</h3><form onSubmit={addMember} className="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-3"><label className="text-sm">Employee email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label><label className="text-sm">Role<select value={newRole} onChange={(event) => setNewRole(event.target.value as typeof newRole)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2">{roles.map((item) => <option key={item} value={item}>{roleLabel[item]}</option>)}</select></label><label className="text-sm">District scope<input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Optional" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" /></label><button disabled={busy === "add"} className="rounded-md bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy === "add" ? "Adding..." : "Add user"}</button></form></section>}
    <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm"><div className="border-b border-border px-5 py-4"><h3 className="font-semibold">Project members</h3></div>{members.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No members are available.</p> : <table className="w-full text-sm"><thead className="bg-secondary"><tr>{["Employee", "Role", "District scope", "Permissions", "Actions"].map((item) => <th key={item} className="px-4 py-2 text-left text-xs uppercase">{item}</th>)}</tr></thead><tbody>{members.map((member) => { const draft = drafts[member.id] ?? { role: member.role, district: member.district ?? "" }; return <tr key={member.id} className="border-t border-border"><td className="px-4 py-3"><strong>{member.profiles?.full_name ?? "Unknown user"}</strong><p className="text-xs text-muted-foreground">{member.profiles?.email}</p></td><td className="px-4 py-3">{canManage ? <select value={draft.role} onChange={(event) => setDrafts((current) => ({ ...current, [member.id]: { ...draft, role: event.target.value } }))} className="rounded border border-border bg-background px-2 py-1">{roles.map((item) => <option key={item} value={item}>{roleLabel[item]}</option>)}</select> : <span>{roleLabel[member.role as keyof typeof roleLabel] ?? member.role}</span>}</td><td className="px-4 py-3">{canManage ? <input value={draft.district} onChange={(event) => setDrafts((current) => ({ ...current, [member.id]: { ...draft, district: event.target.value } }))} className="w-32 rounded border border-border bg-background px-2 py-1" placeholder="All" /> : member.district || "All"}</td><td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">{permissions[(draft.role in permissions ? draft.role : member.role) as keyof typeof permissions]?.join(" · ")}</td><td className="px-4 py-3">{canManage && <div className="flex gap-1"><button onClick={() => saveMember(member.id)} disabled={busy === member.id} title="Save role" className="rounded p-2 text-[#1a3a6b] hover:bg-secondary"><Save className="h-4 w-4" /></button><button onClick={() => removeMember(member.id, member.profiles?.full_name ?? "this user")} disabled={busy === member.id} title="Remove user" className="rounded p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>}</td></tr>; })}</tbody></table>}</section>
  </div>;
}
