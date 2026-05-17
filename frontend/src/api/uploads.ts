import { api, apiDownload, apiFetch } from "./client";
import type {
  MessageResponse,
  UploadProcessResult,
  UploadedFile,
} from "../types/api";

export function listUploads(office?: string): Promise<UploadedFile[]> {
  return api.get<UploadedFile[]>("/api/uploads", office ? { office } : undefined);
}

export function uploadFile(
  file: File,
  targetOffice?: string,
): Promise<UploadProcessResult> {
  const form = new FormData();
  form.append("file", file);
  if (targetOffice) form.append("target_office", targetOffice);
  return apiFetch<UploadProcessResult>("/api/uploads", {
    method: "POST",
    body: form,
  });
}

export function downloadUpload(id: number): Promise<Blob> {
  return apiDownload(`/api/uploads/${id}/download`);
}

export function deleteUpload(id: number): Promise<MessageResponse> {
  return api.delete<MessageResponse>(`/api/uploads/${id}`);
}
