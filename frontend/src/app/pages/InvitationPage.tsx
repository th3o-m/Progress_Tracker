import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, LogIn, UserPlus, XCircle } from "lucide-react";
import { apiRequest, ApiRequestError } from "../../lib/api";

interface InvitationDetails {
  token: string;
  role: string;
  status: "Pending" | "Accepted" | "Expired" | "Revoked";
  expiresAt: string;
  alreadyMember: boolean;
  project: { name: string } | null;
  manager: { name: string; email: string } | null;
}

export interface AcceptedInvitationProject {
  id: string;
  name: string;
  role: string;
}

interface AcceptInvitationResponse {
  success: boolean;
  alreadyMember: boolean;
  message: string;
  project: AcceptedInvitationProject;
}

const roleLabel: Record<string, string> = {
  officer: "Member",
  supervisor: "Supervisor",
  finance: "Finance",
  admin: "Project Manager",
};

function messageForError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 410 && /expired/i.test(error.message)) return "This invitation has expired.";
    if (error.status === 410) return "This invitation is no longer valid.";
    if (error.status === 409) return "You are already a member of this project.";
    if (error.status === 404 || error.status === 400) return "This invitation link is invalid.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Unable to load this invitation.";
}

export function InvitationPage({ token, onAccepted }: { token: string; onAccepted: (project: AcceptedInvitationProject) => Promise<void> }) {
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedProject, setAcceptedProject] = useState<AcceptedInvitationProject | null>(null);
  const redirectTimer = useRef<number | null>(null);

  const loadInvitation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDetails(await apiRequest<InvitationDetails>(`/invitations/${token}`));
    } catch (requestError) {
      setDetails(null);
      setError(messageForError(requestError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadInvitation(); }, [loadInvitation]);
  useEffect(() => () => {
    if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
  }, []);

  async function acceptInvitation() {
    if (joining || details?.alreadyMember) return;
    setJoining(true);
    setError(null);
    try {
      const result = await apiRequest<AcceptInvitationResponse>(`/invitations/${token}/accept`, { method: "POST" });
      setAcceptedProject(result.project);
      redirectTimer.current = window.setTimeout(() => {
        void onAccepted(result.project).catch((redirectError) => {
          setError(redirectError instanceof Error ? redirectError.message : "Unable to open the dashboard.");
          setAcceptedProject(null);
          setJoining(false);
        });
      }, 900);
    } catch (requestError) {
      setError(messageForError(requestError));
      setJoining(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl items-center">
        <div className="w-full rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              {error ? <XCircle className="h-5 w-5" /> : acceptedProject || details?.alreadyMember ? <CheckCircle2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="font-bold text-foreground">Project invitation</h1>
              <p className="text-xs text-muted-foreground">Projectt Tracker access</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading invitation...
            </div>
          ) : error ? (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>
          ) : details?.alreadyMember ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">You are already a member of this project.</div>
          ) : details?.status === "Accepted" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">This invitation has already been accepted.</div>
          ) : acceptedProject ? (
            <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              <p>Successfully joined {acceptedProject.name}.</p>
              <p className="flex items-center gap-2 text-emerald-700"><LoaderCircle className="h-4 w-4 animate-spin" />Redirecting to dashboard...</p>
            </div>
          ) : details ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">You've been invited to join</p>
                <h2 className="mt-1 text-2xl font-bold text-foreground">{details.project?.name ?? "Project"}</h2>
              </div>

              <dl className="grid gap-3 rounded-md border border-border bg-secondary/50 p-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Manager</dt>
                  <dd className="mt-1 font-medium text-foreground">{details.manager?.name ?? details.manager?.email ?? "Project manager"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Role</dt>
                  <dd className="mt-1 font-medium text-foreground">{roleLabel[details.role] ?? details.role}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Expires</dt>
                  <dd className="mt-1 font-medium text-foreground">{new Date(details.expiresAt).toLocaleString()}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={acceptInvitation}
                disabled={joining}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#1a3a6b] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {joining ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {joining ? "Joining..." : "Join Project"}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
