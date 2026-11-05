import { apiJson } from "./client";

export function getHealth() {
  return apiJson<{ status: string; database: string }>("/api/health");
}
