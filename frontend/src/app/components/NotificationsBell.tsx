import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCheck } from "lucide-react";
import { ApiRequestError, apiRequest } from "../../lib/api";
import type { Activity } from "../ProjectDataContext";

type NotificationTarget = "workplan" | "challenges";

interface NotificationsBellProps {
  projectId: string | null;
  onNavigate?: (target: NotificationTarget) => void;
}

interface BackendNotification {
  id: string;
  project_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  severity: "info" | "success" | "warning" | "error" | string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: string;
  date: string;
  isRead: boolean;
  entityType: string | null;
  source: "backend" | "fallback";
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
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-BW", { year: "numeric", month: "short", day: "numeric" });
}

function severityClasses(severity: string): string {
  if (severity === "error") return "bg-red-100 text-red-800";
  if (severity === "success") return "bg-green-100 text-green-800";
  if (severity === "warning") return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-800";
}

function logNotificationRequestError(request: string, error: unknown) {
  if (error instanceof ApiRequestError) {
    console.error(`[Notifications] ${request} failed`, { status: error.status, message: error.message });
    return;
  }
  console.error(`[Notifications] ${request} failed`, error);
}

export function NotificationsBell({ projectId, onNavigate }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [backendNotifications, setBackendNotifications] = useState<BackendNotification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fallbackReadIds, setFallbackReadIds] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const generatedProjectIdsRef = useRef<Set<string>>(new Set());

  const loadNotifications = useCallback(async (options: { generateOverdue?: boolean } = {}) => {
    if (!projectId) {
      setBackendNotifications([]);
      setActivities([]);
      setUnreadCount(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (options.generateOverdue && !generatedProjectIdsRef.current.has(projectId)) {
        const request = `POST /notifications/generate-overdue?projectId=${projectId}`;
        try {
          await apiRequest(`/notifications/generate-overdue?projectId=${encodeURIComponent(projectId)}`, { method: "POST" });
          generatedProjectIdsRef.current.add(projectId);
        } catch (requestError) {
          logNotificationRequestError(request, requestError);
          // Existing notifications should still load even if generation fails.
        }
      }
      const notificationsRequest = `GET /notifications?projectId=${projectId}`;
      const unreadCountRequest = `GET /notifications/unread-count?projectId=${projectId}`;
      const [notificationsResponse, unreadResponse] = await Promise.all([
        apiRequest<{ notifications: BackendNotification[] }>(`/notifications?projectId=${encodeURIComponent(projectId)}`).catch((requestError) => {
          logNotificationRequestError(notificationsRequest, requestError);
          throw requestError;
        }),
        apiRequest<{ count: number }>(`/notifications/unread-count?projectId=${encodeURIComponent(projectId)}`).catch((requestError) => {
          logNotificationRequestError(unreadCountRequest, requestError);
          throw requestError;
        }),
      ]);
      const nextNotifications = notificationsResponse.notifications ?? [];
      setBackendNotifications(nextNotifications);
      setUnreadCount(unreadResponse.count ?? 0);
      if (nextNotifications.length === 0) setActivities(await apiRequest<Activity[]>(`/projects/${projectId}/activities`));
      else setActivities([]);
    } catch {
      setBackendNotifications([]);
      setActivities([]);
      setUnreadCount(0);
      setError("Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setFallbackReadIds([]);
    void loadNotifications();
  }, [projectId, loadNotifications]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const fallbackNotifications = useMemo<NotificationItem[]>(() => {
    if (backendNotifications.length > 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return activities
      .filter((activity) => isOverdue(activity, today))
      .map((activity) => {
        const id = `fallback-overdue:${activity.id}:${activity.end_date}`;
        return {
          id,
          title: "Overdue activity",
          message: `${activity.name} was due on ${formatDate(activity.end_date)} and is still not completed.`,
          severity: "warning",
          date: activity.end_date,
          isRead: fallbackReadIds.includes(id),
          entityType: "activity",
          source: "fallback",
        };
      });
  }, [activities, backendNotifications.length, fallbackReadIds]);

  const notifications = useMemo<NotificationItem[]>(() => {
    if (backendNotifications.length === 0) return fallbackNotifications;
    return backendNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      date: notification.created_at,
      isRead: notification.is_read,
      entityType: notification.entity_type,
      source: "backend",
    }));
  }, [backendNotifications, fallbackNotifications]);

  const displayUnreadCount = backendNotifications.length > 0 ? unreadCount : notifications.filter((item) => !item.isRead).length;

  async function markRead(notification: NotificationItem) {
    if (notification.source === "fallback") {
      setFallbackReadIds((current) => [...new Set([...current, notification.id])]);
      return;
    }
    await apiRequest(`/notifications/${notification.id}/read`, { method: "PATCH" });
    setBackendNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function markAllRead() {
    if (!projectId) return;
    if (backendNotifications.length === 0) {
      setFallbackReadIds(notifications.map((item) => item.id));
      return;
    }
    await apiRequest("/notifications/read-all", { method: "PATCH", body: JSON.stringify({ projectId }) });
    setBackendNotifications((current) => current.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next) void loadNotifications({ generateOverdue: true });
      return next;
    });
  }

  async function openNotification(notification: NotificationItem) {
    await markRead(notification);
    setOpen(false);
    if (notification.entityType === "challenge") onNavigate?.("challenges");
    else onNavigate?.("workplan");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative rounded-md p-2 transition-colors hover:bg-secondary"
        aria-label={`Notifications${displayUnreadCount ? `, ${displayUnreadCount} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {displayUnreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {displayUnreadCount > 9 ? "9+" : displayUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">{displayUnreadCount} unread</p>
            </div>
            {notifications.length > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-[#1a3a6b] hover:bg-secondary">
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && <div className="px-4 py-6 text-sm text-muted-foreground">Checking notifications...</div>}
            {!loading && error && <div className="px-4 py-4 text-sm text-red-700">{error}</div>}
            {!loading && !error && notifications.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications right now.</div>}
            {!loading && !error && notifications.map((notification) => (
              <article key={notification.id} className={`border-b border-border last:border-b-0 ${notification.isRead ? "bg-card" : "bg-red-50/50"}`}>
                <button type="button" onClick={() => void openNotification(notification)} className="w-full px-4 py-3 text-left hover:bg-secondary/70">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-amber-100 p-1.5 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                        {!notification.isRead && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Unread" />}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{notification.message}</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${severityClasses(notification.severity)}`}>{notification.severity === "warning" ? "Warning" : notification.severity}</span>
                        <span className="text-[11px] text-muted-foreground">{formatDate(notification.date)}</span>
                      </div>
                    </div>
                  </div>
                </button>
                {!notification.isRead && (
                  <div className="px-4 pb-3 pl-14">
                    <button type="button" onClick={() => void markRead(notification)} className="text-xs font-semibold text-[#1a3a6b] hover:underline">
                      Mark as read
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
