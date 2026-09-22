import "dotenv/config";
import assert from "node:assert/strict";
import { after, afterEach, describe, it } from "node:test";
import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma.js";
import { AIService } from "../src/services/aiService.js";
import type { AIInsightsContext, AIInsightsProvider, AIInsightsResult } from "../src/types/ai.js";

const createdEmails: string[] = [];

class RecordingProvider implements AIInsightsProvider {
  received: AIInsightsContext | undefined;

  async generate(context: AIInsightsContext): Promise<AIInsightsResult> {
    this.received = context;
    return {
      period: context.period,
      analysis: "Тестовый анализ финансов",
    };
  }
}

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys);
    }
    return keys;
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }

  return keys;
}

afterEach(async () => {
  if (createdEmails.length === 0) {
    return;
  }

  await prisma.user.deleteMany({
    where: { email: { in: createdEmails } },
  });
  createdEmails.length = 0;
});

after(async () => {
  await prisma.$disconnect();
});

describe("AIService.generateInsights", () => {
  it("passes aggregated statistics to the provider", async () => {
    const email = uniqueEmail("ai-service");
    const otherEmail = uniqueEmail("ai-service-other");
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash("password123", 10),
      },
    });
    createdEmails.push(email);
    const otherUser = await prisma.user.create({
      data: {
        email: otherEmail,
        passwordHash: await bcrypt.hash("password123", 10),
      },
    });
    createdEmails.push(otherEmail);

    await prisma.transaction.createMany({
      data: [
        {
          userUuid: user.uuid,
          type: "income",
          amount: "1500.00",
          category: "other",
          description: "income-note",
          transactionDate: new Date("2026-09-10T12:00:00.000Z"),
        },
        {
          userUuid: user.uuid,
          type: "expense",
          amount: "150.50",
          category: "transport",
          description: "transport-note",
          transactionDate: new Date("2026-09-11T12:00:00.000Z"),
        },
        {
          userUuid: user.uuid,
          type: "expense",
          amount: "100.00",
          category: "food",
          description: "food-note",
          transactionDate: new Date("2026-09-12T12:00:00.000Z"),
        },
        {
          userUuid: user.uuid,
          type: "expense",
          amount: "999.99",
          category: "shopping",
          description: "outside-period-note",
          transactionDate: new Date("2026-08-15T12:00:00.000Z"),
        },
        {
          userUuid: otherUser.uuid,
          type: "income",
          amount: "9999.00",
          category: "other",
          description: "other-user-note",
          transactionDate: new Date("2026-09-10T12:00:00.000Z"),
        },
      ],
    });

    const provider = new RecordingProvider();
    const service = new AIService(provider);
    const period = {
      from: "2026-09-01",
      to: "2026-09-21",
    };
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error("fetch should not be called");
    };

    try {
      const result = await service.generateInsights(user.uuid, period);

      assert.equal(fetchCalls, 0);
      assert.deepEqual(result, {
        period,
        analysis: "Тестовый анализ финансов",
      });
      assert.deepEqual(provider.received, {
        period,
        statistics: {
          income: "1500.00",
          expense: "250.50",
          balance: "1249.50",
          byCategory: [
            { category: "transport", amount: "150.50" },
            { category: "food", amount: "100.00" },
          ],
        },
      });

      const received = provider.received as AIInsightsContext;
      assert.equal(typeof received.statistics.income, "string");
      assert.equal(typeof received.statistics.expense, "string");
      assert.equal(typeof received.statistics.balance, "string");
      for (const item of received.statistics.byCategory) {
        assert.equal(typeof item.amount, "string");
      }

      const keys = collectKeys(received);
      for (const forbidden of [
        "userUuid",
        "email",
        "jwt",
        "password",
        "passwordHash",
        "description",
        "createdAt",
        "updatedAt",
        "transactionDate",
        "transactions",
        "uuid",
      ]) {
        assert.equal(keys.has(forbidden), false);
      }

      const serialized = JSON.stringify(received);
      for (const secret of [
        user.uuid,
        otherUser.uuid,
        email,
        otherEmail,
        "income-note",
        "transport-note",
        "food-note",
        "outside-period-note",
        "other-user-note",
        "999.99",
        "9999.00",
      ]) {
        assert.equal(serialized.includes(secret), false);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
