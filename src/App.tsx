import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import StudentSite from "./components/StudentSite";
import { api } from "./lib/supabase";
import { emptyBundle, type DataBundle } from "./types";

const AdminPanel = lazy(() => import("./components/AdminPanel"));

export default function App() {
  const [admin, setAdmin] = useState(window.location.hash === "#admin");
  const [data, setData] = useState<DataBundle>(emptyBundle);
  const [loading, setLoading] = useState(true);
  const [publicError, setPublicError] = useState("");

  const loadPublicData = useCallback(async () => {
    setLoading(true);
    setPublicError("");
    try {
      setData((await api.publicData()) as DataBundle);
    } catch (error) {
      console.error("Could not load public academic data:", error);
      setPublicError(error instanceof Error ? error.message : "Could not load academic records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
    const hashChange = () => setAdmin(window.location.hash === "#admin");
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadPublicData();
    };
    window.addEventListener("hashchange", hashChange);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refreshTimer = window.setInterval(refreshWhenVisible, 30_000);
    return () => {
      window.removeEventListener("hashchange", hashChange);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(refreshTimer);
    };
  }, [loadPublicData]);

  function showAdmin() {
    window.location.hash = "admin";
    setAdmin(true);
    window.scrollTo(0, 0);
  }

  function showStudent() {
    history.replaceState(null, "", window.location.pathname);
    setAdmin(false);
    loadPublicData();
    window.scrollTo(0, 0);
  }

  if (admin) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] text-sm font-semibold text-[#0b2948]">
            Loading secure administration…
          </div>
        }
      >
        <AdminPanel onExit={showStudent} onDataChange={loadPublicData} />
      </Suspense>
    );
  }

  return <StudentSite data={data} loading={loading} error={publicError} onAdmin={showAdmin} />;
}
