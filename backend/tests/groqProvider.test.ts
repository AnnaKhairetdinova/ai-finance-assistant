import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { GroqProvider } from "../src/providers/groqProvider.js";
import type { AIInsightsContext } from "../src/types/ai.js";
import { HttpError } from "../src/utils/httpError.js";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const TEST_API_KEY = "test-api-key";
const TEST_MODEL = "test-model";

const context: AIInsightsContext = {
  period: {
    from: "2026-09-01",
    to: "2026-09-21",
  },
  statistics: {
    income: "1500.00",
    expense: "250.50",
    balance: "1249.50",
    byCategory: [
      {
        category: "transport",
        amount: "150.50",
      },
      {
        category: "food",
        amount: "100.00",
      },
    ],
  },
};

const leakedFields = {
  userUuid: "leak-user-uuid",
  email: "leak@example.com",
  jwt: "leak-jwt-token",
  description: "leak-description",
  createdAt: "leak-created-at",
  updatedAt: "leak-updated-at",
};

const originalFetch = globalThis.fetch;

type FetchCall = {
  input: Parameters<typeof fetch>[0];
  init: Parameters<typeof fetch>[1];
};

function installFetch(
  impl: (input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => Promise<Response>,
): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return impl(input, init);
  };
  return calls;
}

function headerValue(headers: HeadersInit | undefined, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  if (Array.isArray(headers)) {
    const match = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return match?.[1];
  }

  const record = headers as Record<string, string>;
  const key = Object.keys(record).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? record[key] : undefined;
}

function assertHttpError(error: unknown, statusCode: number, message: string) {
  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, statusCode);
  assert.equal(error.message, message);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("GroqProvider.generate", () => {
  it("returns analysis from a successful Groq chat completion", async () => {
    const calls = installFetch(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: "Тестовый анализ финансов",
            },
          },
        ],
      }),
    );
    const provider = new GroqProvider(TEST_API_KEY, TEST_MODEL);

    const result = await provider.generate({
      ...context,
      ...leakedFields,
    });

    assert.deepEqual(result.period, context.period);
    assert.equal(result.analysis, "Тестовый анализ финансов");
    assert.equal(calls.length, 1);

    const { input, init } = calls[0];
    assert.equal(String(input), GROQ_CHAT_COMPLETIONS_URL);
    assert.equal(init?.method, "POST");
    assert.equal(headerValue(init?.headers, "authorization"), `Bearer ${TEST_API_KEY}`);
    assert.equal(headerValue(init?.headers, "content-type"), "application/json");
    assert.equal(typeof init?.body, "string");

    const body = JSON.parse(init?.body as string) as {
      model?: unknown;
      messages?: Array<{ role?: unknown; content?: unknown }>;
    };
    assert.equal(body.model, TEST_MODEL);
    assert.ok(Array.isArray(body.messages));

    const systemMessage = body.messages.find((message) => message.role === "system");
    const userMessage = body.messages.find((message) => message.role === "user");
    assert.equal(typeof systemMessage?.content, "string");
    assert.ok((systemMessage?.content as string).length > 0);
    assert.equal(typeof userMessage?.content, "string");

    const userPrompt = userMessage?.content as string;
    assert.match(userPrompt, /2026-09-01/);
    assert.match(userPrompt, /2026-09-21/);
    assert.match(userPrompt, /1500\.00/);
    assert.match(userPrompt, /250\.50/);
    assert.match(userPrompt, /1249\.50/);
    assert.match(userPrompt, /transport/);
    assert.match(userPrompt, /150\.50/);
    assert.match(userPrompt, /food/);
    assert.match(userPrompt, /100\.00/);

    const serializedBody = init?.body as string;
    for (const value of Object.values(leakedFields)) {
      assert.equal(serializedBody.includes(value), false);
    }
  });

  it("throws HttpError 500 when the API key is empty and does not call fetch", async () => {
    const calls = installFetch(async () => {
      throw new Error("fetch should not be called");
    });
    const provider = new GroqProvider("", TEST_MODEL);

    await assert.rejects(
      () => provider.generate(context),
      (error: unknown) => {
        assertHttpError(error, 500, "GROQ_API_KEY is not set");
        return true;
      },
    );
    assert.equal(calls.length, 0);
  });

  it("throws HttpError 502 when Groq responds with an HTTP error", async () => {
    installFetch(async () => new Response("provider error", { status: 401 }));
    const provider = new GroqProvider(TEST_API_KEY, TEST_MODEL);

    await assert.rejects(
      () => provider.generate(context),
      (error: unknown) => {
        assertHttpError(error, 502, "AI provider request failed");
        assert.equal(error instanceof Error && error.message.includes("provider error"), false);
        return true;
      },
    );
  });

  it("throws HttpError 502 when the network request fails", async () => {
    installFetch(async () => {
      throw new Error("network failure");
    });
    const provider = new GroqProvider(TEST_API_KEY, TEST_MODEL);

    await assert.rejects(
      () => provider.generate(context),
      (error: unknown) => {
        assertHttpError(error, 502, "AI provider request failed");
        assert.equal(error instanceof Error && error.message.includes("network failure"), false);
        return true;
      },
    );
  });

  it("throws HttpError 502 when Groq returns invalid JSON", async () => {
    installFetch(
      async () =>
        new Response("not json", {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
    );
    const provider = new GroqProvider(TEST_API_KEY, TEST_MODEL);

    await assert.rejects(
      () => provider.generate(context),
      (error: unknown) => {
        assertHttpError(error, 502, "AI provider returned an unexpected response");
        assert.equal(error instanceof Error && error.message.includes("not json"), false);
        return true;
      },
    );
  });

  it("throws HttpError 502 when Groq returns an empty choices array", async () => {
    installFetch(async () => Response.json({ choices: [] }));
    const provider = new GroqProvider(TEST_API_KEY, TEST_MODEL);

    await assert.rejects(
      () => provider.generate(context),
      (error: unknown) => {
        assertHttpError(error, 502, "AI provider returned an unexpected response");
        return true;
      },
    );
  });

  it("throws HttpError 502 when Groq returns empty content", async () => {
    installFetch(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
      }),
    );
    const provider = new GroqProvider(TEST_API_KEY, TEST_MODEL);

    await assert.rejects(
      () => provider.generate(context),
      (error: unknown) => {
        assertHttpError(error, 502, "AI provider returned an unexpected response");
        return true;
      },
    );
  });
});
