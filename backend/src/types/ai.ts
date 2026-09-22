import type { TransactionStatsQuery, TransactionStatsResponse } from "./transaction.js";

export type AIInsightsContext = {
  period: TransactionStatsQuery;
  statistics: Omit<TransactionStatsResponse, "period">;
};

export type AIInsightsResult = {
  period: TransactionStatsQuery;
  analysis: string;
};

export interface AIInsightsProvider {
  generate(context: AIInsightsContext): Promise<AIInsightsResult>;
}
