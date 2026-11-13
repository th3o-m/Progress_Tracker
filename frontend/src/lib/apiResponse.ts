// Interpret HTTP API replies before passing them to application components.
// A 200 HTML page is not a successful API result (common with wrong preview URLs).
export class ApiRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function parseApiResponse<T>(response: Response, path: string): Promise<T> {
  if (response.status === 204 && response.ok) return null as T;

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const isJson = contentType.includes("application/json") || contentType.includes("+json");

  if (!isJson) {
    const isHtml = contentType.includes("text/html");
    throw new ApiRequestError(
      response.status,
      isHtml
        ? `The backend returned a web page instead of API data for ${path}. Check VITE_API_URL: it must point to the Express API, not the frontend site.`
        : `The backend returned an unexpected response for ${path} (HTTP ${response.status}). Check the backend address and VITE_API_URL.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError(response.status, `The backend returned invalid JSON for ${path} (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed (HTTP ${response.status})`;
    throw new ApiRequestError(response.status, message);
  }

  if (payload === null || payload === undefined) {
    throw new ApiRequestError(
      response.status,
      `The backend returned no account or project data for ${path}. Confirm VITE_API_URL points to the working API.`,
    );
  }

  return payload as T;
}
