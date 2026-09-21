import type { NextFunction, Request, Response } from "express";
import { loginUser, registerUser } from "../services/authService.js";
import { parseLoginBody } from "../validators/loginValidator.js";
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

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = parseLoginBody(req.body);
    const result = await loginUser(body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
