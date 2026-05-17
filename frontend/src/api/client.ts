/**
 * Tiny fetch wrapper for the ServiSense API.
 *
 * - Sends/receives cookies automatically (credentials: 'include')
 * - JSON-encodes request bodies that are plain objects
 * - Throws ApiError with status + detail on non-2xx responses
 * - Emits a window event on 401 so AuthContext can clear local state
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

// One-line debug aid: confirms at a glance which backend the bundle is hitting.
// In dev, this is empty (Vite proxy). In prod, this MUST be set to the
// deployed backend URL; otherwise relative /api/* requests fall into the SPA
// rewrite and return index.html.
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.info(
    `[ServiSense] API base = ${API_BASE || "(relative — using dev proxy)"}`,
  );
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type QueryValue = string | number | boolean | null | undefined;
type QueryRecord = Record<string, QueryValue>;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  // Accept any object whose own enumerable values are scalars. We iterate
  // with Object.entries at runtime, so structural-only typing is enough.
  query?: { [key: string]: QueryValue };
}

function buildUrl(path: string, query?: { [key: string]: QueryValue }): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as QueryRecord)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, query, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extraHeaders as Record<string, string> | undefined),
  };

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      // Browser sets multipart Content-Type with boundary automatically
      serializedBody = body;
    } else {
      headers["Content-Type"] = "application/json";
      serializedBody = JSON.stringify(body);
    }
  }

  const res = await fetch(buildUrl(path, query), {
    credentials: "include",
    headers,
    body: serializedBody,
    ...rest,
  });

  if (res.status === 401) {
    // Notify any listeners (AuthContext) so they can clear local user state.
    window.dispatchEvent(new CustomEvent("servisense:unauthorized"));
  }

  if (!res.ok) {
    let detail: unknown = undefined;
    let message = `Request failed (${res.status})`;
    try {
      detail = await res.json();
      // FastAPI returns { detail: "..." } or { detail: [{...}] } for validation
      const d = (detail as { detail?: unknown }).detail;
      if (typeof d === "string") {
        message = d;
      } else if (Array.isArray(d) && d.length > 0) {
        const first = d[0] as { msg?: string; loc?: unknown[] };
        const where = Array.isArray(first.loc) ? first.loc.join(".") : "";
        message = `${first.msg ?? "Validation error"}${where ? ` (${where})` : ""}`;
      }
    } catch {
      // Body wasn't JSON; leave default message
    }
    throw new ApiError(res.status, message, detail);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  // Hard guard: every API endpoint must return JSON. If we get HTML/text here
  // it almost always means the request hit the static-site origin instead of
  // the backend — i.e. VITE_API_URL is not set, so relative `/api/...` paths
  // are being caught by the SPA rewrite and returning index.html.
  const contentType = res.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      res.status,
      `Expected JSON from the API but received "${contentType || "no content-type"}". ` +
        `This usually means VITE_API_URL is not set, so the request hit the frontend's own ` +
        `domain instead of the backend.`,
    );
  }

  return (await res.json()) as T;
}

/** Convenience helpers. */
export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) =>
    apiFetch<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown, query?: RequestOptions["query"]) =>
    apiFetch<T>(path, { method: "POST", body, query }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

/** For raw binary file downloads. */
export async function apiDownload(path: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Download failed (${res.status})`);
  }
  return await res.blob();
}