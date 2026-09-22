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

async function getTransaction(uuid: string, token?: string, query = "") {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`http://127.0.0.1:${port}/api/transactions/${uuid}${query}`, { headers });
}

async function updateTransaction(uuid: string, body: unknown, token?: string, query = "") {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`http://127.0.0.1:${port}/api/transactions/${uuid}${query}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

async function deleteTransaction(uuid: string, token?: string, query = "") {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`http://127.0.0.1:${port}/api/transactions/${uuid}${query}`, {
    method: "DELETE",
    headers,
  });
}

async function getTransactionStats(token?: string, query = "") {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`http://127.0.0.1:${port}/api/transactions/stats${query}`, { headers });
}

async function createDbTransaction(
  userUuid: string,
  data: {
    description: string;
    amount?: string;
    type?: "income" | "expense";
    category?: "food" | "transport" | "shopping" | "entertainment" | "health" | "education" | "other";
    transactionDate: Date;
  },
) {
  return prisma.transaction.create({
    data: {
      userUuid,
      type: data.type ?? "expense",
      amount: data.amount ?? "100.00",
      category: data.category ?? "food",
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

describe("GET /api/transactions/:uuid", () => {
  const missingUuid = "00000000-0000-4000-8000-000000000001";

  it("rejects a request without JWT", async () => {
    const response = await getTransaction(missingUuid);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("rejects a request with an invalid JWT", async () => {
    const response = await getTransaction(missingUuid, "invalid-token");

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("returns the current user's transaction", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      amount: "1250.50",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await getTransaction(transaction.uuid, createAccessToken(user.uuid));
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertPublicTransaction(body);
    assert.equal(body.uuid, transaction.uuid);
    assert.equal(body.type, "expense");
    assert.equal(body.amount, "1250.50");
    assert.equal(body.category, "food");
    assert.equal(body.description, "Lunch");
    assert.equal(body.transactionDate, "2026-09-21T10:00:00.000Z");
  });

  it("returns 404 when the transaction does not exist", async () => {
    const user = await createUser();
    const response = await getTransaction(missingUuid, createAccessToken(user.uuid));

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Transaction not found" });
  });

  it("returns 404 when the transaction belongs to another user", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const transactionB = await createDbTransaction(userB.uuid, {
      description: "B1",
      transactionDate: new Date("2026-09-21T00:00:00.000Z"),
    });

    const response = await getTransaction(transactionB.uuid, createAccessToken(userA.uuid));

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Transaction not found" });
  });

  it("rejects an invalid transaction UUID", async () => {
    const user = await createUser();
    const response = await getTransaction("not-a-uuid", createAccessToken(user.uuid));

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid transaction UUID" });
  });

  it("ignores userUuid query parameter for ownership", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const transactionA = await createDbTransaction(userA.uuid, {
      description: "A1",
      amount: "1250.50",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await getTransaction(
      transactionA.uuid,
      createAccessToken(userA.uuid),
      `?userUuid=${userB.uuid}`,
    );

    assert.equal(response.status, 200);
    const body = (await response.json()) as { uuid: string };
    assert.equal(body.uuid, transactionA.uuid);
  });
});

describe("PATCH /api/transactions/:uuid", () => {
  const missingUuid = "00000000-0000-4000-8000-000000000001";

  it("rejects a request without JWT", async () => {
    const response = await updateTransaction(missingUuid, { amount: "1500.00" });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("rejects a request with an invalid JWT", async () => {
    const response = await updateTransaction(missingUuid, { amount: "1500.00" }, "invalid-token");

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("partially updates a single field", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      amount: "1250.50",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await updateTransaction(
      transaction.uuid,
      { amount: "1500.00" },
      createAccessToken(user.uuid),
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertPublicTransaction(body);
    assert.equal(body.uuid, transaction.uuid);
    assert.equal(body.amount, "1500.00");
    assert.equal(body.description, "Lunch");
    assert.equal(body.category, "food");
    assert.equal(body.type, "expense");
    assert.equal(body.transactionDate, "2026-09-21T10:00:00.000Z");
  });

  it("updates multiple fields", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      amount: "1250.50",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await updateTransaction(
      transaction.uuid,
      {
        type: "income",
        amount: "5000.25",
        category: "education",
        description: "Freelance",
        transactionDate: "2026-09-20T12:00:00.000Z",
      },
      createAccessToken(user.uuid),
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assertPublicTransaction(body);
    assert.equal(body.uuid, transaction.uuid);
    assert.equal(body.type, "income");
    assert.equal(body.amount, "5000.25");
    assert.equal(body.category, "education");
    assert.equal(body.description, "Freelance");
    assert.equal(body.transactionDate, "2026-09-20T12:00:00.000Z");
  });

  it("returns 404 when the transaction belongs to another user", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const transactionB = await createDbTransaction(userB.uuid, {
      description: "B1",
      amount: "1250.50",
      transactionDate: new Date("2026-09-21T00:00:00.000Z"),
    });

    const response = await updateTransaction(
      transactionB.uuid,
      { description: "Updated" },
      createAccessToken(userA.uuid),
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Transaction not found" });

    const stored = await prisma.transaction.findUnique({
      where: { uuid: transactionB.uuid },
    });
    assert.ok(stored);
    assert.equal(stored.userUuid, userB.uuid);
    assert.equal(stored.description, "B1");
    assert.equal(stored.amount.toFixed(2), "1250.50");
  });

  it("returns 404 when the transaction does not exist", async () => {
    const user = await createUser();
    const response = await updateTransaction(
      missingUuid,
      { description: "Updated" },
      createAccessToken(user.uuid),
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Transaction not found" });
  });

  it("rejects an invalid transaction UUID", async () => {
    const user = await createUser();
    const response = await updateTransaction(
      "not-a-uuid",
      { description: "Updated" },
      createAccessToken(user.uuid),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid transaction UUID" });
  });

  it("rejects an empty update body", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await updateTransaction(transaction.uuid, {}, createAccessToken(user.uuid));

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "At least one field is required" });
  });

  it("rejects an invalid amount", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await updateTransaction(
      transaction.uuid,
      { amount: "100.123" },
      createAccessToken(user.uuid),
    );

    assert.equal(response.status, 400);
  });

  it("rejects an invalid category", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await updateTransaction(
      transaction.uuid,
      { category: "invalid-category" },
      createAccessToken(user.uuid),
    );

    assert.equal(response.status, 400);
  });

  it("rejects an empty description", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await updateTransaction(
      transaction.uuid,
      { description: "   " },
      createAccessToken(user.uuid),
    );

    assert.equal(response.status, 400);
  });

  it("rejects an invalid transactionDate", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await updateTransaction(
      transaction.uuid,
      { transactionDate: "not-a-date" },
      createAccessToken(user.uuid),
    );

    assert.equal(response.status, 400);
  });

  it("ignores userUuid query parameter for ownership", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const transactionA = await createDbTransaction(userA.uuid, {
      description: "A1",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await updateTransaction(
      transactionA.uuid,
      { description: "Updated" },
      createAccessToken(userA.uuid),
      `?userUuid=${userB.uuid}`,
    );

    assert.equal(response.status, 200);

    const body = (await response.json()) as { uuid: string; description: string };
    assert.equal(body.uuid, transactionA.uuid);
    assert.equal(body.description, "Updated");

    const stored = await prisma.transaction.findUnique({
      where: { uuid: transactionA.uuid },
    });
    assert.ok(stored);
    assert.equal(stored.userUuid, userA.uuid);
    assert.equal(stored.description, "Updated");
  });
});

describe("DELETE /api/transactions/:uuid", () => {
  const missingUuid = "00000000-0000-4000-8000-000000000001";

  it("rejects a request without JWT", async () => {
    const response = await deleteTransaction(missingUuid);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("rejects a request with an invalid JWT", async () => {
    const response = await deleteTransaction(missingUuid, "invalid-token");

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("deletes the current user's transaction", async () => {
    const user = await createUser();
    const transaction = await createDbTransaction(user.uuid, {
      description: "Lunch",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await deleteTransaction(transaction.uuid, createAccessToken(user.uuid));

    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");

    const stored = await prisma.transaction.findUnique({
      where: { uuid: transaction.uuid },
    });
    assert.equal(stored, null);
  });

  it("returns 404 when the transaction belongs to another user", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const transactionB = await createDbTransaction(userB.uuid, {
      description: "B1",
      transactionDate: new Date("2026-09-21T00:00:00.000Z"),
    });

    const response = await deleteTransaction(transactionB.uuid, createAccessToken(userA.uuid));

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Transaction not found" });

    const stored = await prisma.transaction.findUnique({
      where: { uuid: transactionB.uuid },
    });
    assert.ok(stored);
    assert.equal(stored.userUuid, userB.uuid);
  });

  it("returns 404 when the transaction does not exist", async () => {
    const user = await createUser();
    const response = await deleteTransaction(missingUuid, createAccessToken(user.uuid));

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Transaction not found" });
  });

  it("rejects an invalid transaction UUID", async () => {
    const user = await createUser();
    const response = await deleteTransaction("not-a-uuid", createAccessToken(user.uuid));

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid transaction UUID" });
  });

  it("ignores userUuid query parameter for ownership", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const transactionA = await createDbTransaction(userA.uuid, {
      description: "A1",
      transactionDate: new Date("2026-09-21T10:00:00.000Z"),
    });

    const response = await deleteTransaction(
      transactionA.uuid,
      createAccessToken(userA.uuid),
      `?userUuid=${userB.uuid}`,
    );

    assert.equal(response.status, 204);

    const stored = await prisma.transaction.findUnique({
      where: { uuid: transactionA.uuid },
    });
    assert.equal(stored, null);
  });
});

describe("GET /api/transactions/stats", () => {
  const periodQuery = "?from=2026-09-01&to=2026-09-30";

  it("rejects a request without JWT", async () => {
    const response = await getTransactionStats(undefined, periodQuery);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("rejects a request with an invalid JWT", async () => {
    const response = await getTransactionStats("invalid-token", periodQuery);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  });

  it("rejects a request without from", async () => {
    const user = await createUser();
    const response = await getTransactionStats(createAccessToken(user.uuid), "?to=2026-09-30");

    assert.equal(response.status, 400);
  });

  it("rejects a request without to", async () => {
    const user = await createUser();
    const response = await getTransactionStats(createAccessToken(user.uuid), "?from=2026-09-01");

    assert.equal(response.status, 400);
  });

  it("rejects an invalid date", async () => {
    const user = await createUser();
    const response = await getTransactionStats(
      createAccessToken(user.uuid),
      "?from=invalid&to=2026-09-30",
    );

    assert.equal(response.status, 400);
  });

  it("rejects a period where from is later than to", async () => {
    const user = await createUser();
    const response = await getTransactionStats(
      createAccessToken(user.uuid),
      "?from=2026-09-30&to=2026-09-01",
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "from cannot be later than to" });
  });

  it("returns zeros when the user has no transactions in the period", async () => {
    const user = await createUser();
    const response = await getTransactionStats(
      createAccessToken(user.uuid),
      "?from=2025-01-01&to=2025-01-31",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      period: { from: "2025-01-01", to: "2025-01-31" },
      income: "0.00",
      expense: "0.00",
      balance: "0.00",
      byCategory: [],
    });
  });

  it("aggregates income, expense, balance and expense categories", async () => {
    const user = await createUser();
    await createDbTransaction(user.uuid, {
      description: "salary",
      type: "income",
      category: "other",
      amount: "120000.00",
      transactionDate: new Date("2026-09-05T10:00:00.000Z"),
    });
    await createDbTransaction(user.uuid, {
      description: "freelance",
      type: "income",
      category: "education",
      amount: "30000.00",
      transactionDate: new Date("2026-09-10T10:00:00.000Z"),
    });
    await createDbTransaction(user.uuid, {
      description: "food 1",
      amount: "18500.00",
      category: "food",
      transactionDate: new Date("2026-09-02T00:00:00.000Z"),
    });
    await createDbTransaction(user.uuid, {
      description: "transport",
      amount: "7200.00",
      category: "transport",
      transactionDate: new Date("2026-09-15T12:00:00.000Z"),
    });
    await createDbTransaction(user.uuid, {
      description: "shopping",
      amount: "15000.00",
      category: "shopping",
      transactionDate: new Date("2026-09-30T23:59:59.999Z"),
    });
    await createDbTransaction(user.uuid, {
      description: "outside before",
      amount: "999.00",
      transactionDate: new Date("2026-08-31T23:59:59.999Z"),
    });
    await createDbTransaction(user.uuid, {
      description: "outside after",
      amount: "999.00",
      transactionDate: new Date("2026-10-01T00:00:00.000Z"),
    });

    const response = await getTransactionStats(createAccessToken(user.uuid), periodQuery);
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(body.period, { from: "2026-09-01", to: "2026-09-30" });
    assert.equal(body.income, "150000.00");
    assert.equal(body.expense, "40700.00");
    assert.equal(body.balance, "109300.00");
    assert.equal(typeof body.income, "string");
    assert.equal(typeof body.expense, "string");
    assert.equal(typeof body.balance, "string");
    assert.deepEqual(body.byCategory, [
      { category: "food", amount: "18500.00" },
      { category: "shopping", amount: "15000.00" },
      { category: "transport", amount: "7200.00" },
    ]);
  });

  it("sorts equal category amounts by category name", async () => {
    const user = await createUser();
    await createDbTransaction(user.uuid, {
      description: "health",
      amount: "100.00",
      category: "health",
      transactionDate: new Date("2026-09-10T00:00:00.000Z"),
    });
    await createDbTransaction(user.uuid, {
      description: "entertainment",
      amount: "100.00",
      category: "entertainment",
      transactionDate: new Date("2026-09-11T00:00:00.000Z"),
    });

    const response = await getTransactionStats(createAccessToken(user.uuid), periodQuery);
    assert.equal(response.status, 200);

    const body = (await response.json()) as {
      byCategory: Array<{ category: string; amount: string }>;
    };
    assert.deepEqual(body.byCategory, [
      { category: "entertainment", amount: "100.00" },
      { category: "health", amount: "100.00" },
    ]);
  });

  it("ignores another user's transactions and userUuid query", async () => {
    const userA = await createUser();
    const userB = await createUser();
    await createDbTransaction(userA.uuid, {
      description: "A expense",
      amount: "50.00",
      transactionDate: new Date("2026-09-10T00:00:00.000Z"),
    });
    await createDbTransaction(userB.uuid, {
      description: "B expense",
      amount: "900.00",
      transactionDate: new Date("2026-09-10T00:00:00.000Z"),
    });
    await createDbTransaction(userB.uuid, {
      description: "B income",
      type: "income",
      category: "other",
      amount: "5000.00",
      transactionDate: new Date("2026-09-10T00:00:00.000Z"),
    });

    const response = await getTransactionStats(
      createAccessToken(userA.uuid),
      `${periodQuery}&userUuid=${userB.uuid}`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      period: { from: "2026-09-01", to: "2026-09-30" },
      income: "0.00",
      expense: "50.00",
      balance: "-50.00",
      byCategory: [{ category: "food", amount: "50.00" }],
    });
  });
});
