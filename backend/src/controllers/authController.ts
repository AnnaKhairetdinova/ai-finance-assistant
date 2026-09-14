import type { NextFunction, Request, Response } from "express";
import { registerUser } from "../services/authService.js";
import { parseRegisterBody } from "../validators/registerValidator.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = parseRegisterBody(req.body);
    const user = await registerUser(body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}
