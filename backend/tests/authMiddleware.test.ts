import "dotenv/config";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import jwt, { type SignOptions } from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret";
}

const { default: app } = await import("../src/app.js");
const { config } = await import("../src/config/index.js");
const { authMiddleware } = await import("../src/middleware/authMiddleware.js");
const { errorHandler } = await import("../src/middleware/errorHandler.js");

app.get("/api/test-protected", authMiddleware, (req, res) => {
  res.status(200).json({
    uuid: req.user.uuid,
  });
});
app.use(errorHandler);

const unauthorizedBody = { error: "Unauthorized" } as const;
const signOptions: SignOptions = { expiresIn: "1h" };

function requireJwtSecret() {
  assert.ok(config.jwtSecret, "JWT_SECRET must be set");
  return config.jwtSecret;
}

function signToken(payload: object, secret = requireJwtSecret(), options: SignOptions = signOptions) {
  return jwt.sign(payload, secret, options);
}

async function getProtected(authorization?: string) {
  const headers: Record<string, string> = {};
  if (authorization !== undefined) {
    headers.Authorization = authorization;
  }

  return fetch(`http://127.0.0.1:${port}/api/test-protected`, { headers });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

let server: Server;
let port: number;

describe("authMiddleware", () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        port = (server.address() as AddressInfo).port;
        resolve();
      });
    });
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
  });

  it("rejects a request without Authorization", async () => {
    const response = await getProtected();

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), unauthorizedBody);
  });

  it("rejects a Basic Authorization scheme", async () => {
    const response = await getProtected("Basic abc");

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), unauthorizedBody);
  });

  it("rejects a malformed Authorization header", async () => {
    const response = await getProtected("abc");

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), unauthorizedBody);
  });

  it("rejects Bearer without a token", async () => {
    const response = await getProtected("Bearer");

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), unauthorizedBody);
  });

  it("rejects a JWT with an invalid signature", async () => {
    const token = signToken({ uuid: "test-user-uuid" }, "wrong-secret");
    const response = await getProtected(`Bearer ${token}`);

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), unauthorizedBody);
  });

  it("rejects an expired JWT", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      { uuid: "test-user-uuid", iat: now - 60, exp: now - 10 },
      requireJwtSecret(),
    );
    const response = await getProtected(`Bearer ${token}`);

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), unauthorizedBody);
  });

  it("rejects a JWT without uuid", async () => {
    const token = signToken({});
    const response = await getProtected(`Bearer ${token}`);

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), unauthorizedBody);
  });

  it("rejects a JWT with a non-string uuid", async () => {
    const token = signToken({ uuid: 123 });
    const response = await getProtected(`Bearer ${token}`);

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), unauthorizedBody);
  });

  it("allows a valid JWT and exposes req.user.uuid", async () => {
    const token = signToken({ uuid: "test-user-uuid" });
    const response = await getProtected(`Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.deepEqual(await readJson(response), { uuid: "test-user-uuid" });
  });

  it("returns the same Unauthorized body for JWT failures", async () => {
    const now = Math.floor(Date.now() / 1000);
    const secret = requireJwtSecret();
    const cases = [
      `Bearer ${signToken({ uuid: "test-user-uuid" }, "wrong-secret")}`,
      `Bearer ${jwt.sign({ uuid: "test-user-uuid", iat: now - 60, exp: now - 10 }, secret)}`,
      "Bearer not-a-jwt",
      `Bearer ${signToken({})}`,
    ];

    for (const authorization of cases) {
      const response = await getProtected(authorization);
      const body = await readJson(response);

      assert.equal(response.status, 401);
      assert.deepEqual(body, unauthorizedBody);
      assert.equal(typeof body.error, "string");
      assert.doesNotMatch(String(body.error), /invalid signature|jwt expired|jwt malformed|uuid/i);
    }
  });
});
