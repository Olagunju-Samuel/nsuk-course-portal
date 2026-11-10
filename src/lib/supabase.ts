import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

if (!projectId) {
  throw new Error("Missing Supabase project configuration. Set VITE_SUPABASE_PROJECT_ID.");
}

if (!publicAnonKey) {
  throw new Error(
    "Missing Supabase anon key. Set VITE_SUPABASE_ANON_KEY for the connected project before loading the public site.",
  );
}

export const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-e9064e7e`;

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const token = authenticated
    ? (await supabase.auth.getSession()).data.session?.access_token
    : publicAnonKey;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      ...(path === "/public/data" ? { cache: "no-store" as RequestCache } : {}),
      headers: {
        Authorization: `Bearer ${token || publicAnonKey}`,
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const missingFunction =
        response.status === 404 &&
        (payload?.code === "NOT_FOUND" || /function.*not found/i.test(payload?.message || ""));
      const reason =
        payload?.error || payload?.message || `The backend returned HTTP ${response.status}.`;
      if (missingFunction) {
        throw new Error(
          "The Supabase Edge Function is not deployed or is misconfigured. Deploy it to the connected Supabase project and check its configuration.",
        );
      }
      throw new Error(reason);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "The connected Supabase backend is unavailable. Check the project status and Edge Function deployment.",
      );
    }
    throw error;
  }
}

export const api = {
  publicData: () => request("/public/data"),
  adminData: () => request("/admin/data", {}, true),
  adminStatus: () => request<{ configured: boolean }>("/setup/status"),
  save: (entity: string, value: unknown) =>
    request(
      `/admin/${entity}`,
      {
        method: "POST",
        body: JSON.stringify(value),
      },
      true,
    ),
  saveCourseOffering: (course: unknown, offering: unknown) =>
    request(
      "/admin/course-offerings",
      {
        method: "POST",
        body: JSON.stringify({ course, offering }),
      },
      true,
    ),
  archive: (entity: string, id: string) =>
    request(`/admin/${entity}/${id}/archive`, { method: "POST" }, true),
  upload: (form: FormData) =>
    request<{ resource: unknown }>(
      "/admin/resources/upload",
      {
        method: "POST",
        body: form,
      },
      true,
    ),
  signedUrl: (id: string, admin = false) =>
    request<{ url: string }>(`/${admin ? "admin" : "public"}/resources/${id}/url`, {}, admin),
  importCourses: (rows: unknown[]) =>
    request<{ results: { row: number; success: boolean; error?: string }[] }>(
      "/admin/import/courses",
      { method: "POST", body: JSON.stringify({ rows }) },
      true,
    ),
};
