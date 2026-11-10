-- Sample seed for the project connected to mgrupllmxlslvksilkor
-- 1) In Supabase Dashboard -> Authentication -> Users, create the admin account.
-- 2) Copy the created Auth user UUID.
-- 3) Replace 'REPLACE_WITH_AUTH_USER_UUID' and the admin email/name below.
-- 4) Run this in the SQL Editor for the live project.

INSERT INTO public.kv_store_e9064e7e (key, value)
VALUES
  (
    'settings:site',
    jsonb_build_object(
      'siteName', 'NSUK Academic Resources',
      'contactEmail', 'admin@nsuk.edu.ng',
      'contactPhone', '+234 800 000 0000',
      'address', 'Nasarawa State University, Keffi, Nigeria',
      'privacyText', 'Academic resources are provided for educational use. Availability and accuracy depend on materials verified and published by authorized administrators.',
      'copyrightText', 'Nasarawa State University academic resource platform.',
      'levels', jsonb_build_array('100', '200', '300', '400', '500'),
      'semesters', jsonb_build_array('First semester', 'Second semester'),
      'maxFileSizeMb', 25
    )
  ),
  (
    'profiles:REPLACE_WITH_AUTH_USER_UUID',
    jsonb_build_object(
      'id', 'REPLACE_WITH_AUTH_USER_UUID',
      'email', 'admin@nsuk.edu.ng',
      'fullName', 'NSUK Administrator',
      'role', 'admin',
      'status', 'active',
      'createdAt', now()::text
    )
  ),
  (
    'faculties:fac-science',
    jsonb_build_object(
      'id', 'fac-science',
      'name', 'Faculty of Science',
      'description', 'Natural sciences and applied science programmes.',
      'previousNames', jsonb_build_array(),
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'faculties:fac-education',
    jsonb_build_object(
      'id', 'fac-education',
      'name', 'Faculty of Education',
      'description', 'Teacher education and curriculum programmes.',
      'previousNames', jsonb_build_array(),
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'departments:dept-cs',
    jsonb_build_object(
      'id', 'dept-cs',
      'facultyId', 'fac-science',
      'name', 'Computer Science',
      'abbreviation', 'CSC',
      'description', 'Computer science and software development programmes.',
      'programmeInfo', 'BSc Computer Science',
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'departments:dept-bio',
    jsonb_build_object(
      'id', 'dept-bio',
      'facultyId', 'fac-science',
      'name', 'Biological Sciences',
      'abbreviation', 'BIO',
      'description', 'Biology and environmental science.',
      'programmeInfo', 'BSc Biology',
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'departments:dept-edu',
    jsonb_build_object(
      'id', 'dept-edu',
      'facultyId', 'fac-education',
      'name', 'Educational Management',
      'abbreviation', 'EDM',
      'description', 'Education and administration programmes.',
      'programmeInfo', 'B.Ed Educational Management',
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'sessions:2024/2025',
    jsonb_build_object(
      'id', '2024/2025',
      'name', '2024/2025',
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'sessions:2025/2026',
    jsonb_build_object(
      'id', '2025/2026',
      'name', '2025/2026',
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'courses:course-csc-101',
    jsonb_build_object(
      'id', 'course-csc-101',
      'code', 'CSC 101',
      'title', 'Introduction to Computing',
      'facultyId', 'fac-science',
      'departmentId', 'dept-cs',
      'description', 'Introduction to computing fundamentals, hardware, software, and digital literacy.',
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'courses:course-csc-201',
    jsonb_build_object(
      'id', 'course-csc-201',
      'code', 'CSC 201',
      'title', 'Programming Fundamentals',
      'facultyId', 'fac-science',
      'departmentId', 'dept-cs',
      'description', 'Structured problem solving and beginner application development.',
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'courses:course-edm-101',
    jsonb_build_object(
      'id', 'course-edm-101',
      'code', 'EDM 101',
      'title', 'Foundations of Educational Administration',
      'facultyId', 'fac-education',
      'departmentId', 'dept-edu',
      'description', 'Basic ideas and principles in educational administration and leadership.',
      'status', 'active',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'offerings:offering-csc-101-2025',
    jsonb_build_object(
      'id', 'offering-csc-101-2025',
      'courseId', 'course-csc-101',
      'academicSessionId', '2025/2026',
      'level', '100',
      'semester', 'First semester',
      'creditUnits', 3,
      'courseStatus', 'compulsory',
      'prerequisites', 'None',
      'outline', 'Computing basics, operating systems, productivity tools, and introductory programming concepts.',
      'publicationStatus', 'published',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'offerings:offering-csc-201-2025',
    jsonb_build_object(
      'id', 'offering-csc-201-2025',
      'courseId', 'course-csc-201',
      'academicSessionId', '2025/2026',
      'level', '200',
      'semester', 'First semester',
      'creditUnits', 3,
      'courseStatus', 'compulsory',
      'prerequisites', 'CSC 101',
      'outline', 'Algorithmic thinking, loops, functions, and software design approaches.',
      'publicationStatus', 'published',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  ),
  (
    'offerings:offering-edm-101-2025',
    jsonb_build_object(
      'id', 'offering-edm-101-2025',
      'courseId', 'course-edm-101',
      'academicSessionId', '2025/2026',
      'level', '100',
      'semester', 'Second semester',
      'creditUnits', 2,
      'courseStatus', 'elective',
      'prerequisites', 'None',
      'outline', 'School management, leadership, and policy systems in education.',
      'publicationStatus', 'published',
      'createdAt', now()::text,
      'updatedAt', now()::text
    )
  )
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- Optional: you can leave resources empty for now. The app will show the seed data immediately,
-- and you can upload real PDFs from the admin screen after sign-in.
