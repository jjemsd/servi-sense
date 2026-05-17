/**
 * TypeScript types matching the backend Pydantic schemas.
 * Keep this file in sync with backend/app/schemas.py.
 */

export type Role = "admin" | "staff";

export type RecordStatus =
  | "Completed"
  | "In Progress"
  | "Cancelled"
  | "No Show";

export type ServiceCategory =
  | "Academic"
  | "Health"
  | "Enrollment"
  | "Student Life"
  | "Other";

// ── Auth ───────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  username: string;
  role: Role;
  full_name: string | null;
  email: string | null;
  assigned_office: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Services ──────────────────────────────────────────────────────────────
export interface Service {
  id: number;
  name: string;
  category: ServiceCategory;
  description: string | null;
  is_active: boolean;
}

export interface ServiceCreate {
  name: string;
  category: ServiceCategory;
  description?: string;
  is_active?: boolean;
}

export interface ServiceUpdate {
  name?: string;
  category?: ServiceCategory;
  description?: string;
  is_active?: boolean;
}

// ── Records ───────────────────────────────────────────────────────────────
export interface ServiceRecord {
  id: number;
  service_date: string; // YYYY-MM-DD
  time: string | null; // HH:MM:SS
  day_of_week: string | null;
  student_id: string;
  student_name: string;
  year_level: string | null;
  department: string | null;
  service_id: number;
  service_name: string;
  service_category: string;
  office: string;
  status: string;
  notes: string | null;
  processed_by: string | null;
  response_time_minutes: number | null;
  satisfaction_rating: number | null;
  created_at: string;
}

export interface RecordsListResponse {
  items: ServiceRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface RecordCreate {
  service_date: string;
  time?: string | null;
  student_id: string;
  student_name: string;
  year_level?: string | null;
  department?: string | null;
  service_id: number;
  status?: RecordStatus;
  notes?: string | null;
  response_time_minutes?: number | null;
  satisfaction_rating?: number | null;
}

export interface RecordUpdate extends Partial<RecordCreate> {}

export interface RecordsFilters {
  office?: string;
  department?: string;
  service_id?: number;
  status?: RecordStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// ── Users ─────────────────────────────────────────────────────────────────
export interface UserCreate {
  username: string;
  password: string;
  role: Role;
  full_name?: string;
  email?: string;
  assigned_office?: string;
}

export interface UserUpdate {
  full_name?: string;
  email?: string;
  role?: Role;
  assigned_office?: string;
  is_active?: boolean;
}

// ── Uploads ───────────────────────────────────────────────────────────────
export interface UploadedFile {
  id: number;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  uploaded_by: string;
  uploaded_at: string;
  office: string | null;
}

export interface UploadProcessResult {
  upload: UploadedFile;
  total_rows: number;
  inserted: number;
  errors: string[];
}

// ── Reference data ────────────────────────────────────────────────────────
export interface ReferenceData {
  departments: string[];
  year_levels: string[];
  service_categories: string[];
  record_statuses: string[];
  roles: string[];
  offices: string[];
}

// ── Generic response ──────────────────────────────────────────────────────
export interface MessageResponse {
  message: string;
}
