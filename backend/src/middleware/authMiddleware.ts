import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { HttpError } from "../utils/httpError.js";

function unauthorized(): never {
  throw new HttpError(401, "Unauthorized");
}

function readAccessToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader) {
    unauthorized();
  }

  const [scheme, token, extra] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token || extra !== undefined) {
    unauthorized();
  }

  return token;
}

function readUserUuid(token: string): string {
  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is not set");
  }

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    unauthorized();
  }

  if (typeof payload !== "object" || payload === null || typeof payload.uuid !== "string") {
    unauthorized();
  }

  return payload.uuid;
}

export const authMiddleware: RequestHandler = (req, _res, next) => {
  try {
    const token = readAccessToken(req.headers.authorization);
    req.user = { uuid: readUserUuid(token) };
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    if (!config.jwtSecret) {
      next(error);
      return;
    }

    next(new HttpError(401, "Unauthorized"));
  }
};
