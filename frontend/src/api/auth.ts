import { api } from "./client";
import type { MessageResponse, User } from "../types/api";

export function login(username: string, password: string): Promise<User> {
  return api.post<User>("/api/auth/login", { username, password });
}

export function logout(): Promise<MessageResponse> {
  return api.post<MessageResponse>("/api/auth/logout");
}

export function getMe(): Promise<User> {
  return api.get<User>("/api/auth/me");
}
