import { api } from "./client";
import type {
  MessageResponse,
  User,
  UserCreate,
  UserUpdate,
} from "../types/api";

export function listUsers(): Promise<User[]> {
  return api.get<User[]>("/api/users");
}

export function getUser(id: number): Promise<User> {
  return api.get<User>(`/api/users/${id}`);
}

export function createUser(payload: UserCreate): Promise<User> {
  return api.post<User>("/api/users", payload);
}

export function updateUser(id: number, payload: UserUpdate): Promise<User> {
  return api.patch<User>(`/api/users/${id}`, payload);
}

export function deleteUser(id: number): Promise<MessageResponse> {
  return api.delete<MessageResponse>(`/api/users/${id}`);
}

export function resetPassword(id: number, newPassword: string): Promise<MessageResponse> {
  return api.post<MessageResponse>(`/api/users/${id}/reset-password`, {
    new_password: newPassword,
  });
}

export function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<MessageResponse> {
  return api.post<MessageResponse>("/api/users/me/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}
