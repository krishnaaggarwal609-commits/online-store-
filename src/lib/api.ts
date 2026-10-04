export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const serverBase = () => process.env.API_INTERNAL_URL || "http://127.0.0.1:4000";

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const isServer = typeof window === "undefined";
  const url = isServer ? `${serverBase()}/api/v1${path}` : `/api/v1${path}`;
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error || "Request failed", res.status, json.details);
  }
  return json as T;
}

export async function apiData<T>(path: string, init?: RequestInit): Promise<T> {
  const json = await api<{ data: T }>(path, init);
  return json.data;
}
