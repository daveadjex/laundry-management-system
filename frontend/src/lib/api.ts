"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )auth_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiRequest<T = any>(
  path: string,
  options: { method?: string; body?: any; formEncoded?: boolean } = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  let bodyToSend: any = undefined;

  if (options.body !== undefined) {
    if (options.formEncoded) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      bodyToSend = options.body;
    } else {
      headers["Content-Type"] = "application/json";
      bodyToSend = JSON.stringify(options.body);
    }
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: bodyToSend,
  });

  if (!res.ok) {
    let detail = "Something went wrong";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  get: <T = any>(path: string) => apiRequest<T>(path),
  post: <T = any>(path: string, body?: any) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T = any>(path: string, body?: any) => apiRequest<T>(path, { method: "PATCH", body }),
  del: <T = any>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
