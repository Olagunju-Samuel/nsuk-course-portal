import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const prefix = "/make-server-e9064e7e";
const bucket = "academic-resources";
const entities = ["faculties", "departments", "sessions", "courses", "offerings", "resources"];
const resourceCategories = [
  "course_outline",
  "course_material",
  "lecture_note",
  "reading_material",
  "past_question",
  "solution",
  "other",
];

const defaultSettings = {
  siteName: "NSUK Academic Resources",
  contactEmail: "",
  contactPhone: "",
  address: "Nasarawa State University, Keffi, Nigeria",
  privacyText:
    "Academic resources are provided for educational use. Availability and accuracy depend on materials verified and published by authorized administrators.",
  copyrightText: "Nasarawa State University academic resource platform.",
  levels: ["100", "200", "300", "400", "500"],
  semesters: ["First semester", "Second semester"],
  maxFileSizeMb: 25,
};

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const client = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  }

  return createClient(supabaseUrl, supabaseKey);
};

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const clean = (value: unknown) => (typeof value === "string" ? value.trim() : value);

async function all(entity: string) {
  return await kv.getByPrefix(`${entity}:`);
}

async function safeAll(entity: string) {
  try {
    return await all(entity);
  } catch (error) {
    console.error(`Failed to load data for ${entity}:`, error);
    return [];
  }
}

async function get(entity: string, recordId: string) {
  return await kv.get(`${entity}:${recordId}`);
}

async function safeGet(entity: string, recordId: string) {
  try {
    return await get(entity, recordId);
  } catch (error) {
    console.error(`Failed to fetch ${entity}:${recordId}:`, error);
    return null;
  }
}

async function save(entity: string, value: Record<string, unknown>) {
  await kv.set(`${entity}:${value.id}`, value);
  return value;
}

async function requireAdmin(c: any, next: any) {
  const auth = c.req.header("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return c.json({ error: "Authentication required." }, 401);

  const {
    data: { user },
    error,
  } = await client().auth.getUser(token);
  if (error || !user) return c.json({ error: "Invalid session." }, 401);

  const profile = await kv.get(`profiles:${user.id}`);
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return c.json({ error: "Administrator access required." }, 403);
  }
  c.set("user", user);
  await next();
}

async function dataBundle(admin = false) {
  const [faculties, departments, sessions, courses, offerings, resources] = await Promise.all(
    entities.map(safeAll),
  );
  const settings = (await safeGet("settings", "site")) || defaultSettings;

  if (admin) {
    return {
      faculties,
      departments,
      sessions,
      courses,
      offerings,
      resources,
      settings,
    };
  }

  const activeFacultyIds = new Set(
    faculties.filter((item: any) => item.status === "active").map((item: any) => item.id),
  );
  const activeDepartments = new Map(
    departments
      .filter((item: any) => item.status === "active")
      .map((item: any) => [item.id, item]),
  );
  const activeCourses = new Map(
    courses
      .filter(
        (item: any) =>
          item.status === "active" &&
          activeFacultyIds.has(item.facultyId) &&
          activeDepartments.get(item.departmentId)?.facultyId === item.facultyId,
      )
      .map((item: any) => [item.id, item]),
  );
  // Keep the session attached to historical offerings even if it is later
  // archived. Archiving a session must not relabel or hide existing materials.
  const publicOfferings = offerings.filter(
    (item: any) =>
      item.publicationStatus === "published" &&
      activeCourses.has(item.courseId) &&
      sessions.some((session: any) => session.id === item.academicSessionId),
  );
  const publicCourses = courses.filter((item: any) => activeCourses.has(item.id));
  const publicSessionIds = new Set(publicOfferings.map((item: any) => item.academicSessionId));

  return {
    // Academic structure is useful to students even before courses are published.
    // Keep courses and resources publication-gated below, but expose all active
    // faculties and departments in the public directory and course finder.
    faculties: faculties.filter((item: any) => item.status === "active"),
    departments: departments.filter((item: any) => item.status === "active" && activeFacultyIds.has(item.facultyId)),
    sessions: sessions.filter(
      (item: any) => item.status === "active" || publicSessionIds.has(item.id),
    ),
    courses: publicCourses,
    offerings: publicOfferings,
    resources: resources.filter(
      (item: any) =>
        item.publicationStatus === "published" &&
        item.verificationStatus === "verified" &&
        offerings.some(
          (offering: any) =>
            offering.id === item.offeringId && offering.publicationStatus === "published" &&
            activeCourses.has(offering.courseId) &&
            sessions.some((session: any) => session.id === offering.academicSessionId),
        ),
    ),
    settings,
  };
}

