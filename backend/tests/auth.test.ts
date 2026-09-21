import "dotenv/config";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, afterEach, before, describe, it } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { config } from "../src/config/index.js";
import { prisma } from "../src/config/prisma.js";

if (!config.jwtSecret) {
  config.jwtSecret = "test-jwt-secret";
}

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

async function login(body: unknown) {
  return fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createUser(email: string, password: string) {
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  trackEmail(email);
  return user;
}

function verifyAccessToken(token: string) {
  assert.ok(config.jwtSecret, "JWT_SECRET must be set");
  const payload = jwt.verify(token, config.jwtSecret);
  assert.equal(typeof payload, "object");
  assert.notEqual(payload, null);
  return payload as jwt.JwtPayload & { uuid?: unknown };
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

describe("POST /api/auth/register", () => {
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

describe("POST /api/auth/login", () => {
  it("logs in a user and omits password fields", async () => {
    const email = uniqueEmail("login-success");
    const password = "password123";
    const createdUser = await createUser(email, password);

    const response = await login({ email, password });
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(typeof body.token, "string");
    assert.equal(typeof body.user, "object");
    assert.notEqual(body.user, null);

    const user = body.user as Record<string, unknown>;
    assert.equal(user.uuid, createdUser.uuid);
    assert.equal(user.email, email);
    assert.equal("password" in body, false);
    assert.equal("passwordHash" in body, false);
    assert.equal("password" in user, false);
    assert.equal("passwordHash" in user, false);
  });

  it("issues a JWT with the user uuid and no extra identity claims", async () => {
    const email = uniqueEmail("login-jwt-uuid");
    const password = "password123";
    const createdUser = await createUser(email, password);

    const response = await login({ email, password });
    assert.equal(response.status, 200);

    const body = (await response.json()) as { token: string };
    const payload = verifyAccessToken(body.token);

    assert.equal(payload.uuid, createdUser.uuid);
    assert.equal("id" in payload, false);
    assert.equal("userId" in payload, false);
    assert.equal("email" in payload, false);
    assert.equal("password" in payload, false);
    assert.equal("passwordHash" in payload, false);
  });

  it("issues a JWT with expiration after issued-at", async () => {
    const email = uniqueEmail("login-jwt-exp");
    const password = "password123";
    await createUser(email, password);

    const response = await login({ email, password });
    assert.equal(response.status, 200);

    const body = (await response.json()) as { token: string };
    const payload = verifyAccessToken(body.token);

    assert.equal(typeof payload.iat, "number");
    assert.equal(typeof payload.exp, "number");
    assert.ok(payload.exp > payload.iat);
  });

  it("rejects an incorrect password", async () => {
    const email = uniqueEmail("login-wrong-password");
    await createUser(email, "password123");

    const response = await login({
      email,
      password: "wrong-password",
    });

    assert.equal(response.status, 401);

    const body = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(body, { error: "Invalid email or password" });
    assert.equal("token" in body, false);
  });

  it("rejects an unknown email", async () => {
    const email = uniqueEmail("login-unknown");

    const response = await login({
      email,
      password: "password123",
    });

    assert.equal(response.status, 401);

    const body = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(body, { error: "Invalid email or password" });
    assert.equal("token" in body, false);
  });

  it("returns the same error for a wrong password and an unknown email", async () => {
    const email = uniqueEmail("login-same-error");
    await createUser(email, "password123");

    const wrongPasswordResponse = await login({
      email,
      password: "wrong-password",
    });
    const unknownEmailResponse = await login({
      email: uniqueEmail("login-missing"),
      password: "password123",
    });

    assert.equal(wrongPasswordResponse.status, 401);
    assert.equal(unknownEmailResponse.status, 401);

    const wrongPasswordBody = (await wrongPasswordResponse.json()) as { error: string };
    const unknownEmailBody = (await unknownEmailResponse.json()) as { error: string };

    assert.equal(wrongPasswordBody.error, "Invalid email or password");
    assert.equal(unknownEmailBody.error, wrongPasswordBody.error);
  });

  it("rejects an invalid email", async () => {
    const response = await login({
      email: "not-an-email",
      password: "password123",
    });

    assert.equal(response.status, 400);
  });

  it("rejects a missing email", async () => {
    const response = await login({
      password: "password123",
    });

    assert.equal(response.status, 400);
  });

  it("rejects a missing password", async () => {
    const response = await login({
      email: "test@example.com",
    });

    assert.equal(response.status, 400);
  });

  it("rejects an empty password", async () => {
    const response = await login({
      email: "test@example.com",
      password: "",
    });

    assert.equal(response.status, 400);
  });

  it("accepts a login email with a different case", async () => {
    const email = uniqueEmail("login-case");
    const password = "password123";
    await createUser(email, password);

    const response = await login({
      email: email.toUpperCase(),
      password,
    });

    assert.equal(response.status, 200);

    const body = (await response.json()) as { user: { email: string } };
    assert.equal(body.user.email, email);
  });
});
