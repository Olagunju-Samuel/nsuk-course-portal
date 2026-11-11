export type Status = "active" | "archived";
export type PublicationStatus = "draft" | "published" | "archived";

export interface Faculty {
  id: string;
  name: string;
  description?: string;
  previousNames?: string[];
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  facultyId: string;
  name: string;
  abbreviation?: string;
  description?: string;
  programmeInfo?: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  facultyId: string;
  departmentId: string;
  description?: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Offering {
  id: string;
  courseId: string;
  academicSessionId: string;
  level: string;
  semester: string;
  creditUnits?: number;
  courseStatus?: "compulsory" | "elective" | "";
  prerequisites?: string;
  outline?: string;
  publicationStatus: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}

export type ResourceCategory =
  | "course_outline"
  | "course_material"
  | "lecture_note"
  | "reading_material"
  | "past_question"
  | "solution"
  | "other";

export interface Resource {
  id: string;
  offeringId: string;
  title: string;
  category: ResourceCategory;
  description?: string;
  publicationYear?: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileFormat: "PDF";
  publicationStatus: PublicationStatus;
  verificationStatus: "unverified" | "verified";
  uploadedAt: string;
  updatedAt: string;
}

export interface Settings {
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  privacyText: string;
  copyrightText: string;
  levels: string[];
  semesters: string[];
  maxFileSizeMb: number;
}

export interface DataBundle {
  faculties: Faculty[];
  departments: Department[];
  sessions: AcademicSession[];
  courses: Course[];
  offerings: Offering[];
  resources: Resource[];
  settings: Settings;
}

export interface JoinedOffering extends Offering {
  course: Course;
  faculty: Faculty;
  department: Department;
  session: AcademicSession;
  resources: Resource[];
}

export const categoryLabels: Record<ResourceCategory, string> = {
  course_outline: "Course outline & syllabus",
  course_material: "Course materials",
  lecture_note: "Lecture notes",
  reading_material: "Reading materials",
  past_question: "Past questions",
  solution: "Solutions & marking guides",
  other: "Other",
};

export const emptyBundle: DataBundle = {
  faculties: [],
  departments: [],
  sessions: [],
  courses: [],
  offerings: [],
  resources: [],
  settings: {
    siteName: "NSUK Edu-Archive",
    contactEmail: "",
    contactPhone: "",
    address: "Nasarawa State University, Keffi, Nigeria",
    privacyText:
      "Academic resources are provided for educational use. Availability and accuracy depend on materials verified and published by authorized administrators.",
    copyrightText: "Nasarawa State University academic resource platform.",
    levels: ["100", "200", "300", "400", "500"],
    semesters: ["First semester", "Second semester"],
    maxFileSizeMb: 25,
  },
};
