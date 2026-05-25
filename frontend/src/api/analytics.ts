import { api } from "./client";

export interface AnalyticsKPIs {
  total_records: number;
  unique_students: number;
  active_services_used: number;
}

export interface Bucket {
  label: string;
  count: number;
}

export interface HourlyBucket {
  hour: number;
  count: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKPIs;
  by_office: Bucket[];
  by_department: Bucket[];
  by_month: Bucket[];
  by_day_of_week: Bucket[];
  by_hour: HourlyBucket[];
  series_offices: string[];
  by_month_by_office: Record<string, string | number>[];
  by_department_by_office: Record<string, string | number>[];
  by_dow_by_office: Record<string, string | number>[];
  by_hour_by_office: Record<string, string | number>[];
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