app.get(`${prefix}/health`, (c) => c.json({ status: "ok" }));

app.get(`${prefix}/setup/status`, async (c) => {
  const admins = await all("profiles");
  return c.json({
    configured: admins.some(
      (profile: any) => profile.role === "admin" && profile.status === "active",
    ),
  });
});

app.get(`${prefix}/public/data`, async (c) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate");

  try {
    return c.json(await dataBundle(false));
  } catch (error) {
    console.error("public/data failed:", error);
    return c.json(
      {
        faculties: [],
        departments: [],
        sessions: [],
        courses: [],
        offerings: [],
        resources: [],
        settings: defaultSettings,
        error: "Public data is unavailable right now.",
      },
      500,
    );
  }
});

app.get(`${prefix}/public/resources/:id/url`, async (c) => {
  const resource = await get("resources", c.req.param("id"));
  if (
    !resource ||
    resource.publicationStatus !== "published" ||
    resource.verificationStatus !== "verified"
  ) {
    return c.json({ error: "This resource is not available." }, 404);
  }
  const offering = await get("offerings", resource.offeringId);
  if (!offering || offering.publicationStatus !== "published") {
    return c.json({ error: "This resource is not available." }, 404);
  }
  const [course, session] = await Promise.all([
    get("courses", offering.courseId),
    get("sessions", offering.academicSessionId),
  ]);
  if (!course || course.status !== "active" || !session) {
    return c.json({ error: "This resource is not available." }, 404);
  }
  const [faculty, department] = await Promise.all([
    get("faculties", course.facultyId),
    get("departments", course.departmentId),
  ]);
  if (
    faculty?.status !== "active" ||
    department?.status !== "active" ||
    department.facultyId !== faculty.id
  ) {
    return c.json({ error: "This resource is not available." }, 404);
  }
  const { data, error } = await client()
    .storage.from(bucket)
    .createSignedUrl(resource.filePath, 3600);
  if (error || !data) return c.json({ error: "The PDF file is unavailable." }, 404);
  return c.json({ url: data.signedUrl });
});

app.use(`${prefix}/admin/*`, requireAdmin);
app.get(`${prefix}/admin/data`, async (c) => c.json(await dataBundle(true)));

function validateBase(entity: string, value: any) {
  if (entity === "faculties" && !clean(value.name)) return "Faculty name is required.";
  if (entity === "departments") {
    if (!clean(value.name) || !value.facultyId) return "Department name and faculty are required.";
  }
  if (entity === "sessions") {
    if (!/^\d{4}\/\d{4}$/.test(String(value.name || "")))
      return "Use the academic session format YYYY/YYYY.";
  }
  if (entity === "courses") {
    if (!clean(value.code) || !clean(value.title)) return "Course code and title are required.";
    if (!value.facultyId || !value.departmentId) return "Faculty and department are required.";
  }
  if (entity === "offerings") {
    if (!value.courseId || !value.academicSessionId || !value.level || !value.semester)
      return "Course, session, level and semester are required.";
  }
  return null;
}

