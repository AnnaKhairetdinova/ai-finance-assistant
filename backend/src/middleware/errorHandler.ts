import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Invalid request";
    res.status(400).json({ error: message });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    res.status(409).json({ error: "User with this email already exists" });
    return;
  }

  res.status(500).json({ error: "Internal Server Error" });
};
