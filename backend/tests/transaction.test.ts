import "dotenv/config";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, afterEach, before, describe, it } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret";
}

const { default: app } = await import("../src/app.js");
const { prisma } = await import("../src/config/prisma.js");
const { createAccessToken } = await import("../src/utils/jwt.js");

const createdEmails: string[] = [];
const validBody = {
  type: "expense",
  amount: "1500.00",
  category: "food",
  description: "Продукты",
  transactionDate: "2026-09-21",
} as const;

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function trackEmail(email: string) {
  createdEmails.push(email.trim().toLowerCase());
}

async function createUser() {
  const email = uniqueEmail("transaction");
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });
  trackEmail(email);
  return user;
}

async function postTransaction(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`http://127.0.0.1:${port}/api/transactions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function getTransactions(token?: string, query = "") {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`http://127.0.0.1:${port}/api/transactions${query}`, { headers });
}

async function createDbTransaction(
  userUuid: string,
  data: {
    description: string;
    amount?: string;
    transactionDate: Date;
  },
) {
  return prisma.transaction.create({
    data: {
      userUuid,
      type: "expense",
      amount: data.amount ?? "100.00",
      category: "food",
      description: data.description,
      transactionDate: data.transactionDate,
    },
  });
}

function assertPublicTransaction(transaction: Record<string, unknown>) {
  assert.equal(typeof transaction.uuid, "string");
  assert.equal(typeof transaction.type, "string");
  assert.equal(typeof transaction.amount, "string");
  assert.match(transaction.amount, /^\d+\.\d{2}$/);
  assert.equal(typeof transaction.category, "string");
  assert.equal(typeof transaction.description, "string");
  assert.equal(typeof transaction.transactionDate, "string");
  assert.equal(typeof transaction.createdAt, "string");
  assert.equal(typeof transaction.updatedAt, "string");
  assert.equal(new Date(transaction.transactionDate).toISOString(), transaction.transactionDate);
  assert.equal(new Date(transaction.createdAt).toISOString(), transaction.createdAt);
  assert.equal(new Date(transaction.updatedAt).toISOString(), transaction.updatedAt);
  assert.equal("userUuid" in transaction, false);
  assert.equal("email" in transaction, false);
  assert.equal("password" in transaction, false);
  assert.equal("passwordHash" in transaction, false);
}

let server: Server;
let port: number;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      port = (server.address() as AddressInfo).port;
      resolve();
    });
  });
});

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
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  await prisma.$disconnect();
});