async function validateRelations(entity: string, value: any, courseOverride?: any) {
  if (entity === "sessions") {
    const matches = (await all("sessions")).find(
      (item: any) =>
        item.id !== value.id &&
        item.name.trim().toLowerCase() === String(value.name).trim().toLowerCase(),
    );
    if (matches) return "This academic session already exists.";
  }
  if (entity === "departments") {
    if (!(await get("faculties", value.facultyId))) return "Selected faculty does not exist.";
  }
  if (entity === "courses") {
    const department = await get("departments", value.departmentId);
    if (!department || department.facultyId !== value.facultyId)
      return "The selected department does not belong to this faculty.";
    const matches = (await all("courses")).find(
      (item: any) =>
        item.id !== value.id &&
        item.departmentId === value.departmentId &&
        item.code.toLowerCase() === String(value.code).toLowerCase(),
    );
    if (matches) return "This course code already exists in the selected department.";
  }
  if (entity === "offerings") {
    const course =
      courseOverride?.id === value.courseId ? courseOverride : await get("courses", value.courseId);
    const session = await get("sessions", value.academicSessionId);
    if (!course || !session) return "The selected course or session does not exist.";
    if (value.publicationStatus === "published") {
      const [faculty, department] = await Promise.all([
        get("faculties", course.facultyId),
        get("departments", course.departmentId),
      ]);
      if (
        course.status !== "active" ||
        session.status !== "active" ||
        faculty?.status !== "active" ||
        department?.status !== "active"
      ) {
        return "Published offerings must use active faculties, departments, courses and sessions.";
      }
    }
    const matches = (await all("offerings")).find(
      (item: any) =>
        item.id !== value.id &&
        item.courseId === value.courseId &&
        item.academicSessionId === value.academicSessionId &&
        item.level === value.level &&
        item.semester === value.semester,
    );
    if (matches) return "This course offering already exists.";
  }
  return null;
}

async function validateResourcePublication(offeringId: string) {
  const offering = await get("offerings", offeringId);
  if (!offering || offering.publicationStatus !== "published") {
    return "Publish the course offering before publishing its resources.";
  }
  const [course, session] = await Promise.all([
    get("courses", offering.courseId),
    get("sessions", offering.academicSessionId),
  ]);
  if (!course || course.status !== "active" || !session || session.status !== "active") {
    return "A resource can only be published for an active course and academic session.";
  }
  const [faculty, department] = await Promise.all([
    get("faculties", course.facultyId),
    get("departments", course.departmentId),
  ]);
  if (
    faculty?.status !== "active" ||
    department?.status !== "active" ||
    department.facultyId !== faculty.id
  ) {
    return "A resource can only be published for an active faculty and its matching department.";
  }
  return null;
}

