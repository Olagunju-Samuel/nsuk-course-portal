import type { DataBundle, JoinedOffering } from "../types";

export function joinOfferings(data: DataBundle): JoinedOffering[] {
  return data.offerings
    .map((offering) => {
      const course = data.courses.find((item) => item.id === offering.courseId);
      const faculty = course
        ? data.faculties.find((item) => item.id === course.facultyId)
        : undefined;
      const department = course
        ? data.departments.find((item) => item.id === course.departmentId)
        : undefined;
      const session = data.sessions.find((item) => item.id === offering.academicSessionId);
      if (!course || !faculty || !department || !session) return null;
      return {
        ...offering,
        course,
        faculty,
        department,
        session,
        resources: data.resources.filter((item) => item.offeringId === offering.id),
      };
    })
    .filter((item): item is JoinedOffering => Boolean(item));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
