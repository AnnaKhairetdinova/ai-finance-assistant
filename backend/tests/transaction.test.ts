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

let server: Server;
let port: number;

describe("POST /api/transactions", () => {
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
