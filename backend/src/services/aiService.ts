import type { AIInsightsContext, AIInsightsProvider, AIInsightsResult } from "../types/ai.js";
import type { TransactionStatsQuery, TransactionStatsResponse } from "../types/transaction.js";
import { GroqProvider } from "../providers/groqProvider.js";
import { getTransactionStats } from "./transactionService.js";

function toAIInsightsContext(stats: TransactionStatsResponse): AIInsightsContext {
  return {
    period: stats.period,
    statistics: {
      income: stats.income,
      expense: stats.expense,
      balance: stats.balance,
      byCategory: stats.byCategory,
    },
  };
}

export class AIService {
  constructor(private readonly provider: AIInsightsProvider) {}

  async generateInsights(
    userUuid: string,
    period: TransactionStatsQuery,
  ): Promise<AIInsightsResult> {
    const stats = await getTransactionStats(userUuid, period);
    const context = toAIInsightsContext(stats);
    return this.provider.generate(context);
  }
}

export const aiService = new AIService(new GroqProvider());
