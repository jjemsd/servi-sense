import { api } from "./client";
import type {
  MessageResponse,
  RecordCreate,
  RecordUpdate,
  RecordsFilters,
  RecordsListResponse,
  ServiceRecord,
} from "../types/api";

export function listRecords(filters: RecordsFilters = {}): Promise<RecordsListResponse> {
  return api.get<RecordsListResponse>(
    "/api/records",
    filters as Record<string, string | number | boolean | null | undefined>,
  );
}

export function getRecord(id: number): Promise<ServiceRecord> {
  return api.get<ServiceRecord>(`/api/records/${id}`);
}

export function createRecord(payload: RecordCreate): Promise<ServiceRecord> {
  return api.post<ServiceRecord>("/api/records", payload);
}

export function updateRecord(id: number, payload: RecordUpdate): Promise<ServiceRecord> {
  return api.patch<ServiceRecord>(`/api/records/${id}`, payload);
}

export function deleteRecord(id: number): Promise<MessageResponse> {
  return api.delete<MessageResponse>(`/api/records/${id}`);
}