describe("POST /api/transactions", () => {
  it("rejects a request without JWT", async () => {
    const response = await postTransaction(validBody);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("rejects a request with an invalid JWT", async () => {
    const token = jwt.sign({ uuid: "11111111-1111-1111-1111-111111111111" }, "wrong-secret", {
      expiresIn: "1h",
    });
    const response = await postTransaction(validBody, token);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("creates a transaction for the JWT user and returns a public payload", async () => {
    const user = await createUser();
    const token = createAccessToken(user.uuid);
    const response = await postTransaction(validBody, token);

    assert.equal(response.status, 201);

    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(typeof body.uuid, "string");
    assert.equal(body.type, validBody.type);
    assert.equal(body.amount, "1500.00");
    assert.equal(typeof body.amount, "string");
    assert.equal(body.category, validBody.category);
    assert.equal(body.description, validBody.description);
    assert.equal(body.transactionDate, "2026-09-21T00:00:00.000Z");
    assert.equal("userUuid" in body, false);
    assert.equal("password" in body, false);
    assert.equal("passwordHash" in body, false);
    assert.equal("email" in body, false);

    const stored = await prisma.transaction.findUnique({
      where: { uuid: body.uuid as string },
    });
    assert.ok(stored);
    assert.equal(stored.userUuid, user.uuid);
  });

  it("ignores userUuid from the request body", async () => {
    const user = await createUser();
    const token = createAccessToken(user.uuid);
    const response = await postTransaction(
      {
        ...validBody,
        userUuid: "22222222-2222-2222-2222-222222222222",
      },
      token,
    );

    assert.equal(response.status, 201);

    const body = (await response.json()) as { uuid: string };
    const stored = await prisma.transaction.findUnique({
      where: { uuid: body.uuid },
    });
    assert.ok(stored);
    assert.equal(stored.userUuid, user.uuid);
    assert.notEqual(stored.userUuid, "22222222-2222-2222-2222-222222222222");
  });

  it("rejects invalid request bodies", async () => {
    const user = await createUser();
    const token = createAccessToken(user.uuid);
    const cases: unknown[] = [
      {
        amount: validBody.amount,
        category: validBody.category,
        description: validBody.description,
        transactionDate: validBody.transactionDate,
      },
      { ...validBody, type: "transfer" },
      { ...validBody, amount: "-100" },
      { ...validBody, amount: "0" },
      { ...validBody, amount: "100.123" },
      { ...validBody, category: "groceries" },
      { ...validBody, description: "   " },
      { ...validBody, transactionDate: "21.09.2026" },
    ];

    for (const body of cases) {
      const response = await postTransaction(body, token);
      assert.equal(response.status, 400);
    }
  });
});

describe("GET /api/transactions", () => {
  it("rejects a request without JWT", async () => {
    const response = await getTransactions();

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("rejects a request with an invalid JWT", async () => {
    const response = await getTransactions("invalid-token");

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("returns only the current user's transactions", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const transactionA1 = await createDbTransaction(userA.uuid, {
      description: "A1",
      transactionDate: new Date("2026-09-21T00:00:00.000Z"),
    });
    const transactionA2 = await createDbTransaction(userA.uuid, {
      description: "A2",
      transactionDate: new Date("2026-09-20T00:00:00.000Z"),
    });
    await createDbTransaction(userB.uuid, {
      description: "B1",
      transactionDate: new Date("2026-09-21T00:00:00.000Z"),
    });

    const response = await getTransactions(createAccessToken(userA.uuid));
    assert.equal(response.status, 200);

    const body = (await response.json()) as Array<{ uuid: string; description: string }>;
    assert.equal(body.length, 2);
    assert.deepEqual(body.map((transaction) => transaction.uuid).sort(), [
      transactionA1.uuid,
      transactionA2.uuid,
    ].sort());
    assert.equal(
      body.some((transaction) => transaction.description === "B1"),
      false,
    );
  });

  it("ignores userUuid query parameter", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const transactionA = await createDbTransaction(userA.uuid, {
      description: "A1",
      transactionDate: new Date("2026-09-21T00:00:00.000Z"),
    });
    await createDbTransaction(userB.uuid, {
      description: "B1",
      transactionDate: new Date("2026-09-21T00:00:00.000Z"),
    });

    const response = await getTransactions(
      createAccessToken(userA.uuid),
      `?userUuid=${userB.uuid}`,
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as Array<{ uuid: string }>;
    assert.equal(body.length, 1);
    assert.equal(body[0]?.uuid, transactionA.uuid);
  });

  it("returns a public payload with string amounts and ISO dates", async () => {
    const user = await createUser();
    await createDbTransaction(user.uuid, {
      description: "Lunch",
      amount: "1250.50",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await getTransactions(createAccessToken(user.uuid));
    assert.equal(response.status, 200);

    const body = (await response.json()) as Array<Record<string, unknown>>;
    assert.equal(body.length, 1);
    assertPublicTransaction(body[0]!);
    assert.equal(body[0]!.amount, "1250.50");
    assert.equal(body[0]!.description, "Lunch");
  });

  it("sorts transactions by transactionDate descending", async () => {
    const user = await createUser();
    const transactionA = await createDbTransaction(user.uuid, {
      description: "A",
      transactionDate: new Date("2026-09-18T00:00:00.000Z"),
    });
    const transactionB = await createDbTransaction(user.uuid, {
      description: "B",
      transactionDate: new Date("2026-09-21T00:00:00.000Z"),
    });
    const transactionC = await createDbTransaction(user.uuid, {
      description: "C",
      transactionDate: new Date("2026-09-19T00:00:00.000Z"),
    });

    const response = await getTransactions(createAccessToken(user.uuid));
    const body = (await response.json()) as Array<{ uuid: string }>;

    assert.equal(response.status, 200);
    assert.deepEqual(
      body.map((transaction) => transaction.uuid),
      [transactionB.uuid, transactionC.uuid, transactionA.uuid],
    );
  });

  it("sorts transactions with the same transactionDate by createdAt descending", async () => {
    const user = await createUser();
    const sameDate = new Date("2026-09-21T00:00:00.000Z");
    const transactionA = await createDbTransaction(user.uuid, {
      description: "A",
      transactionDate: sameDate,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const transactionB = await createDbTransaction(user.uuid, {
      description: "B",
      transactionDate: sameDate,
    });

    const response = await getTransactions(createAccessToken(user.uuid));
    const body = (await response.json()) as Array<{ uuid: string }>;

    assert.equal(response.status, 200);
    assert.deepEqual(
      body.map((transaction) => transaction.uuid),
      [transactionB.uuid, transactionA.uuid],
    );
  });

  it("returns an empty array when the user has no transactions", async () => {
    const user = await createUser();
    const response = await getTransactions(createAccessToken(user.uuid));

    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(Array.isArray(body), true);
    assert.equal((body as unknown[]).length, 0);
  });
});
