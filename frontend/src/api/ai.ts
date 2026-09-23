import { api } from "./client";
import type { AIInsights } from "../types/ai";

export function getAIInsights(from: string, to: string) {
  return api.post<AIInsights>("/api/ai/insights", { from, to });
}
