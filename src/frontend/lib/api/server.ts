import { ADMIN_REVALIDATE_SECONDS, getApiBaseUrl } from "./config";

export type ApiError = { ok: false; message: string };
export type ApiSuccess<T> = { ok: true; data: T };

export async function apiGet<T>(path: string, tag: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    next: { revalidate: ADMIN_REVALIDATE_SECONDS, tags: [tag] },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function apiMutate<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  tags: string[],
  body?: unknown
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) {
        message = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const { revalidateTag } = await import("next/cache");
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  if (res.status === 204 || method === "DELETE") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
