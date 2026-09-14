import "dotenv/config";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, afterEach, before, describe, it } from "node:test";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const createdEmails: string[] = [];

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function trackEmail(email: string) {
  createdEmails.push(email.trim().toLowerCase());
}

async function register(body: unknown) {
  return fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

let server: Server;
let port: number;

describe("POST /api/auth/register", () => {
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

  it("registers a user and omits password fields", async () => {
    const email = uniqueEmail("success");
    const response = await register({
      email,
      password: "password123",
    });
    trackEmail(email);

    assert.equal(response.status, 201);

    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(typeof body.uuid, "string");
    assert.equal(body.email, email);
    assert.equal("password" in body, false);
    assert.equal("passwordHash" in body, false);
  });

  it("rejects an invalid email and does not create a user", async () => {
    const email = "not-an-email";
    const response = await register({
      email,
      password: "password123",
    });

    assert.equal(response.status, 400);
    assert.equal(await prisma.user.findUnique({ where: { email } }), null);
  });

  it("rejects a short password and does not create a user", async () => {
    const email = uniqueEmail("short-password");
    const response = await register({
      email,
      password: "1234567",
    });

    assert.equal(response.status, 400);
    assert.equal(await prisma.user.findUnique({ where: { email } }), null);
  });

  it("rejects a duplicate email regardless of case", async () => {
    const email = uniqueEmail("duplicate");
    const firstResponse = await register({
      email,
      password: "password123",
    });
    trackEmail(email);

    assert.equal(firstResponse.status, 201);

    const secondResponse = await register({
      email: email.toUpperCase(),
      password: "password123",
    });

    assert.equal(secondResponse.status, 409);
  });
});
