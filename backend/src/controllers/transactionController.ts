import type { NextFunction, Request, Response } from "express";
import { createTransaction } from "../services/transactionService.js";
import { parseCreateTransactionBody } from "../validators/transactionValidator.js";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = parseCreateTransactionBody(req.body);
    const transaction = await createTransaction({
      userUuid: req.user.uuid,
      ...body,
    });
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
}
