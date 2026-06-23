import { supabase } from "./supabase";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");

export class ApiRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!supabase) throw new Error("Supabase authentication is not configured");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Your session has expired. Sign in again.");

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
      ...init.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiRequestError(response.status, payload?.error || `Request failed (${response.status})`);
  return payload as T;
}
