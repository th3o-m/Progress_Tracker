import { supabase } from "./supabase";
import { ApiRequestError, parseApiResponse } from "./apiResponse";

export { ApiRequestError } from "./apiResponse";

// The deployed Vercel app serves its backend under /_/backend/api.
// StackBlitz / remote development must set VITE_API_URL when using a separately
// hosted backend; localhost:3000 only works if the backend is also running.
const apiUrl = (
  import.meta.env.VITE_API_URL?.trim() ||
  (import.meta.env.DEV ? "http://localhost:3000/api" : "/_/backend/api")
).replace(/\/+$/, "");

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!supabase) throw new Error("Supabase authentication is not configured");

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new ApiRequestError(401, "Your session is unavailable. Please sign in again.");
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
        ...init.headers,
      },
    });
  } catch {
    throw new ApiRequestError(
      0,
      "Cannot reach the Project Tracker API. In StackBlitz, set VITE_API_URL to your deployed backend API address, restart the frontend, and ensure CORS permits the preview origin.",
    );
  }

  return parseApiResponse<T>(response, path);
}
