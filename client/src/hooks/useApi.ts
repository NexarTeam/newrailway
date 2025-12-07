import { useAuth } from "./useAuth";
import { useCallback } from "react";
import { API_BASE_URL } from "@/lib/queryClient";

export function useApi() {
  const { token, logout } = useAuth();

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      if (options.body && typeof options.body === "string") {
        headers.set("Content-Type", "application/json");
      }

      const fullUrl = url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
      const res = await fetch(fullUrl, { ...options, headers });

      if (res.status === 401) {
        logout();
        throw new Error("Session expired");
      }

      return res;
    },
    [token, logout]
  );

  const get = useCallback(
    async <T>(url: string): Promise<T> => {
      const res = await fetchWithAuth(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Request failed");
      }
      return res.json();
    },
    [fetchWithAuth]
  );

  const post = useCallback(
    async <T>(url: string, data?: unknown): Promise<T> => {
      const res = await fetchWithAuth(url, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Request failed");
      }
      return res.json();
    },
    [fetchWithAuth]
  );

  const patch = useCallback(
    async <T>(url: string, data?: unknown): Promise<T> => {
      const res = await fetchWithAuth(url, {
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Request failed");
      }
      return res.json();
    },
    [fetchWithAuth]
  );

  const del = useCallback(
    async <T>(url: string): Promise<T> => {
      const res = await fetchWithAuth(url, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Request failed");
      }
      return res.json();
    },
    [fetchWithAuth]
  );

  return { get, post, patch, del, fetchWithAuth };
}
