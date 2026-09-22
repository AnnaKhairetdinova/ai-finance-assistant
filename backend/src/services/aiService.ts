import type { AIInsightsContext, AIInsightsProvider } from "../types/ai.js";
import type { TransactionStatsQuery, TransactionStatsResponse } from "../types/transaction.js";
import { getTransactionStats } from "./transactionService.js";

class PreparedContextProvider implements AIInsightsProvider {
  async generate(context: AIInsightsContext): Promise<AIInsightsContext> {
    return context;
  }
}

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
  constructor(private readonly provider: AIInsightsProvider = new PreparedContextProvider()) {}

  async generateInsights(
    userUuid: string,
    period: TransactionStatsQuery,
  ): Promise<AIInsightsContext> {
    const stats = await getTransactionStats(userUuid, period);
    return this.provider.generate(toAIInsightsContext(stats));
  }
}

export const aiService = new AIService();