app.post(`${prefix}/admin/course-offerings`, async (c) => {
  const { course: courseInput, offering: offeringInput } = await c.req.json();
  if (!courseInput || !offeringInput || typeof courseInput !== "object" || typeof offeringInput !== "object") {
    return c.json({ error: "Course and offering details are required." }, 400);
  }
  const existingCourse = courseInput.id ? await get("courses", courseInput.id) : null;
  const courseId = existingCourse?.id || id();
  const course = { ...existingCourse, ...courseInput, id: courseId };
  const courseBaseError = validateBase("courses", course);
  if (courseBaseError) return c.json({ error: courseBaseError }, 400);
  const courseRelationError = await validateRelations("courses", course);
  if (courseRelationError) return c.json({ error: courseRelationError }, 400);

  const existingOffering = offeringInput.id ? await get("offerings", offeringInput.id) : null;
  const offering = { ...existingOffering, ...offeringInput, courseId };
  const offeringBaseError = validateBase("offerings", offering);
  if (offeringBaseError) return c.json({ error: offeringBaseError }, 400);
  const offeringRelationError = await validateRelations("offerings", offering, course);
  if (offeringRelationError) return c.json({ error: offeringRelationError }, 400);
  const duplicateOffering = (await all("offerings")).find(
    (item: any) =>
      item.id !== existingOffering?.id &&
      item.courseId === courseId &&
      item.academicSessionId === offering.academicSessionId &&
      item.level === offering.level &&
      item.semester === offering.semester,
  );
  if (duplicateOffering) return c.json({ error: "This course offering already exists." }, 400);

  const timestamp = now();
  const savedCourse = {
    ...course,
    id: courseId,
    code: String(course.code).trim().toUpperCase(),
    status: course.status === "archived" ? "archived" : "active",
    createdAt: existingCourse?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const savedOffering = {
    ...offering,
    id: existingOffering?.id || id(),
    publicationStatus: ["draft", "published", "archived"].includes(offering.publicationStatus)
      ? offering.publicationStatus
      : "draft",
    creditUnits:
      offering.creditUnits === "" || offering.creditUnits == null
        ? undefined
        : Number(offering.creditUnits),
    createdAt: existingOffering?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  if (
    savedOffering.creditUnits !== undefined &&
    (!Number.isInteger(savedOffering.creditUnits) || savedOffering.creditUnits < 0)
  ) {
    return c.json({ error: "Credit units must be a non-negative whole number." }, 400);
  }

  try {
    await save("courses", savedCourse);
    await save("offerings", savedOffering);
  } catch (error) {
    if (existingCourse) await save("courses", existingCourse);
    else await kv.del(`courses:${courseId}`);
    throw error;
  }
  return c.json({ course: savedCourse, offering: savedOffering });
});

app.post(`${prefix}/admin/:entity`, async (c) => {
  const entity = c.req.param("entity");
  if (![...entities, "settings"].includes(entity)) {
    return c.json({ error: "Unknown record type." }, 404);
  }
  const body = await c.req.json();
  if (entity === "settings") {
    const levels = Array.isArray(body.levels) ? body.levels : defaultSettings.levels;
    const semesters = Array.isArray(body.semesters) ? body.semesters : defaultSettings.semesters;
    const value = {
      ...defaultSettings,
      ...body,
      levels: Array.from(
        new Set(levels.map((item: unknown) => clean(item)).filter((item: unknown) => Boolean(item))),
      ),
      semesters: Array.from(
        new Set(semesters.map((item: unknown) => clean(item)).filter((item: unknown) => Boolean(item))),
      ),
      maxFileSizeMb: Math.min(50, Math.max(1, Number(body.maxFileSizeMb || 25))),
    };
    await kv.set("settings:site", value);
    return c.json({ value });
  }
  if (entity === "resources") {
    const existing = body.id ? await get(entity, body.id) : null;
    if (!existing) return c.json({ error: "Upload a PDF before saving metadata." }, 400);
    if (!clean(body.title)) return c.json({ error: "Resource title is required." }, 400);
    if (!resourceCategories.includes(body.category)) {
      return c.json({ error: "Select a valid resource category." }, 400);
    }
    if (!["draft", "published", "archived"].includes(body.publicationStatus)) {
      return c.json({ error: "Select a valid publication status." }, 400);
    }
    if (!["unverified", "verified"].includes(body.verificationStatus)) {
      return c.json({ error: "Select a valid verification status." }, 400);
    }
    if (body.publicationStatus === "published" && body.verificationStatus !== "verified") {
      return c.json({ error: "Verify the resource before publishing it." }, 400);
    }
    if (body.publicationStatus === "published") {
      const publicationError = await validateResourcePublication(existing.offeringId);
      if (publicationError) return c.json({ error: publicationError }, 400);
    }
    const value = {
      ...existing,
      title: clean(body.title),
      category: body.category,
      description: clean(body.description),
      publicationYear:
        body.publicationYear === "" || body.publicationYear == null
          ? undefined
          : Number(body.publicationYear),
      publicationStatus: body.publicationStatus,
      verificationStatus: body.verificationStatus,
      updatedAt: now(),
    };
    if (
      value.publicationYear !== undefined &&
      (!Number.isInteger(value.publicationYear) || value.publicationYear < 1900 || value.publicationYear > 2200)
    ) {
      return c.json({ error: "Publication year must be a valid year between 1900 and 2200." }, 400);
    }
    await save(entity, value);
    return c.json({ value });
  }

  const baseError = validateBase(entity, body);
  if (baseError) return c.json({ error: baseError }, 400);
  const relationError = await validateRelations(entity, body);
  if (relationError) return c.json({ error: relationError }, 400);

  const existing = body.id ? await get(entity, body.id) : null;
  const value: any = {
    ...existing,
    ...body,
    id: existing?.id || id(),
    createdAt: existing?.createdAt || now(),
    updatedAt: now(),
  };
  if (entity === "courses") value.code = String(value.code).trim().toUpperCase();
  if (entity === "faculties") {
    value.previousNames = Array.isArray(value.previousNames)
      ? value.previousNames.map(clean).filter(Boolean)
      : [];
  }
  if (["faculties", "departments", "sessions", "courses"].includes(entity)) {
    value.status = value.status === "archived" ? "archived" : "active";
  }
  if (entity === "offerings") {
    value.publicationStatus = ["draft", "published", "archived"].includes(value.publicationStatus)
      ? value.publicationStatus
      : "draft";
    value.creditUnits =
      value.creditUnits === "" || value.creditUnits == null ? undefined : Number(value.creditUnits);
  }
  await save(entity, value);
  return c.json({ value });
});

app.post(`${prefix}/admin/:entity/:id/archive`, async (c) => {
  const entity = c.req.param("entity");
  if (!entities.includes(entity)) return c.json({ error: "Unknown record type." }, 404);
  const value = await get(entity, c.req.param("id"));
  if (!value) return c.json({ error: "Record not found." }, 404);
  if (["offerings", "resources"].includes(entity)) {
    value.publicationStatus = "archived";
  } else {
    value.status = "archived";
  }
  value.updatedAt = now();
  await save(entity, value);
  return c.json({ value });
});

app.post(`${prefix}/admin/resources/upload`, async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  const offeringId = String(form.get("offeringId") || "");
  const resourceId = String(form.get("resourceId") || "");
  const offering = await get("offerings", offeringId);
  if (!offering) return c.json({ error: "Select a valid course offering." }, 400);
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return c.json({ error: "Only PDF files are accepted." }, 400);
  }
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (new TextDecoder().decode(header) !== "%PDF-") {
    return c.json({ error: "The selected file does not contain a valid PDF header." }, 400);
  }
  const category = String(form.get("category") || "lecture_note");
  const publicationStatus = String(form.get("publicationStatus") || "draft");
  const verificationStatus = String(form.get("verificationStatus") || "unverified");
  if (!resourceCategories.includes(category)) {
    return c.json({ error: "Select a valid resource category." }, 400);
  }
  if (!["draft", "published", "archived"].includes(publicationStatus)) {
    return c.json({ error: "Select a valid publication status." }, 400);
  }
  if (!["unverified", "verified"].includes(verificationStatus)) {
    return c.json({ error: "Select a valid verification status." }, 400);
  }
  if (publicationStatus === "published" && verificationStatus !== "verified") {
    return c.json({ error: "Verify the resource before publishing it." }, 400);
  }
  if (publicationStatus === "published") {
    const publicationError = await validateResourcePublication(offeringId);
    if (publicationError) return c.json({ error: publicationError }, 400);
  }
  const settings = (await kv.get("settings:site")) || defaultSettings;
  if (file.size > Number(settings.maxFileSizeMb || 25) * 1024 * 1024) {
    return c.json({ error: `PDF files must not exceed ${settings.maxFileSizeMb || 25} MB.` }, 400);
  }

  const storage = client().storage;
  const { error: bucketError } = await storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: Number(settings.maxFileSizeMb || 25) * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    return c.json({ error: `Could not prepare PDF storage: ${bucketError.message}` }, 500);
  }

  const existing = resourceId ? await get("resources", resourceId) : null;
  if (resourceId && !existing) return c.json({ error: "Resource not found." }, 404);
  if (existing && existing.offeringId !== offeringId) {
    return c.json({ error: "A replacement PDF must remain attached to its current offering." }, 400);
  }
  if (!clean(form.get("title"))) return c.json({ error: "Resource title is required." }, 400);
  const newId = existing?.id || id();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${offeringId}/${newId}-${Date.now()}-${safeName}`;
  const { error } = await storage.from(bucket).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) return c.json({ error: error.message }, 400);

  const resource = {
    ...existing,
    id: newId,
    offeringId,
    title: clean(form.get("title")) || file.name.replace(/\.pdf$/i, ""),
    category,
    description: clean(form.get("description")) || "",
    publicationYear: form.get("publicationYear")
      ? Number(form.get("publicationYear"))
      : undefined,
    filePath: path,
    fileName: file.name,
    fileSize: file.size,
    fileFormat: "PDF",
    publicationStatus,
    verificationStatus,
    uploadedAt: existing?.uploadedAt || now(),
    updatedAt: now(),
  };
  if (
    resource.publicationYear !== undefined &&
    (!Number.isInteger(resource.publicationYear) || resource.publicationYear < 1900 || resource.publicationYear > 2200)
  ) {
    await storage.from(bucket).remove([path]);
    return c.json({ error: "Publication year must be a valid year between 1900 and 2200." }, 400);
  }
  try {
    await save("resources", resource);
  } catch (error) {
    await storage.from(bucket).remove([path]);
    throw error;
  }
  if (existing?.filePath) {
    const { error: removalError } = await storage.from(bucket).remove([existing.filePath]);
    if (removalError) console.error("Could not remove replaced PDF object:", removalError.message);
  }
  return c.json({ resource });
});

app.get(`${prefix}/admin/resources/:id/url`, async (c) => {
  const resource = await get("resources", c.req.param("id"));
  if (!resource) return c.json({ error: "Resource not found." }, 404);
  const { data, error } = await client()
    .storage.from(bucket)
    .createSignedUrl(resource.filePath, 3600);
  if (error || !data) return c.json({ error: "The PDF file is unavailable." }, 404);
  return c.json({ url: data.signedUrl });
});

app.post(`${prefix}/admin/import/courses`, async (c) => {
  const { rows = [] } = await c.req.json();
  if (!Array.isArray(rows) || rows.length > 1000) {
    return c.json({ error: "Import between 1 and 1,000 rows at a time." }, 400);
  }
  const [faculties, departments, sessions, courses, offerings] = await Promise.all(
    ["faculties", "departments", "sessions", "courses", "offerings"].map(all),
  );
  const settings = (await kv.get("settings:site")) || defaultSettings;
  const results = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    try {
      const required = [
        "course_code",
        "course_title",
        "faculty",
        "department",
        "level",
        "semester",
        "academic_session",
      ];
      const missing = required.filter((key) => !String(row[key] || "").trim());
      if (missing.length) throw new Error(`Missing: ${missing.join(", ")}`);
      const faculty = faculties.find(
        (item: any) => item.name.toLowerCase() === row.faculty.trim().toLowerCase(),
      );
      if (!faculty) throw new Error("Unknown faculty");
      const department = departments.find(
        (item: any) =>
          item.facultyId === faculty.id &&
          (item.name.toLowerCase() === row.department.trim().toLowerCase() ||
            item.abbreviation?.toLowerCase() === row.department.trim().toLowerCase()),
      );
      if (!department) throw new Error("Unknown department");
      const session = sessions.find((item: any) => item.name === row.academic_session.trim());
      if (!session) throw new Error("Invalid academic session");
      if (!settings.levels.includes(row.level.trim())) throw new Error("Invalid level");
      const semester = settings.semesters.find(
        (item: string) => item.toLowerCase() === row.semester.trim().toLowerCase(),
      );
      if (!semester) throw new Error("Invalid semester");
      const code = row.course_code.trim().toUpperCase();
      let course = courses.find(
        (item: any) => item.departmentId === department.id && item.code === code,
      );
      if (!course) {
        course = {
          id: id(),
          code,
          title: row.course_title.trim(),
          facultyId: faculty.id,
          departmentId: department.id,
          description: row.description?.trim() || "",
          status: "active",
          createdAt: now(),
          updatedAt: now(),
        };
        await save("courses", course);
        courses.push(course);
      } else if (course.title.toLowerCase() !== row.course_title.trim().toLowerCase()) {
        throw new Error("Course code exists with a different title");
      }
      const duplicate = offerings.find(
        (item: any) =>
          item.courseId === course.id &&
          item.academicSessionId === session.id &&
          item.level === row.level.trim() &&
          item.semester === semester,
      );
      if (duplicate) throw new Error("Duplicate course offering");
      const offering = {
        id: id(),
        courseId: course.id,
        academicSessionId: session.id,
        level: row.level.trim(),
        semester,
        creditUnits: row.credit_units ? Number(row.credit_units) : undefined,
        courseStatus: row.course_status?.trim().toLowerCase() || "",
        prerequisites: row.prerequisites?.trim() || "",
        outline: row.course_outline?.trim() || "",
        publicationStatus:
          row.publication_status?.trim().toLowerCase() === "published" ? "published" : "draft",
        createdAt: now(),
        updatedAt: now(),
      };
      if (
        offering.creditUnits !== undefined &&
        (!Number.isInteger(offering.creditUnits) || offering.creditUnits < 0)
      )
        throw new Error("Invalid credit units");
      await save("offerings", offering);
      offerings.push(offering);
      results.push({ row: index + 2, success: true });
    } catch (error) {
      results.push({
        row: index + 2,
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      });
    }
  }
  return c.json({ results });
});

Deno.serve(app.fetch);
