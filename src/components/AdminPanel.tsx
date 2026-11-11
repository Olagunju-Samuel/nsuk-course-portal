import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Archive,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { api, supabase } from "../lib/supabase";
import logoUrl from "../../logo.png";
import { formatBytes, formatDate, joinOfferings } from "../lib/data";
import type {
  AcademicSession,
  Course,
  DataBundle,
  Department,
  Faculty,
  JoinedOffering,
  Offering,
  Resource,
  ResourceCategory,
  Settings,
} from "../types";
import { categoryLabels, emptyBundle } from "../types";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Textarea, Toast } from "./ui";

type Tab =
  | "overview"
  | "faculties"
  | "departments"
  | "courses"
  | "resources"
  | "sessions"
  | "settings";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "faculties", label: "Faculties", icon: GraduationCap },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "resources", label: "PDF Resources", icon: FileText },
  { key: "sessions", label: "Academic Sessions", icon: UsersRound },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminPanel({
  onExit,
  onDataChange,
  darkMode,
  onToggleTheme,
}: {
  onExit: () => void;
  onDataChange: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [setupError, setSetupError] = useState("");
  const [data, setData] = useState<DataBundle>(emptyBundle);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Promise.all([supabase.auth.getSession(), api.adminStatus()])
      .then(([auth, status]) => {
        setSession(auth.data.session);
        setConfigured(status.configured);
      })
      .catch((error) => {
        setConfigured(false);
        setSetupError(
          error instanceof Error ? error.message : "Could not reach the admin service.",
        );
      })
      .finally(() => setLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function refresh() {
    if (!session) return;
    setRefreshing(true);
    try {
      setData((await api.adminData()) as DataBundle);
      onDataChange();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not load records.", "error");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (session) refresh();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const refreshAdminData = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refreshAdminData);
    document.addEventListener("visibilitychange", refreshAdminData);
    return () => {
      window.removeEventListener("focus", refreshAdminData);
      document.removeEventListener("visibilitychange", refreshAdminData);
    };
  }, [session]);

  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4500);
  }

  if (loading && configured === null) {
    return <FullLoader label="Checking administrator access…" />;
  }

  if (!session) {
    return (
      <>
        <AuthScreen
          configured={Boolean(configured)}
          setupError={setupError}
          onExit={onExit}
          notify={notify}
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
        />
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#182b40]" data-app-theme>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#08243f] text-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Nasarawa State University logo"
              className="h-10 w-10 rounded-lg border border-white/10 bg-white object-contain p-1"
            />
            <div>
              <p className="font-serif font-bold">NSUK Resources</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a5b8]">
                Administration
              </p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-4">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setMobileOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${tab === key
                ? "bg-white text-[#0b2948]"
                : "text-[#c2cfda] hover:bg-white/8 hover:text-white"
                }`}
            >
              <Icon className="h-4.5 w-4.5" /> {label}
            </button>
          ))}
        </nav>
        <div className="absolute inset-x-4 bottom-4 space-y-1 border-t border-white/10 pt-4">
          <button
            onClick={onExit}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-[#c2cfda] hover:bg-white/8"
          >
            <ArrowLeft className="h-4 w-4" /> Student website
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-[#c2cfda] hover:bg-white/8"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#dfe4e9] bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-[#dce2e8] p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-serif text-xl font-bold text-[#0b2948]">
                {tabs.find((item) => item.key === tab)?.label}
              </h1>
              <p className="hidden text-xs text-[#778495] sm:block">
                Manage verified academic records and resources
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce2e8] px-3 text-sm font-semibold text-[#405267] hover:bg-[#f2f4f7]"
              aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
              title={`Switch to ${darkMode ? "light" : "dark"} mode`}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{darkMode ? "Light mode" : "Dark mode"}</span>
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-[#35495e]">{session.user.email}</p>
              <p className="text-[11px] text-[#8290a0]">Authorized administrator</p>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          {refreshing && (
            <div className="mb-5 h-1 overflow-hidden rounded-full bg-[#e4e8ed]">
              <div className="h-full w-1/3 animate-pulse bg-[#b28b35]" />
            </div>
          )}
          {tab === "overview" && <Overview data={data} />}
          {tab === "faculties" && <Faculties data={data} refresh={refresh} notify={notify} />}
          {tab === "departments" && <Departments data={data} refresh={refresh} notify={notify} />}
          {tab === "courses" && <Courses data={data} refresh={refresh} notify={notify} />}
          {tab === "resources" && <Resources data={data} refresh={refresh} notify={notify} />}
          {tab === "sessions" && <Sessions data={data} refresh={refresh} notify={notify} />}
          {tab === "settings" && <SettingsPage data={data} refresh={refresh} notify={notify} />}
        </main>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function getAdminAuthErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code?: string }).code || "");
    const message = String((error as { message?: string }).message || "");

    if (code === "email_not_confirmed" || message.toLowerCase().includes("email not confirmed")) {
      return "This admin account has not been confirmed yet. Confirm the email in Supabase Auth or disable email confirmation for this project while setting up the first administrator.";
    }

    if (code === "invalid_credentials" || message.toLowerCase().includes("invalid login credentials")) {
      return "The admin email or password is incorrect. Check the credentials and try again.";
    }
  }

  if (error instanceof Error) return error.message;
  return "Authentication failed.";
}

function AuthScreen({
  configured,
  setupError,
  onExit,
  notify,
  darkMode,
  onToggleTheme,
}: {
  configured: boolean;
  setupError: string;
  onExit: () => void;
  notify: (message: string, type?: "success" | "error") => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
    } catch (error) {
      notify(getAdminAuthErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f3f6f8]">
      <div className="hidden w-[44%] flex-col justify-between bg-[#08243f] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Nasarawa State University logo"
            className="h-12 w-12 rounded-xl border border-white/10 bg-white object-contain p-2"
          />
          <div>
            <p className="font-serif text-xl font-bold">NSUK Resources</p>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9eb1c2]">Administration</p>
          </div>
        </div>
        <div className="max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9bb75]">
            Secure academic management
          </p>
          <h1 className="mt-4 font-serif text-5xl font-bold leading-tight">
            Keep every academic record accurate and accessible.
          </h1>
          <p className="mt-6 leading-7 text-[#c1ced9]">
            Manage faculties, departments, course offerings and verified PDF resources without
            editing source code.
          </p>
        </div>
        <p className="text-xs text-[#8299ad]">
          Administrator operations require authenticated server authorization.
        </p>
      </div>
      <div className="relative flex flex-1 items-center justify-center p-5" data-app-theme>
        <button
          type="button"
          onClick={onToggleTheme}
          className="absolute right-5 top-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce2e8] bg-white px-3 text-sm font-semibold text-[#405267] hover:bg-[#f2f4f7]"
          aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          title={`Switch to ${darkMode ? "light" : "dark"} mode`}
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden sm:inline">{darkMode ? "Light mode" : "Dark mode"}</span>
        </button>
        <div className="w-full max-w-md rounded-2xl border border-[#e0e5ea] bg-white p-7 shadow-xl sm:p-9">
          <button
            onClick={onExit}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#647386] hover:text-[#0b2948]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to website
          </button>
          <h2 className="font-serif text-3xl font-bold text-[#0b2948]">
            {setupError
              ? "Admin service unavailable"
              : configured
                ? "Administrator sign in"
                : "Administrator not configured"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6b7888]">
            {setupError
              ? `${setupError} Deploy the Supabase Edge Function before provisioning the administrator.`
              : configured
                ? "Use the authorized administrator account for this platform."
                : "Create the administrator in the Supabase dashboard, then add its admin profile before signing in. Public administrator registration is disabled for security."}
          </p>
          {configured && (
            <form className="mt-7 space-y-5" onSubmit={submit}>
              <Field label="Email address">
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="username"
                />
              </Field>
              <Field label="Password">
                <Input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                />
              </Field>
              <Button className="w-full" loading={busy} type="submit">
                Sign in securely
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Overview({ data }: { data: DataBundle }) {
  const recent = [...data.resources]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);
  const updated = [
    ...data.faculties.map((item) => ({ title: item.name, type: "Faculty", date: item.updatedAt })),
    ...data.departments.map((item) => ({
      title: item.name,
      type: "Department",
      date: item.updatedAt,
    })),
    ...data.courses.map((item) => ({
      title: `${item.code} — ${item.title}`,
      type: "Course",
      date: item.updatedAt,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);
  const cards = [
    ["Faculties", data.faculties.length, GraduationCap],
    ["Departments", data.departments.length, Building2],
    ["Courses", data.courses.length, BookOpen],
    [
      "Published resources",
      data.resources.filter((item) => item.publicationStatus === "published").length,
      FileText,
    ],
  ] as const;
  return (
    <div>
      <div className="mb-7">
        <h2 className="font-serif text-3xl font-bold text-[#0b2948]">Academic overview</h2>
        <p className="mt-2 text-sm text-[#6b7888]">
          Live totals and recent activity from saved records.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="rounded-xl border border-[#e0e5ea] bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#667588]">{label}</span>
              <Icon className="h-5 w-5 text-[#a17a25]" />
            </div>
            <p className="mt-5 font-serif text-4xl font-bold text-[#0b2948]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <Panel title="Recently updated records">
          {updated.length ? (
            updated.map((item) => (
              <div
                key={`${item.type}-${item.title}`}
                className="flex items-center justify-between border-b border-[#edf0f3] py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-[#243b52]">{item.title}</p>
                  <p className="text-xs text-[#7a8796]">{item.type}</p>
                </div>
                <span className="text-xs text-[#7a8796]">{formatDate(item.date)}</span>
              </div>
            ))
          ) : (
            <MiniEmpty text="No academic records have been added." />
          )}
        </Panel>
        <Panel title="Recent PDF uploads">
          {recent.length ? (
            recent.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-[#edf0f3] py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-[#243b52]">{item.title}</p>
                  <p className="text-xs text-[#7a8796]">{item.fileName}</p>
                </div>
                <Badge tone={item.publicationStatus === "published" ? "success" : "warning"}>
                  {item.publicationStatus}
                </Badge>
              </div>
            ))
          ) : (
            <MiniEmpty text="No PDF resources have been uploaded." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Faculties({ data, refresh, notify }: AdminProps) {
  const [editing, setEditing] = useState<Partial<Faculty> | null>(null);
  return (
    <>
      <PageHeader
        title="Faculties"
        description="Maintain current names while preserving former names and historical associations."
        action={
          <Button onClick={() => setEditing({ status: "active", previousNames: [] })}>
            <Plus className="h-4 w-4" /> Add faculty
          </Button>
        }
      />
      {data.faculties.length ? (
        <Table headers={["Faculty", "Former names", "Departments", "Status", "Actions"]}>
          {data.faculties.map((item) => (
            <tr key={item.id}>
              <Cell>
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 max-w-md text-xs text-[#758292]">
                  {item.description || "No description recorded"}
                </p>
              </Cell>
              <Cell>{item.previousNames?.length ? item.previousNames.join(", ") : "—"}</Cell>
              <Cell>
                {data.departments.filter((department) => department.facultyId === item.id).length}
              </Cell>
              <Cell>
                <StatusBadge status={item.status} />
              </Cell>
              <Cell>
                <Button variant="ghost" onClick={() => setEditing(item)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="No faculties added"
          description="Add only faculties confirmed by the university. No academic structure is assumed by default."
          action={
            <Button onClick={() => setEditing({ status: "active", previousNames: [] })}>
              Add first faculty
            </Button>
          }
        />
      )}
      {editing && (
        <FacultyForm
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
          notify={notify}
        />
      )}
    </>
  );
}

function FacultyForm({ value, onClose, onSaved, notify }: FormProps<Partial<Faculty>>) {
  const [form, setForm] = useState({
    ...value,
    previousNamesText: value.previousNames?.join("\n") || "",
  });
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      value.status !== "archived" &&
      form.status === "archived" &&
      !window.confirm(
        "Archive this faculty? Existing academic history will be preserved, but it will no longer be available for new active records.",
      )
    )
      return;
    setBusy(true);
    try {
      await api.save("faculties", {
        ...form,
        previousNames: form.previousNamesText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      notify("Faculty saved successfully.");
      onSaved();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={form.id ? "Edit faculty" : "Add faculty"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Faculty name">
          <Input
            required
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Previous faculty names (optional)" hint="Enter one historical name per line.">
          <Textarea
            value={form.previousNamesText}
            onChange={(e) => setForm({ ...form, previousNamesText: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "archived" })}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <FormActions onClose={onClose} busy={busy} />
      </form>
    </Modal>
  );
}

function Departments({ data, refresh, notify }: AdminProps) {
  const [editing, setEditing] = useState<Partial<Department> | null>(null);
  return (
    <>
      <PageHeader
        title="Departments"
        description="Assign each department to its currently confirmed faculty and retain records when structures change."
        action={
          <Button
            disabled={!data.faculties.some((faculty) => faculty.status === "active")}
            onClick={() =>
              setEditing({
                status: "active",
                facultyId: data.faculties.find((faculty) => faculty.status === "active")?.id,
              })
            }
          >
            <Plus className="h-4 w-4" /> Add department
          </Button>
        }
      />
      {!data.faculties.some((faculty) => faculty.status === "active") ? (
        <EmptyState
          title="Add a faculty first"
          description="Add and activate a faculty before assigning departments to it."
        />
      ) : data.departments.length ? (
        <Table headers={["Department", "Faculty", "Programme information", "Status", "Actions"]}>
          {data.departments.map((item) => (
            <tr key={item.id}>
              <Cell>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-[#758292]">{item.abbreviation || "No abbreviation"}</p>
              </Cell>
              <Cell>
                {data.faculties.find((faculty) => faculty.id === item.facultyId)?.name || "Unknown"}
              </Cell>
              <Cell>
                <p className="max-w-sm truncate">{item.programmeInfo || "—"}</p>
              </Cell>
              <Cell>
                <StatusBadge status={item.status} />
              </Cell>
              <Cell>
                <Button variant="ghost" onClick={() => setEditing(item)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="No departments added"
          description="Add confirmed departments and assign them to a faculty."
        />
      )}
      {editing && (
        <DepartmentForm
          data={data}
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
          notify={notify}
        />
      )}
    </>
  );
}

function DepartmentForm({
  data,
  value,
  onClose,
  onSaved,
  notify,
}: FormProps<Partial<Department>> & { data: DataBundle }) {
  const [form, setForm] = useState({
    ...value,
    facultyId:
      value.facultyId || data.faculties.find((faculty) => faculty.status === "active")?.id || "",
  });
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      value.status !== "archived" &&
      form.status === "archived" &&
      !window.confirm(
        "Archive this department? Existing courses and academic history will be preserved.",
      )
    )
      return;
    setBusy(true);
    try {
      await api.save("departments", form);
      notify("Department saved successfully.");
      onSaved();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={form.id ? "Edit department" : "Add department"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department name">
            <Input
              required
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Abbreviation (optional)">
            <Input
              value={form.abbreviation || ""}
              onChange={(e) => setForm({ ...form, abbreviation: e.target.value.toUpperCase() })}
            />
          </Field>
        </div>
        <Field label="Faculty">
          <Select
            required
            value={form.facultyId || ""}
            onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
          >
            {data.faculties
              .filter((item) => item.status === "active" || item.id === form.facultyId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Description (optional)">
          <Textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Programme information (optional)">
          <Textarea
            value={form.programmeInfo || ""}
            onChange={(e) => setForm({ ...form, programmeInfo: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "archived" })}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <FormActions onClose={onClose} busy={busy} />
      </form>
    </Modal>
  );
}

function Sessions({ data, refresh, notify }: AdminProps) {
  const [editing, setEditing] = useState<Partial<AcademicSession> | null>(null);
  return (
    <>
      <PageHeader
        title="Academic sessions"
        description="Create the sessions used for course offerings and resource discovery."
        action={
          <Button onClick={() => setEditing({ status: "active" })}>
            <Plus className="h-4 w-4" /> Add session
          </Button>
        }
      />
      {data.sessions.length ? (
        <Table headers={["Academic session", "Course offerings", "Status", "Updated", "Actions"]}>
          {data.sessions.map((item) => (
            <tr key={item.id}>
              <Cell>
                <p className="font-semibold">{item.name}</p>
              </Cell>
              <Cell>
                {data.offerings.filter((offering) => offering.academicSessionId === item.id).length}
              </Cell>
              <Cell>
                <StatusBadge status={item.status} />
              </Cell>
              <Cell>{formatDate(item.updatedAt)}</Cell>
              <Cell>
                <Button variant="ghost" onClick={() => setEditing(item)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="No academic sessions added"
          description="Add a session such as 2025/2026 before creating course offerings."
        />
      )}
      {editing && (
        <SessionForm
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
          notify={notify}
        />
      )}
    </>
  );
}

function SessionForm({ value, onClose, onSaved, notify }: FormProps<Partial<AcademicSession>>) {
  const [form, setForm] = useState(value);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      value.status !== "archived" &&
      form.status === "archived" &&
      !window.confirm(
        "Archive this academic session? Existing offerings and resources will be preserved.",
      )
    )
      return;
    setBusy(true);
    try {
      await api.save("sessions", form);
      notify("Academic session saved.");
      onSaved();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={form.id ? "Edit academic session" : "Add academic session"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Session" hint="Use the format YYYY/YYYY.">
          <Input
            required
            pattern="\d{4}/\d{4}"
            placeholder="2025/2026"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "archived" })}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <FormActions onClose={onClose} busy={busy} />
      </form>
    </Modal>
  );
}

function Courses({ data, refresh, notify }: AdminProps) {
  const offerings = useMemo(() => joinOfferings(data), [data]);
  const [editing, setEditing] = useState<JoinedOffering | null | "new">(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ facultyId: "", departmentId: "", level: "", semester: "" });
  const [showImport, setShowImport] = useState(false);
  const filtered = offerings.filter((item) =>
    `${item.course.code} ${item.course.title}`.toLowerCase().includes(query.toLowerCase()) &&
    (!filters.facultyId || item.faculty.id === filters.facultyId) &&
    (!filters.departmentId || item.department.id === filters.departmentId) &&
    (!filters.level || item.level === filters.level) &&
    (!filters.semester || item.semester === filters.semester),
  );
  const activeFacultyIds = new Set(
    data.faculties.filter((item) => item.status === "active").map((item) => item.id),
  );
  const ready =
    activeFacultyIds.size > 0 &&
    data.departments.some(
      (item) => item.status === "active" && activeFacultyIds.has(item.facultyId),
    ) &&
    data.sessions.some((item) => item.status === "active");
  return (
    <>
      <PageHeader
        title="Courses"
        description="Manage reusable course identities and session-specific offerings without duplicating course records."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <FileSpreadsheet className="h-4 w-4" /> CSV import
            </Button>
            <Button disabled={!ready} onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Add course
            </Button>
          </div>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Input
          className="xl:col-span-2"
          placeholder="Search course code or title"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          value={filters.facultyId}
          onChange={(e) => setFilters({ facultyId: e.target.value, departmentId: "", level: filters.level, semester: filters.semester })}
        >
          <option value="">All faculties</option>
          {data.faculties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Select
          value={filters.departmentId}
          disabled={!filters.facultyId}
          onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
        >
          <option value="">All departments</option>
          {data.departments.filter((item) => item.facultyId === filters.facultyId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <div className="flex gap-3">
          <Select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
            <option value="">All levels</option>
            {data.settings.levels.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })}>
            <option value="">All semesters</option>
            {data.settings.semesters.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
      </div>
      {!ready ? (
        <EmptyState
          title="Complete the academic structure first"
          description="Add an active faculty, a department assigned to that faculty, and an active academic session before creating a course offering. Draft offerings stay private; set Publication status to Published when they are ready for students."
        />
      ) : filtered.length ? (
        <Table
          headers={[
            "Course",
            "Department",
            "Level & semester",
            "Session",
            "Resources",
            "Publication",
            "Actions",
          ]}
        >
          {filtered.map((item) => (
            <tr key={item.id}>
              <Cell>
                <p className="font-semibold">{item.course.code}</p>
                <p className="text-xs text-[#758292]">{item.course.title}</p>
              </Cell>
              <Cell>{item.department.name}</Cell>
              <Cell>
                {item.level} · {item.semester}
              </Cell>
              <Cell>{item.session.name}</Cell>
              <Cell>{item.resources.length}</Cell>
              <Cell>
                <StatusBadge status={item.publicationStatus} />
              </Cell>
              <Cell>
                <Button variant="ghost" onClick={() => setEditing(item)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="ghost" onClick={() => setEditing({ ...item, id: "" } as JoinedOffering & { addOffering?: boolean })}>
                  <Plus className="h-4 w-4" /> Add session
                </Button>
                <Button
                  variant="ghost"
                  disabled={item.course.status === "archived"}
                  onClick={async () => {
                    const relatedOfferings = data.offerings.filter((offering) => offering.courseId === item.course.id);
                    const resourceCount = data.resources.filter((resource) => relatedOfferings.some((offering) => offering.id === resource.offeringId)).length;
                    if (!window.confirm(`Archive ${item.course.code}? Its ${relatedOfferings.length} offering(s) and ${resourceCount} resource(s) will be retained but hidden from students.`)) return;
                    try {
                      await api.archive("courses", item.course.id);
                      notify("Course archived; associated academic history and PDFs were preserved.");
                      await refresh();
                    } catch (error) {
                      notify(errorMessage(error), "error");
                    }
                  }}
                >
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="No course offerings found"
          description={
            query
              ? "No saved course matches your search."
              : "Create courses manually or validate and import a completed CSV file."
          }
        />
      )}
      {editing && (
        <CourseForm
          data={data}
          value={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
          notify={notify}
        />
      )}
      {showImport && (
        <CsvImport
          onClose={() => setShowImport(false)}
          onSaved={async () => {
            setShowImport(false);
            await refresh();
          }}
          notify={notify}
        />
      )}
    </>
  );
}

function CourseForm({
  data,
  value,
  onClose,
  onSaved,
  notify,
}: {
  data: DataBundle;
  value?: JoinedOffering;
  onClose: () => void;
  onSaved: () => void;
  notify: Notify;
}) {
  const addingOffering = Boolean(value && !value.id);
  const courseValue = value?.course;
  const initialFaculty =
    courseValue?.facultyId || data.faculties.find((item) => item.status === "active")?.id || "";
  const [course, setCourse] = useState<Partial<Course>>(
    courseValue || { facultyId: initialFaculty, departmentId: "", status: "active" },
  );
  const [offering, setOffering] = useState<Partial<Offering>>(
    value
      ? {
        ...(addingOffering ? {} : { id: value.id }),
        courseId: value.courseId,
        academicSessionId: addingOffering ? undefined : value.academicSessionId,
        level: value.level,
        semester: value.semester,
        creditUnits: value.creditUnits,
        courseStatus: value.courseStatus,
        prerequisites: value.prerequisites,
        outline: value.outline,
        publicationStatus: value.publicationStatus,
      }
      : {
        level: data.settings.levels[0],
        semester: data.settings.semesters[0],
        academicSessionId: data.sessions.find((item) => item.status === "active")?.id,
        publicationStatus: "draft",
        courseStatus: "",
      },
  );
  const [busy, setBusy] = useState(false);
  const departments = data.departments.filter(
    (item) =>
      item.facultyId === course.facultyId &&
      (item.status === "active" || item.id === course.departmentId),
  );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      value &&
      value.publicationStatus !== "archived" &&
      offering.publicationStatus === "archived" &&
      !window.confirm(
        "Archive this course offering? Its academic history and attached resources will be preserved.",
      )
    )
      return;
    setBusy(true);
    try {
      await api.saveCourseOffering(course, offering);
      notify("Course and offering saved successfully.");
      onSaved();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={addingOffering ? "Add academic-session offering" : value ? "Edit course offering" : "Add course offering"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-7">
        <section>
          <h3 className="mb-4 font-serif text-lg font-bold text-[#0b2948]">Course identity</h3>
          {addingOffering && <p className="mb-4 text-sm text-[#697789]">Adding an offering for {course.code} — {course.title}. Existing offerings and resources will remain unchanged.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course code">
              <Input
                required
                value={course.code || ""}
                disabled={addingOffering}
                onChange={(e) => setCourse({ ...course, code: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Course title">
              <Input
                required
                value={course.title || ""}
                disabled={addingOffering}
                onChange={(e) => setCourse({ ...course, title: e.target.value })}
              />
            </Field>
            <Field label="Faculty">
              <Select
                required
                value={course.facultyId || ""}
                disabled={addingOffering}
                onChange={(e) =>
                  setCourse({ ...course, facultyId: e.target.value, departmentId: "" })
                }
              >
                {data.faculties
                  .filter((item) => item.status === "active" || item.id === course.facultyId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Department">
              <Select
                required
                value={course.departmentId || ""}
                disabled={addingOffering}
                onChange={(e) => setCourse({ ...course, departmentId: e.target.value })}
              >
                <option value="">Select department</option>
                {departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Course description (optional)">
              <Textarea
                disabled={addingOffering}
                value={course.description || ""}
                onChange={(e) => setCourse({ ...course, description: e.target.value })}
              />
            </Field>
          </div>
        </section>
        <section className="border-t border-[#e5e9ee] pt-6">
          <h3 className="mb-4 font-serif text-lg font-bold text-[#0b2948]">
            Session-specific offering
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Academic session">
              <Select
                required
                value={offering.academicSessionId || ""}
                onChange={(e) => setOffering({ ...offering, academicSessionId: e.target.value })}
              >
                {data.sessions
                  .filter(
                    (item) => item.status === "active" || item.id === offering.academicSessionId,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Level">
              <Select
                required
                value={offering.level || ""}
                onChange={(e) => setOffering({ ...offering, level: e.target.value })}
              >
                {data.settings.levels.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
            <Field label="Semester">
              <Select
                required
                value={offering.semester || ""}
                onChange={(e) => setOffering({ ...offering, semester: e.target.value })}
              >
                {data.settings.semesters.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
            <Field label="Credit units (optional)">
              <Input
                type="number"
                min="0"
                max="20"
                value={offering.creditUnits ?? ""}
                onChange={(e) =>
                  setOffering({
                    ...offering,
                    creditUnits: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </Field>
            <Field label="Course status (optional)">
              <Select
                value={offering.courseStatus || ""}
                onChange={(e) =>
                  setOffering({
                    ...offering,
                    courseStatus: e.target.value as Offering["courseStatus"],
                  })
                }
              >
                <option value="">Not recorded</option>
                <option value="compulsory">Compulsory</option>
                <option value="elective">Elective</option>
              </Select>
            </Field>
            <Field label="Publication status">
              <Select
                value={offering.publicationStatus}
                onChange={(e) =>
                  setOffering({
                    ...offering,
                    publicationStatus: e.target.value as Offering["publicationStatus"],
                  })
                }
              >
                <option value="draft">Draft / unpublished</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Prerequisites (optional)">
              <Textarea
                value={offering.prerequisites || ""}
                onChange={(e) => setOffering({ ...offering, prerequisites: e.target.value })}
              />
            </Field>
            <Field label="Course outline (optional)">
              <Textarea
                value={offering.outline || ""}
                onChange={(e) => setOffering({ ...offering, outline: e.target.value })}
              />
            </Field>
          </div>
        </section>
        <FormActions onClose={onClose} busy={busy} />
      </form>
    </Modal>
  );
}

function Resources({ data, refresh, notify }: AdminProps) {
  const offerings = useMemo(() => joinOfferings(data), [data]);
  const [editing, setEditing] = useState<Resource | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filtered = data.resources.filter((item) => {
    const offering = offerings.find((record) => record.id === item.offeringId);
    return (
      (!query ||
        `${item.title} ${offering?.course.code || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!status || item.publicationStatus === status) &&
      (!category || item.category === category)
    );
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  async function preview(item: Resource) {
    try {
      const { url } = await api.signedUrl(item.id, true);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  }
  return (
    <>
      <PageHeader
        title="PDF resources"
        description="Upload PDFs to course offerings, then verify and publish them to make them available to students."
        action={
          <Button disabled={!offerings.length} onClick={() => setEditing("new")}>
            <Upload className="h-4 w-4" /> Upload PDF
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Search resource or course code"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All publication statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </div>
      {!offerings.length ? (
        <EmptyState
          title="Create a course offering first"
          description="Create a course offering first. You can upload its PDF here; students will only see it after the offering and PDF are published and the PDF is verified."
        />
      ) : filtered.length ? (
        <>
          <Table
            headers={[
              "Resource",
              "Course",
              "Academic details",
              "Category",
              "Publication",
              "Verification",
              "Upload date",
              "Actions",
            ]}
          >
            {paged.map((item) => {
              const offering = offerings.find((record) => record.id === item.offeringId);
              return (
                <tr key={item.id}>
                  <Cell>
                    <p className="max-w-xs font-semibold">{item.title}</p>
                    <p className="text-xs text-[#758292]">
                      {item.fileName} · {formatBytes(item.fileSize)}
                    </p>
                  </Cell>
                  <Cell>{offering?.course.code || "Unknown"}</Cell>
                  <Cell>
                    <p>{offering?.department.name}</p>
                    <p className="text-xs text-[#758292]">
                      {offering?.level} · {offering?.semester} · {offering?.session.name}
                    </p>
                  </Cell>
                  <Cell>{categoryLabels[item.category]}</Cell>
                  <Cell>
                    <StatusBadge status={item.publicationStatus} />
                  </Cell>
                  <Cell>
                    <StatusBadge status={item.verificationStatus} />
                  </Cell>
                  <Cell>{formatDate(item.uploadedAt)}</Cell>
                  <Cell>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        onClick={() => preview(item)}
                        aria-label="Preview PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setEditing(item)}
                        aria-label="Edit resource"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </Cell>
                </tr>
              );
            })}
          </Table>
          <div className="mt-4 flex items-center justify-between text-sm text-[#6d7b8b]">
            <span>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page * pageSize >= filtered.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title="No PDF resources found"
          description={
            query || status || category
              ? "No saved resource matches these filters."
              : "Upload a real PDF and attach it to a course offering."
          }
        />
      )}
      {editing && (
        <ResourceForm
          data={data}
          value={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
          notify={notify}
        />
      )}
    </>
  );
}

function ResourceForm({
  data,
  value,
  onClose,
  onSaved,
  notify,
}: {
  data: DataBundle;
  value?: Resource;
  onClose: () => void;
  onSaved: () => void;
  notify: Notify;
}) {
  const offerings = joinOfferings(data);
  const selectedOffering = offerings.find((item) => item.id === value?.offeringId);
  const initialOffering = selectedOffering || offerings[0];
  const [form, setForm] = useState({
    title: value?.title || "",
    category: value?.category || ("lecture_note" as ResourceCategory),
    description: value?.description || "",
    publicationYear: value?.publicationYear?.toString() || "",
    publicationStatus: value?.publicationStatus || "draft",
    verificationStatus: value?.verificationStatus || "unverified",
  });
  const [academic, setAcademic] = useState({
    facultyId: initialOffering?.faculty.id || "",
    departmentId: initialOffering?.department.id || "",
    level: initialOffering?.level || "",
    semester: initialOffering?.semester || "",
    courseId: initialOffering?.course.id || "",
    sessionId: initialOffering?.session.id || "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const departments = data.departments.filter((item) => item.facultyId === academic.facultyId);
  const departmentOfferings = offerings.filter(
    (item) => item.faculty.id === academic.facultyId && item.department.id === academic.departmentId,
  );
  const levels = [...new Set(departmentOfferings.map((item) => item.level))];
  const semesters = [...new Set(departmentOfferings.filter((item) => item.level === academic.level).map((item) => item.semester))];
  const courses = [...new Map(
    departmentOfferings
      .filter((item) => item.level === academic.level && item.semester === academic.semester)
      .map((item) => [item.course.id, item.course]),
  ).values()];
  const availableOfferings = departmentOfferings.filter(
    (item) => item.level === academic.level && item.semester === academic.semester && item.course.id === academic.courseId,
  );
  const current = availableOfferings.find((item) => item.session.id === academic.sessionId);
  const canPublish = current?.publicationStatus === "published";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!value && !files.length) return notify("Select at least one PDF file to upload.", "error");
    if (!current) return notify("Select a valid faculty, department, level, semester, course, and academic session.", "error");
    if (files.some((file) => file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")))
      return notify("Only PDF files are accepted.", "error");
    const oversizedFile = files.find((file) => file.size > data.settings.maxFileSizeMb * 1024 * 1024);
    if (oversizedFile)
      return notify(`${oversizedFile.name} exceeds ${data.settings.maxFileSizeMb} MB.`, "error");
    if (
      value &&
      value.publicationStatus !== "archived" &&
      form.publicationStatus === "archived" &&
      !window.confirm(
        "Archive this PDF resource? The stored file and metadata will be preserved but students will no longer have access.",
      )
    )
      return;
    setBusy(true);
    setProgress(0);
    try {
      if (files.length) {
        const failures: string[] = [];
        let uploaded = 0;
        for (const [index, file] of files.entries()) {
          const payload = new FormData();
          const resourceTitle = files.length > 1
            ? file.name.replace(/\.pdf$/i, "")
            : form.title;
          Object.entries({ ...form, title: resourceTitle }).forEach(([key, val]) =>
            payload.append(key, String(val)),
          );
          payload.append("offeringId", current.id);
          if (value) payload.append("resourceId", value.id);
          payload.append("file", file);
          try {
            await api.upload(payload);
            uploaded += 1;
          } catch (error) {
            failures.push(`${file.name}: ${errorMessage(error)}`);
          }
          setProgress(Math.round(((index + 1) / files.length) * 100));
        }
        if (failures.length) {
          const message = `${uploaded} of ${files.length} PDFs uploaded.${uploaded ? " " : ""}${failures.join("; ")}`;
          notify(message, "error");
          if (uploaded) onSaved();
          return;
        }
        notify(`${uploaded} PDF${uploaded === 1 ? "" : "s"} uploaded successfully.`);
      } else if (value) {
        await api.save("resources", { ...value, ...form });
      }
      if (value) notify("Resource updated successfully.");
      onSaved();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }
  return (
    <Modal title={value ? "Edit PDF resource" : "Upload PDF resource"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-[#e5e9ee] p-4">
          <h3 className="font-serif text-lg font-bold text-[#0b2948]">Academic association</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Faculty">
              <Select required disabled={Boolean(value)} value={academic.facultyId} onChange={(e) => setAcademic({ facultyId: e.target.value, departmentId: "", level: "", semester: "", courseId: "", sessionId: "" })}>
                <option value="">Select faculty</option>
                {data.faculties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="Department">
              <Select required disabled={Boolean(value) || !academic.facultyId} value={academic.departmentId} onChange={(e) => setAcademic({ ...academic, departmentId: e.target.value, level: "", semester: "", courseId: "", sessionId: "" })}>
                <option value="">Select department</option>
                {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="Academic level">
              <Select required disabled={Boolean(value) || !academic.departmentId} value={academic.level} onChange={(e) => setAcademic({ ...academic, level: e.target.value, semester: "", courseId: "", sessionId: "" })}>
                <option value="">Select level</option>
                {levels.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Semester">
              <Select required disabled={Boolean(value) || !academic.level} value={academic.semester} onChange={(e) => setAcademic({ ...academic, semester: e.target.value, courseId: "", sessionId: "" })}>
                <option value="">Select semester</option>
                {semesters.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Course">
              <Select required disabled={Boolean(value) || !academic.semester} value={academic.courseId} onChange={(e) => setAcademic({ ...academic, courseId: e.target.value, sessionId: "" })}>
                <option value="">Select course</option>
                {courses.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.title}</option>)}
              </Select>
            </Field>
            <Field label="Academic session / year">
              <Select required disabled={Boolean(value) || !academic.courseId} value={academic.sessionId} onChange={(e) => setAcademic({ ...academic, sessionId: e.target.value })}>
                <option value="">Select session</option>
                {availableOfferings.map((item) => <option key={item.session.id} value={item.session.id}>{item.session.name}</option>)}
              </Select>
            </Field>
          </div>
          {!value && academic.courseId && !availableOfferings.length && (
            <p className="text-sm text-amber-800">This course has no offering for the selected level and semester. Add its offering under Courses before uploading resources.</p>
          )}
        </section>
        {current && (
          <div className="grid gap-3 rounded-xl bg-[#f3f6f8] p-4 text-sm sm:grid-cols-5">
            {[
              ["Faculty", current.faculty.name],
              ["Department", current.department.name],
              ["Level", current.level],
              ["Semester", current.semester],
              ["Session", current.session.name],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-[#768494]">{label}</p>
                <p className="mt-1 font-semibold text-[#243b52]">{val}</p>
              </div>
            ))}
          </div>
        )}
        {current?.publicationStatus !== "published" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This course offering is not published. The PDF will remain hidden from students until
            its course offering is published.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Resource title">
            <Input
              required={!files.length || files.length === 1}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={files.length > 1 ? "Each PDF will use its filename as the title" : "e.g. Week 1 lecture notes"}
            />
          </Field>
          <Field
            label="Publication year (optional)"
            hint="Use this when the document year differs from its academic session."
          >
            <Input
              type="number"
              min="1900"
              max="2200"
              value={form.publicationYear}
              onChange={(e) => setForm({ ...form, publicationYear: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ResourceCategory })}
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description or topic covered (optional)">
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Publication status">
            <Select
              value={form.publicationStatus}
              onChange={(e) =>
                setForm({
                  ...form,
                  publicationStatus: e.target.value as typeof form.publicationStatus,
                })
              }
            >
              <option value="draft">Draft / unpublished</option>
              <option
                value="published"
                disabled={form.verificationStatus !== "verified" || !canPublish}
              >
                Published (requires verified PDF and published course)
              </option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Verification status">
            <Select
              value={form.verificationStatus}
              onChange={(e) =>
                setForm({
                  ...form,
                  verificationStatus: e.target.value as typeof form.verificationStatus,
                  publicationStatus:
                    e.target.value === "verified" ? form.publicationStatus : "draft",
                })
              }
            >
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
            </Select>
          </Field>
        </div>
        <Field
          label={value ? "Replace PDF file (optional)" : "PDF file(s)"}
          hint={`PDF only, maximum ${data.settings.maxFileSizeMb} MB per file. Select multiple PDFs to upload them together; each will use its filename as its resource title. ${value ? `Current file: ${value.fileName}` : ""}`}
        >
          <Input
            required={!value}
            type="file"
            accept="application/pdf,.pdf"
            multiple={!value}
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </Field>
        {!value && files.length > 1 && (
          <div className="rounded-lg border border-[#e5e9ee] bg-[#f8fafb] p-3 text-sm">
            <p className="mb-2 font-semibold">{files.length} PDFs selected</p>
            <ul className="list-inside list-disc space-y-1 text-[#657386]">
              {files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
            </ul>
          </div>
        )}
        {busy && (
          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold text-[#657386]">
              <span>Uploading securely</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#e3e8ed]">
              <div
                className="h-full bg-[#b28a34] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        <FormActions
          onClose={onClose}
          busy={busy}
          label={files.length ? `Upload ${files.length > 1 ? `${files.length} PDFs` : "PDF"}` : "Save metadata"}
        />
      </form>
    </Modal>
  );
}

function CsvImport({
  onClose,
  onSaved,
  notify,
}: {
  onClose: () => void;
  onSaved: () => void;
  notify: Notify;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [results, setResults] = useState<{ row: number; success: boolean; error?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const headers = [
    "course_code",
    "course_title",
    "faculty",
    "department",
    "level",
    "semester",
    "academic_session",
    "credit_units",
    "description",
    "course_status",
    "prerequisites",
    "course_outline",
    "publication_status",
  ];
  function downloadTemplate() {
    const content = `${headers.join(",")}\n`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nsuk-course-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function readFile(file?: File) {
    if (!file) return;
    file.text().then((text) => {
      const lines = text
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter(Boolean);
      if (!lines.length) return;
      const parsedHeaders = parseCsvLine(lines[0]);
      const missing = headers.slice(0, 7).filter((key) => !parsedHeaders.includes(key));
      if (missing.length)
        return notify(`CSV is missing required columns: ${missing.join(", ")}`, "error");
      setRows(
        lines.slice(1).map((line) => {
          const values = parseCsvLine(line);
          return Object.fromEntries(parsedHeaders.map((key, index) => [key, values[index] || ""]));
        }),
      );
      setResults([]);
    });
  }
  async function runImport() {
    setBusy(true);
    try {
      const response = await api.importCourses(rows);
      setResults(response.results);
      notify("Import completed. Review the row results below.");
      if (response.results.some((item) => item.success)) setTimeout(onSaved, 1000);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Bulk course import" onClose={onClose} wide>
      <div className="space-y-6">
        <div className="rounded-xl border border-[#dfe5ea] bg-[#f8fafb] p-5">
          <h3 className="font-semibold text-[#19324c]">1. Download and complete the template</h3>
          <p className="mt-2 text-sm leading-6 text-[#687789]">
            Use exact saved faculty, department and academic session names. The import does not
            invent or silently replace values.
          </p>
          <Button className="mt-4" variant="secondary" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download CSV template
          </Button>
        </div>
        <Field label="2. Upload completed CSV">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => readFile(e.target.files?.[0])}
          />
        </Field>
        {rows.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-[#19324c]">3. Preview ({rows.length} rows)</h3>
              <Button loading={busy} onClick={runImport}>
                Validate and import
              </Button>
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border border-[#dfe5ea]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#edf1f4]">
                  <tr>
                    {headers.slice(0, 7).map((item) => (
                      <th key={item} className="whitespace-nowrap px-3 py-2">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row, index) => (
                    <tr key={index} className="border-t border-[#e5e9ed]">
                      {headers.slice(0, 7).map((key) => (
                        <td key={key} className="whitespace-nowrap px-3 py-2">
                          {row[key] || <span className="text-red-600">Missing</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 20 && (
              <p className="mt-2 text-xs text-[#748292]">Preview shows the first 20 rows.</p>
            )}
          </div>
        )}
        {results.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold text-[#19324c]">Import results</h3>
            <div className="max-h-56 space-y-2 overflow-auto">
              {results.map((item) => (
                <div
                  key={item.row}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${item.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
                >
                  <span>CSV row {item.row}</span>
                  <span className="font-semibold">{item.success ? "Imported" : item.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function SettingsPage({ data, refresh, notify }: AdminProps) {
  const [form, setForm] = useState({
    ...data.settings,
    levelsText: data.settings.levels.join(", "),
    semestersText: data.settings.semesters.join("\n"),
  });
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.save("settings", {
        ...form,
        levels: form.levelsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        semesters: form.semestersText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      notify("Website settings saved.");
      await refresh();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure contact details, student-facing notices and academic periods without editing source code."
      />
      <form
        onSubmit={submit}
        className="max-w-4xl space-y-6 rounded-xl border border-[#e0e5ea] bg-white p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website name">
            <Input
              required
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            />
          </Field>
          <Field label="Contact email (optional)">
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </Field>
          <Field label="Contact phone (optional)">
            <Input
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
          </Field>
          <Field label="Maximum PDF size (MB)">
            <Input
              type="number"
              min="1"
              max="50"
              value={form.maxFileSizeMb}
              onChange={(e) => setForm({ ...form, maxFileSizeMb: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Address">
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Academic levels" hint="Comma-separated.">
            <Textarea
              value={form.levelsText}
              onChange={(e) => setForm({ ...form, levelsText: e.target.value })}
            />
          </Field>
          <Field label="Academic periods / semesters" hint="Enter one period per line.">
            <Textarea
              value={form.semestersText}
              onChange={(e) => setForm({ ...form, semestersText: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Privacy information">
          <Textarea
            value={form.privacyText}
            onChange={(e) => setForm({ ...form, privacyText: e.target.value })}
          />
        </Field>
        <Field label="Copyright information">
          <Input
            value={form.copyrightText}
            onChange={(e) => setForm({ ...form, copyrightText: e.target.value })}
          />
        </Field>
        <Button loading={busy} type="submit">
          Save settings
        </Button>
      </form>
    </>
  );
}

type Notify = (message: string, type?: "success" | "error") => void;
type AdminProps = { data: DataBundle; refresh: () => Promise<void>; notify: Notify };
type FormProps<T> = { value: T; onClose: () => void; onSaved: () => void; notify: Notify };

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h2 className="font-serif text-3xl font-bold text-[#0b2948]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7888]">{description}</p>
      </div>
      {action}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e0e5ea] bg-white p-5">
      <h3 className="font-serif text-lg font-bold text-[#0b2948]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#dfe5ea] bg-white">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-[#f0f3f6] text-xs font-bold uppercase tracking-[0.08em] text-[#617083]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e7ebef]">{children}</tbody>
      </table>
    </div>
  );
}
function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 align-top text-[#42566b]">{children}</td>;
}
function StatusBadge({ status }: { status: string }) {
  const tone = ["active", "published", "verified"].includes(status)
    ? "success"
    : status === "archived"
      ? "danger"
      : "warning";
  return <Badge tone={tone}>{status.replace("_", " ")}</Badge>;
}
function MiniEmpty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-[#778495]">{text}</p>;
}
function FormActions({
  onClose,
  busy,
  label = "Save changes",
}: {
  onClose: () => void;
  busy: boolean;
  label?: string;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-[#e7ebef] pt-5">
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" loading={busy}>
        {label}
      </Button>
    </div>
  );
}
function FullLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f8] text-[#0b2948]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dce3e9] border-t-[#b08a36]" />
      <p className="mt-4 text-sm font-semibold">{label}</p>
    </div>
  );
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The operation could not be completed.";
}
function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && quoted) {
      value += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else value += char;
  }
  values.push(value.trim());
  return values;
}
