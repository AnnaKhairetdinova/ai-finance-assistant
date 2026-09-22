import { config } from "../config/index.js";
import type { AIInsightsContext, AIInsightsProvider, AIInsightsResult } from "../types/ai.js";
import { HttpError } from "../utils/httpError.js";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TEMPERATURE = 0.2;

const SYSTEM_PROMPT = `Ты финансовый аналитический помощник.

Твоя задача — кратко и понятно проанализировать предоставленную статистику расходов и доходов пользователя.

Используй только данные, которые переданы в запросе.
Не придумывай отсутствующие значения.
Не изменяй и не пересчитывай предоставленные финансовые значения самостоятельно.
Не выдавай инвестиционные, кредитные, налоговые или другие профессиональные финансовые рекомендации.
Не утверждай факты, которых нет в предоставленных данных.

Ответ должен быть на русском языке.
Ответ должен быть кратким и практичным.

Обрати внимание на:
- соотношение доходов и расходов;
- баланс;
- крупнейшие категории расходов;
- заметные особенности структуры расходов;
- отсутствие данных, если данных недостаточно.

Не нужно повторять все цифры подряд.`;

type GroqChatCompletionResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

function buildUserPrompt(context: AIInsightsContext): string {
  const categories = context.statistics.byCategory
    .map((item) => `${item.category}: ${item.amount}`)
    .join("\n");

  return [
    `Период: ${context.period.from} — ${context.period.to}`,
    "",
    `Доход: ${context.statistics.income}`,
    `Расход: ${context.statistics.expense}`,
    `Баланс: ${context.statistics.balance}`,
    "",
    "Расходы по категориям:",
    categories || "нет данных",
  ].join("\n");
}

function isGroqChatCompletionResponse(payload: unknown): payload is GroqChatCompletionResponse {
  if (typeof payload !== "object" || payload === null || !("choices" in payload)) {
    return false;
  }

  if (!Array.isArray(payload.choices) || payload.choices.length === 0) {
    return false;
  }

  const choice: unknown = payload.choices[0];
  if (typeof choice !== "object" || choice === null || !("message" in choice)) {
    return false;
  }

  const message: unknown = choice.message;
  if (typeof message !== "object" || message === null || !("content" in message)) {
    return false;
  }

  return typeof message.content === "string" && message.content.trim() !== "";
}

function readAnalysis(payload: unknown): string {
  if (!isGroqChatCompletionResponse(payload)) {
    throw new HttpError(502, "AI provider returned an unexpected response");
  }

  return payload.choices[0].message.content.trim();
}

export class GroqProvider implements AIInsightsProvider {
  constructor(
    private readonly apiKey: string = config.groqApiKey,
    private readonly model: string = config.groqModel,
  ) {}

  async generate(context: AIInsightsContext): Promise<AIInsightsResult> {
    if (this.apiKey.trim() === "") {
      throw new HttpError(500, "GROQ_API_KEY is not set");
    }

    const analysis = readAnalysis(await this.requestCompletion(context));

    return {
      period: context.period,
      analysis,
    };
  }

  private async requestCompletion(context: AIInsightsContext): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(context) },
          ],
          temperature: GROQ_TEMPERATURE,
        }),
      });
    } catch {
      throw new HttpError(502, "AI provider request failed");
    }

    if (!response.ok) {
      throw new HttpError(502, "AI provider request failed");
    }

    try {
      return await response.json();
    } catch {
      throw new HttpError(502, "AI provider returned an unexpected response");
    }
  }
}
