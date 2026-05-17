import { api } from "./client";
import type {
  MessageResponse,
  Service,
  ServiceCreate,
  ServiceUpdate,
} from "../types/api";

export function listServices(includeInactive = false): Promise<Service[]> {
  return api.get<Service[]>("/api/services", {
    include_inactive: includeInactive,
  });
}

export function getService(id: number): Promise<Service> {
  return api.get<Service>(`/api/services/${id}`);
}

export function createService(payload: ServiceCreate): Promise<Service> {
  return api.post<Service>("/api/services", payload);
}

export function updateService(id: number, payload: ServiceUpdate): Promise<Service> {
  return api.patch<Service>(`/api/services/${id}`, payload);
}

export function deleteService(id: number): Promise<MessageResponse> {
  return api.delete<MessageResponse>(`/api/services/${id}`);
}
