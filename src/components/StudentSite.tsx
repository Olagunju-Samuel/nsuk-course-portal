import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  LoaderCircle,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { api } from "../lib/supabase";
import { formatBytes, formatDate, joinOfferings } from "../lib/data";
import logoUrl from "../../logo.png";
import type { DataBundle, JoinedOffering, Resource } from "../types";
import { categoryLabels } from "../types";
import { Badge, Button, EmptyState, Field, Input, Modal, Select } from "./ui";

type Page = "home" | "courses" | "departments" | "about" | "contact";

export default function StudentSite({
  data,
  loading,
  error,
  onAdmin,
  darkMode,
  onToggleTheme,
}: {
  data: DataBundle;
  loading: boolean;
  error: string;
  onAdmin: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const offerings = useMemo(() => joinOfferings(data), [data]);
  const [page, setPage] = useState<Page>("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState<JoinedOffering | null>(null);
  const [preview, setPreview] = useState<{ resource: Resource; url: string } | null>(null);
  const [resourceLoading, setResourceLoading] = useState("");
  const [filters, setFilters] = useState({
    facultyId: "",
    departmentId: "",
    level: "",
    semester: "",
    sessionId: "",
  });
  const [searched, setSearched] = useState(false);
  const [query, setQuery] = useState("");
  const [resourceCategory, setResourceCategory] = useState("");

  const filteredDepartments = data.departments.filter(
    (item) => !filters.facultyId || item.facultyId === filters.facultyId,
  );
  const courseList = offerings.filter((item) => {
    const matchesFinder =
      (!filters.facultyId || item.faculty.id === filters.facultyId) &&
      (!filters.departmentId || item.department.id === filters.departmentId) &&
      (!filters.level || item.level === filters.level) &&
      (!filters.semester || item.semester === filters.semester) &&
      (!filters.sessionId || item.session.id === filters.sessionId);
    const needle = query.trim().toLowerCase();
    return (
      matchesFinder &&
      (!needle ||
        item.course.code.toLowerCase().includes(needle) ||
        item.course.title.toLowerCase().includes(needle) ||
        item.department.name.toLowerCase().includes(needle) ||
        item.faculty.name.toLowerCase().includes(needle))
    );
  });
  const searchResults = offerings.filter((item) => {
    const matchesFinder =
      (!filters.facultyId || item.faculty.id === filters.facultyId) &&
      (!filters.departmentId || item.department.id === filters.departmentId) &&
      (!filters.level || item.level === filters.level) &&
      (!filters.semester || item.semester === filters.semester) &&
      (!filters.sessionId || item.session.id === filters.sessionId);
    const needle = query.trim().toLowerCase();
    const matchingResources = item.resources.filter(
      (resource) => !resourceCategory || resource.category === resourceCategory,
    );
    return (
      matchesFinder &&
      (!resourceCategory || matchingResources.length > 0) &&
      (!needle ||
        item.course.code.toLowerCase().includes(needle) ||
        item.course.title.toLowerCase().includes(needle) ||
        item.department.name.toLowerCase().includes(needle) ||
        item.faculty.name.toLowerCase().includes(needle) ||
        matchingResources.some((resource) =>
          `${resource.title} ${resource.fileName} ${resource.description || ""} ${categoryLabels[resource.category]}`
            .toLowerCase()
            .includes(needle),
        ))
    );
  });
  const results = offerings.filter((item) => {
    if (!searched) return false;
    const matchesFinder =
      (!filters.facultyId || item.faculty.id === filters.facultyId) &&
      (!filters.departmentId || item.department.id === filters.departmentId) &&
      (!filters.level || item.level === filters.level) &&
      (!filters.semester || item.semester === filters.semester) &&
      (!filters.sessionId || item.session.id === filters.sessionId);
    const needle = query.trim().toLowerCase();
    const matchingResources = item.resources.filter(
      (resource) => !resourceCategory || resource.category === resourceCategory,
    );
    return (
      matchesFinder &&
      (!resourceCategory || matchingResources.length > 0) &&
      (!needle ||
        item.course.code.toLowerCase().includes(needle) ||
        item.course.title.toLowerCase().includes(needle) ||
        item.department.name.toLowerCase().includes(needle) ||
        item.faculty.name.toLowerCase().includes(needle) ||
        matchingResources.some((resource) =>
          `${resource.title} ${resource.fileName} ${resource.description || ""} ${categoryLabels[resource.category]}`
            .toLowerCase()
            .includes(needle),
        ))
    );
  });
  const recent = data.resources
    .slice()
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 6);

  function navigate(next: Page) {
    setPage(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitFinder(event: React.FormEvent) {
    event.preventDefault();
    setSearched(true);
    setPage("courses");
  }

  async function openPdf(resource: Resource) {
    setResourceLoading(resource.id);
    try {
      const { url } = await api.signedUrl(resource.id);
      setPreview({ resource, url });
    } catch (error) {
      alert(error instanceof Error ? error.message : "The PDF could not be opened.");
    } finally {
      setResourceLoading("");
    }
  }

  function renderFinder(compact = false) {
    return (
      <form
        onSubmit={submitFinder}
        className={`rounded-2xl bg-white shadow-[0_18px_50px_rgba(4,30,55,0.14)] ${compact ? "border border-[#e4e8ed] p-5" : "p-5 md:p-7"
          }`}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-[#f5ead0] p-2.5 text-[#936c18]">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#0b2948]">
              Find your course materials
            </h2>
            <p className="text-sm text-[#697789]">
              Choose any filters; matching course data updates automatically.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Field label="Faculty">
            <Select
              value={filters.facultyId}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  facultyId: event.target.value,
                  departmentId: "",
                })
              }
            >
              <option value="">All faculties</option>
              {data.faculties.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department">
            <Select
              disabled={!filters.facultyId}
              value={filters.departmentId}
              onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}
            >
              <option value="">All departments</option>
              {filteredDepartments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Level">
            <Select
              value={filters.level}
              onChange={(event) => setFilters({ ...filters, level: event.target.value })}
            >
              <option value="">All levels</option>
              {data.settings.levels.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </Select>
          </Field>
          <Field label="Semester">
            <Select
              value={filters.semester}
              onChange={(event) => setFilters({ ...filters, semester: event.target.value })}
            >
              <option value="">All semesters</option>
              {data.settings.semesters.map((semester) => (
                <option key={semester}>{semester}</option>
              ))}
            </Select>
          </Field>
          <Field label="Academic session">
            <Select
              value={filters.sessionId}
              onChange={(event) => setFilters({ ...filters, sessionId: event.target.value })}
            >
              <option value="">All sessions</option>
              {data.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Search courses, resources, or departments">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Course code, title, PDF title, or department"
            />
          </Field>
          <Field label="Resource type">
            <Select
              value={resourceCategory}
              onChange={(event) => setResourceCategory(event.target.value)}
            >
              <option value="">All resource types</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit">
            Browse matching courses <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFilters({
                facultyId: "",
                departmentId: "",
                level: "",
                semester: "",
                sessionId: "",
              });
              setSearched(false);
              setQuery("");
              setResourceCategory("");
            }}
          >
            Reset
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#182b40]" data-app-theme>
      <header className="sticky top-0 z-40 border-b border-[#dfe4e9] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate("home")} className="flex items-center gap-3 text-left">
            <img
              src={logoUrl}
              alt="Nasarawa State University logo"
              className="h-11 w-11 rounded-xl border border-[#dfe6ee] bg-white object-contain p-1 shadow-sm"
            />
            <div>
              <div className="font-serif text-lg font-bold leading-tight text-[#0b2948]">
                NSUK Resources
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a8796]">
                Academic Library
              </div>
            </div>
          </button>
          <nav className="hidden items-center gap-7 lg:flex">
            {(
              [
                ["home", "Home"],
                ["courses", "Find Courses"],
                ["departments", "Departments"],
                ["about", "About"],
                ["contact", "Contact"],
              ] as [Page, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => navigate(key)}
                className={`text-sm font-semibold transition ${page === key ? "text-[#a07824]" : "text-[#405267] hover:text-[#0b2948]"
                  }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
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
            <button
              className="rounded-lg p-2 text-[#0b2948] lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Open navigation"
            >
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="border-t border-[#e3e7ec] bg-white px-4 py-4 lg:hidden">
            {(
              [
                ["home", "Home"],
                ["courses", "Find Courses"],
                ["departments", "Departments"],
                ["about", "About"],
                ["contact", "Contact"],
              ] as [Page, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => navigate(key)}
                className="block w-full rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-[#f2f4f7]"
              >
                {label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main>
        {page === "home" && (
          <>
            <section className="relative overflow-hidden bg-[#0b2948]">
              <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(30deg,#fff_1px,transparent_1px),linear-gradient(120deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
              <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:px-8">
                <div className="max-w-3xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#e1c278]">
                    <BookOpen className="h-3.5 w-3.5" /> Prepare before every lecture
                  </div>
                  <h1 className="font-serif text-4xl font-bold leading-[1.1] text-white md:text-6xl">
                    Your course materials, ready when you need them.
                  </h1>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-[#c8d3de]">
                    Find verified course outlines, lecture notes, reading materials and past
                    examination questions published for your department and session.
                  </p>
                </div>
                <div className="relative z-10 mt-10 md:mb-[-150px]">
                  {renderFinder()}
                  {loading ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-white/80" role="status">
                      <LoaderCircle className="h-4 w-4 animate-spin" /> Loading live academic
                      records…
                    </p>
                  ) : error ? (
                    <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                      Could not load the academic catalogue: {error}
                    </p>
                  ) : searched ? (
                    <div className="mt-4 rounded-xl border border-white/15 bg-white p-4 text-sm text-[#526274]">
                      <p className="font-semibold text-[#0b2948]">
                        {searchResults.length} matching course{" "}
                        {searchResults.length === 1 ? "offering" : "offerings"}
                      </p>
                      {searchResults.length ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {searchResults.slice(0, 8).map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => setSelected(item)}
                                className="rounded-full bg-[#eef1f4] px-3 py-1.5 text-xs font-semibold text-[#0b2948] hover:bg-[#f5ead0]"
                              >
                                {item.course.code} — {item.course.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1">No active course offerings match these filters yet.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate("courses")}
                        className="mt-3 text-xs font-bold text-[#966f1d] hover:underline"
                      >
                        View full results
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 md:pt-48 lg:px-8">
              <div className="mb-10 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a07824]">
                  A clear path to your materials
                </p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-[#0b2948]">
                  Select, find and start reading
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  [
                    "01",
                    "Select your programme",
                    "Choose the faculty, department, level, semester and academic session that apply to you.",
                  ],
                  [
                    "02",
                    "Find the exact course",
                    "Review only courses that match your selections. Search by course code or title when needed.",
                  ],
                  [
                    "03",
                    "Read or download",
                    "Preview published PDFs in your browser or download the original file for offline study.",
                  ],
                ].map(([number, title, description]) => (
                  <div key={number} className="rounded-xl border border-[#e1e6eb] bg-white p-6">
                    <span className="font-serif text-3xl font-bold text-[#d4b66d]">{number}</span>
                    <h3 className="mt-5 font-serif text-xl font-bold text-[#0b2948]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#657386]">{description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-y border-[#e1e6eb] bg-white">
              <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a07824]">
                      Recently published
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-bold text-[#0b2948]">
                      Latest academic resources
                    </h2>
                  </div>
                </div>
                {loading ? (
                  <div
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#e1e6eb] bg-[#fafbfc] px-5 py-10 text-sm text-[#667588]"
                    role="status"
                  >
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Loading published resources…
                  </div>
                ) : error ? (
                  <EmptyState title="Academic resources are unavailable" description={error} />
                ) : recent.length ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recent.map((resource) => {
                      const offering = offerings.find((item) => item.id === resource.offeringId);
                      if (!offering) return null;
                      return (
                        <button
                          key={resource.id}
                          onClick={() => {
                            setSelected(offering);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="group rounded-xl border border-[#e1e6eb] bg-[#fafbfc] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#ccb165] hover:shadow-lg"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <FileText className="h-6 w-6 text-[#aa8129]" />
                            <Badge tone="navy">{categoryLabels[resource.category]}</Badge>
                          </div>
                          <h3 className="mt-5 font-bold text-[#132d48] group-hover:text-[#9a7220]">
                            {resource.title}
                          </h3>
                          <p className="mt-1 text-sm text-[#687789]">
                            {offering.course.code} · {offering.department.name}
                          </p>
                          <p className="mt-1 text-xs text-[#7c8998]">
                            {offering.level} level · {offering.semester} · {offering.session.name}
                          </p>
                          <p className="mt-4 text-xs text-[#7c8998]">
                            {offering.session.name}
                            {resource.publicationYear
                              ? ` · Published ${resource.publicationYear}`
                              : ""}
                            {` · Uploaded ${formatDate(resource.uploadedAt)}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No resources have been published yet"
                    description="Verified lecture notes and past questions will appear here after an administrator publishes them."
                  />
                )}
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a07824]">
                  Browse programmes
                </p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-[#0b2948]">
                  Available departments
                </h2>
              </div>
              <DepartmentGrid
                data={data}
                loading={loading}
                error={error}
                onSelect={(id) => {
                  const department = data.departments.find((item) => item.id === id);
                  if (department) {
                    setFilters({ ...filters, facultyId: department.facultyId, departmentId: id });
                    setSearched(true);
                    navigate("courses");
                  }
                }}
              />
            </section>
          </>
        )}

        {page === "courses" && (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a07824]">
                Course finder
              </p>
              <h1 className="mt-2 font-serif text-4xl font-bold text-[#0b2948]">
                Find courses and resources
              </h1>
              <p className="mt-3 text-[#667588]">
                Search published course offerings and the verified resources attached to them.
              </p>
            </div>
            {renderFinder(true)}
            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                Academic records could not be loaded: {error}
              </div>
            )}
            {loading && (
              <div
                className="mt-8 flex items-center justify-center gap-2 text-sm text-[#667588]"
                role="status"
              >
                <LoaderCircle className="h-4 w-4 animate-spin" /> Loading faculties, departments and
                published courses…
              </div>
            )}
            {searched && !loading && !error && (
              <div className="mt-10">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-[#0b2948]">
                      {results.length} {results.length === 1 ? "course" : "courses"} found
                    </h2>
                    <p className="text-sm text-[#6b7888]">
                      Matching the selected filters and search text
                    </p>
                  </div>
                  <div className="w-full sm:w-72">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Course, code, resource or department"
                      aria-label="Search courses, resources, or departments"
                    />
                  </div>
                  <div className="w-full sm:w-60">
                    <Select
                      value={resourceCategory}
                      onChange={(event) => setResourceCategory(event.target.value)}
                      aria-label="Filter by resource type"
                    >
                      <option value="">All resource types</option>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                {results.length ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    {results.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-xl border border-[#e0e5ea] bg-white p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <Badge tone="navy">{item.course.code}</Badge>
                          <span className="text-xs font-medium text-[#718092]">
                            {item.creditUnits != null
                              ? `${item.creditUnits} credit units`
                              : "Credit units not recorded"}
                          </span>
                        </div>
                        <h3 className="mt-4 font-serif text-xl font-bold text-[#102c48]">
                          {item.course.title}
                        </h3>
                        <p className="mt-2 text-sm text-[#687789]">
                          {item.faculty.name} · {item.department.name} · {item.level} level ·{" "}
                          {item.semester} · {item.session.name}
                        </p>
                        <div className="mt-5 flex items-center gap-2 text-sm text-[#536477]">
                          <FileText className="h-4 w-4 text-[#aa8129]" />
                          {(() => {
                            const count = item.resources.filter(
                              (resource) =>
                                !resourceCategory || resource.category === resourceCategory,
                            ).length;
                            return count
                              ? `${count} matching published ${count === 1 ? "resource" : "resources"}`
                              : resourceCategory
                                ? "No resources of this type published yet"
                                : "No resources published yet";
                          })()}
                        </div>
                        <Button className="mt-6" onClick={() => setSelected(item)}>
                          View course <ArrowRight className="h-4 w-4" />
                        </Button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No matching course records"
                    description="Course information or materials for this selection have not yet been added and published. Check your selections or try another academic session."
                  />
                )}
              </div>
            )}
            {!searched && !loading && !error && (
              <div className="mt-8">
                <EmptyState
                  title="Choose any filters to begin"
                  description="Filters are optional and work together. Choose a faculty, department, level, semester, or session, then show matching courses. You can also search by course code, title, resource, or department."
                />
              </div>
            )}
          </section>
        )}

        {page === "departments" && (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="font-serif text-4xl font-bold text-[#0b2948]">Departments</h1>
            <p className="mt-3 max-w-2xl text-[#667588]">
              Departments are loaded from the connected academic catalogue. Select one to find its
              published course offerings.
            </p>
            <div className="mt-10">
              <DepartmentGrid
                data={data}
                loading={loading}
                error={error}
                onSelect={(id) => {
                  const department = data.departments.find((item) => item.id === id);
                  if (department) {
                    setFilters({ ...filters, facultyId: department.facultyId, departmentId: id });
                    setSearched(true);
                    navigate("courses");
                  }
                }}
              />
            </div>
          </section>
        )}

        {page === "about" && (
          <StaticPage title="About this resource platform">
            <p>
              NSUK Academic Resources helps students locate course outlines, lecture notes, reading
              materials and past examination questions before lectures and examinations.
            </p>
            <p>
              Academic information is added and verified by authorized administrators. The catalogue
              should not be considered complete until the relevant faculties and departments have
              confirmed their records.
            </p>
            <p>
              The platform preserves session-specific course offerings so students can find
              materials that correspond to the right department, level, semester and academic
              session.
            </p>
          </StaticPage>
        )}

        {page === "contact" && (
          <StaticPage title="Contact">
            <p>
              Contact the platform administrator to report an unavailable file, incorrect academic
              record or missing verified material.
            </p>
            {data.settings.contactEmail && (
              <p>
                <strong>Email:</strong>{" "}
                <a
                  className="text-[#986f1d] underline"
                  href={`mailto:${data.settings.contactEmail}`}
                >
                  {data.settings.contactEmail}
                </a>
              </p>
            )}
            {data.settings.contactPhone && (
              <p>
                <strong>Phone:</strong> {data.settings.contactPhone}
              </p>
            )}
            <p>
              <strong>Address:</strong> {data.settings.address}
            </p>
          </StaticPage>
        )}
      </main>

      <footer className="bg-[#071f36] text-[#c2cfda]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 className="font-serif text-xl font-bold text-white">NSUK Resources</h2>
            <p className="mt-3 text-sm leading-6">
              A focused academic resource platform for Nasarawa State University, Keffi.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Contact</h3>
            <p className="mt-3 text-sm">
              {data.settings.contactEmail ||
                "Contact details will be published by the administrator."}
            </p>
            <p className="mt-1 text-sm">{data.settings.address}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Privacy</h3>
            <p className="mt-3 text-sm leading-6">{data.settings.privacyText}</p>
            <button onClick={onAdmin} className="mt-4 text-xs text-[#d8bb75] hover:underline">
              Administrator access
            </button>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-[#8fa0af]">
          © {new Date().getFullYear()} {data.settings.copyrightText}
        </div>
      </footer>

      {selected && (
        <Modal
          title={`${selected.course.code} — ${selected.course.title}`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="navy">{selected.level} level</Badge>
                <Badge>{selected.semester}</Badge>
                <Badge>{selected.session.name}</Badge>
              </div>
              <dl className="mt-6 space-y-4 text-sm">
                {[
                  ["Department", selected.department.name],
                  ["Faculty", selected.faculty.name],
                  ["Credit units", selected.creditUnits ?? "Not recorded"],
                  ["Course status", selected.courseStatus || "Not recorded"],
                  ["Prerequisites", selected.prerequisites || "None recorded"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-semibold text-[#263b51]">{label}</dt>
                    <dd className="mt-1 text-[#687789]">{value}</dd>
                  </div>
                ))}
              </dl>
              {(selected.course.description || selected.outline) && (
                <div className="mt-6 space-y-4 text-sm leading-6 text-[#5f6e80]">
                  {selected.course.description && <p>{selected.course.description}</p>}
                  {selected.outline && (
                    <div>
                      <h3 className="font-semibold text-[#263b51]">Course outline</h3>
                      <p className="mt-1 whitespace-pre-wrap">{selected.outline}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#0b2948]">Published resources</h3>
              {selected.resources.filter(
                (resource) => !resourceCategory || resource.category === resourceCategory,
              ).length ? (
                <div className="mt-4 space-y-6">
                  {Object.entries(categoryLabels).map(([category, label]) => {
                    const items = selected.resources.filter(
                      (item) =>
                        item.category === category &&
                        (!resourceCategory || item.category === resourceCategory),
                    );
                    if (!items.length) return null;
                    return (
                      <section key={category}>
                        <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a26]">
                          {label}
                        </h4>
                        <div className="space-y-2">
                          {items.map((resource) => (
                            <div
                              key={resource.id}
                              className="rounded-lg border border-[#e0e5ea] p-4"
                            >
                              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                  <p className="font-semibold text-[#17304a]">{resource.title}</p>
                                  <p className="mt-1 text-xs text-[#758292]">
                                    {selected.session.name}
                                    {resource.publicationYear
                                      ? ` · Published ${resource.publicationYear}`
                                      : ""}
                                    {` · PDF · ${formatBytes(resource.fileSize)} · Uploaded ${formatDate(resource.uploadedAt)}`}
                                  </p>
                                  {resource.description && (
                                    <p className="mt-2 text-sm text-[#667588]">
                                      {resource.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    variant="secondary"
                                    loading={resourceLoading === resource.id}
                                    onClick={() => openPdf(resource)}
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    onClick={async () => {
                                      try {
                                        const { url } = await api.signedUrl(resource.id);
                                        const anchor = document.createElement("a");
                                        anchor.href = url;
                                        anchor.download = resource.fileName;
                                        anchor.target = "_blank";
                                        anchor.click();
                                      } catch (error) {
                                        alert(
                                          error instanceof Error
                                            ? error.message
                                            : "The PDF could not be downloaded.",
                                        );
                                      }
                                    }}
                                    aria-label={`Download ${resource.title}`}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title="Materials are not yet available"
                    description="This course is published, but no PDF resources have been published for it."
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {preview && (
        <Modal title={preview.resource.title} onClose={() => setPreview(null)} wide>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#657386]">Browser PDF preview</p>
            <a href={preview.url} target="_blank" rel="noreferrer" download>
              <Button>
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </a>
          </div>
          <iframe
            src={`${preview.url}#toolbar=1&navpanes=0`}
            title={`Preview ${preview.resource.title}`}
            className="h-[70vh] w-full rounded-lg border border-[#dce2e8] bg-[#eef1f4]"
          />
        </Modal>
      )}
    </div>
  );
}

function DepartmentGrid({
  data,
  loading,
  error,
  onSelect,
}: {
  data: DataBundle;
  loading: boolean;
  error: string;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-xl border border-[#e1e6eb] bg-white px-5 py-10 text-sm text-[#667588]"
        role="status"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" /> Loading faculties and departments…
      </div>
    );
  }
  if (error) {
    return <EmptyState title="Departments are unavailable" description={error} />;
  }
  if (!data.departments.length) {
    return (
      <EmptyState
        title="No departments are available yet"
        description="Departments will appear here after the administrator confirms and activates the current university structure."
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.departments.map((department) => {
        const faculty = data.faculties.find((item) => item.id === department.facultyId);
        return (
          <button
            key={department.id}
            onClick={() => onSelect(department.id)}
            className="group flex items-start gap-4 rounded-xl border border-[#e0e5ea] bg-white p-5 text-left transition hover:border-[#cbb064] hover:shadow-md"
          >
            <div className="rounded-lg bg-[#edf2f7] p-3 text-[#0b2948] group-hover:bg-[#f5ead0]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#17304a]" data-dark-role="department-name">
                {department.name}
              </h3>
              <p className="mt-1 text-xs text-[#738091]">{faculty?.name}</p>
              {department.description && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#667588]">
                  {department.description}
                </p>
              )}
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#966f1d]">
                Find courses <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#e0e5ea] bg-white p-7 md:p-10">
        <CheckCircle2 className="h-8 w-8 text-[#a27a24]" />
        <h1 className="mt-5 font-serif text-4xl font-bold text-[#0b2948]">{title}</h1>
        <div className="mt-6 space-y-5 text-base leading-8 text-[#5f6f81]">{children}</div>
      </div>
    </section>
  );
}
