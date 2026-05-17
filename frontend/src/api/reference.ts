import { api } from "./client";
import type { ReferenceData } from "../types/api";

export function getReference(): Promise<ReferenceData> {
  return api.get<ReferenceData>("/api/reference");
}
