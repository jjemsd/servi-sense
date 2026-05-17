import { api } from "./client";

export interface AnalyticsKPIs {
  total_records: number;
  completed_records: number;
  avg_satisfaction: number | null;
  avg_response_time_minutes: number | null;
  unique_students: number;
  active_services_used: number;
}

export interface Bucket {
  label: string;
  count: number;
}

export interface SatisfactionBucket {
  label: string;
  avg_rating: number | null;
  rated_count: number;
}

export interface HourlyBucket {
  hour: number;
  count: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKPIs;
  by_office: Bucket[];
  by_department: Bucket[];
  by_status: Bucket[];
  by_month: Bucket[];
  by_day_of_week: Bucket[];
  by_hour: HourlyBucket[];
  satisfaction_by_office: SatisfactionBucket[];
}

export interface AnalyticsFilters {
  office?: string;
  date_from?: string;
  date_to?: string;
}

export function getAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsData> {
  return api.get<AnalyticsData>(
    "/api/analytics",
    filters as Record<string, string | number | boolean | null | undefined>,
  );
}
