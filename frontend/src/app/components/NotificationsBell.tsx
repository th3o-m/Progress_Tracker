import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCheck } from "lucide-react";
import { apiRequest } from "../../lib/api";
import type { Activity } from "../ProjectDataContext";

interface NotificationsBellProps {
  projectId: string | null;
  onNavigate?: () => void;
}

interface NotificationItem {
  id: string;
  activityId: string;
  title: string;
  message: string;
  severity: "Warning";
  date: string;
}

const completedStatuses = new Set(["completed", "complete", "done", "cancelled"]);

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function isOverdue(activity: Activity, today: Date): boolean {
  if (!activity.end_date || completedStatuses.has(normalizeStatus(activity.status))) return false;
  const dueDate = new Date(`${activity.end_date}T23:59:59`);
  return Number.isFinite(dueDate.getTime()) && dueDate < today;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-BW", { year: "numeric", month: "short", day: "numeric" });
}

function readStorageKey(projectId: string): string {
  return `projectNotificationsRead:${projectId}`;
}

function readIds(projectId: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(readStorageKey(projectId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(projectId: string, ids: string[]) {
  localStorage.setItem(readStorageKey(projectId), JSON.stringify([...new Set(ids)]));
}

export function NotificationsBell({ projectId, onNavigate }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadActivities = useCallback(async () => {
    if (!projectId) {
      setActivities([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setActivities(await apiRequest<Activity[]>(`/projects/${projectId}/activities`));
    } catch (requestError) {
      setActivities([]);
      setError(requestError instanceof Error ? requestError.message : "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setReadNotificationIds([]);
      setActivities([]);
      return;
    }
    setReadNotificationIds(readIds(projectId));
    void loadActivities();
  }, [projectId, loadActivities]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const notifications = useMemo<NotificationItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return activities
      .filter((activity) => isOverdue(activity, today))
      .map((activity) => ({
        id: `overdue:${activity.id}:${activity.end_date}`,
        activityId: activity.id,
        title: "Overdue activity",
        message: `${activity.name} was due on ${formatDate(activity.end_date)} and is still not completed.`,
        severity: "Warning",
        date: activity.end_date,
      }));
  }, [activities]);

  const unreadCount = notifications.filter((item) => !readNotificationIds.includes(item.id)).length;

  function markRead(notificationId: string) {
    if (!projectId) return;
    const nextIds = [...readNotificationIds, notificationId];
    setReadNotificationIds([...new Set(nextIds)]);
    writeIds(projectId, nextIds);
  }

  function markAllRead() {
    if (!projectId) return;
    const nextIds = notifications.map((item) => item.id);
    setReadNotificationIds(nextIds);
    writeIds(projectId, nextIds);
  }

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next) void loadActivities();
      return next;
    });
  }

  function openNotification(notification: NotificationItem) {
    markRead(notification.id);
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative rounded-md p-2 transition-colors hover:bg-secondary"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            </div>
            {notifications.length > 0 && (
              <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-[#1a3a6b] hover:bg-secondary">
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && <div className="px-4 py-6 text-sm text-muted-foreground">Checking notifications...</div>}
            {!loading && error && <div className="px-4 py-4 text-sm text-red-700">{error}</div>}
            {!loading && !error && notifications.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications right now.</div>}
            {!loading && !error && notifications.map((notification) => {
              const read = readNotificationIds.includes(notification.id);
              return (
                <article key={notification.id} className={`border-b border-border last:border-b-0 ${read ? "bg-card" : "bg-red-50/50"}`}>
                  <button type="button" onClick={() => openNotification(notification)} className="w-full px-4 py-3 text-left hover:bg-secondary/70">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-amber-100 p-1.5 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                          {!read && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Unread" />}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.message}</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{notification.severity}</span>
                          <span className="text-[11px] text-muted-foreground">{formatDate(notification.date)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  {!read && (
                    <div className="px-4 pb-3 pl-14">
                      <button type="button" onClick={() => markRead(notification.id)} className="text-xs font-semibold text-[#1a3a6b] hover:underline">
                        Mark as read
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
