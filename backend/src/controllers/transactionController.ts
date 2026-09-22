import type { NextFunction, Request, Response } from "express";
import {
  createTransaction,
  deleteTransaction,
  getTransactionByUuid,
  getTransactionStats,
  listUserTransactions,
  updateTransaction,
} from "../services/transactionService.js";
import {
  parseCreateTransactionBody,
  parseTransactionStatsQuery,
  parseTransactionUuid,
  parseUpdateTransactionBody,
} from "../validators/transactionValidator.js";

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

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const transactions = await listUserTransactions(req.user.uuid);
    res.status(200).json(transactions);
  } catch (error) {
    next(error);
  }
}

export async function getByUuid(req: Request, res: Response, next: NextFunction) {
  try {
    const transactionUuid = parseTransactionUuid(req.params.uuid);
    const transaction = await getTransactionByUuid(transactionUuid, req.user.uuid);
    res.status(200).json(transaction);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const transactionUuid = parseTransactionUuid(req.params.uuid);
    const body = parseUpdateTransactionBody(req.body);
    const transaction = await updateTransaction(transactionUuid, req.user.uuid, body);
    res.status(200).json(transaction);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const transactionUuid = parseTransactionUuid(req.params.uuid);
    await deleteTransaction(transactionUuid, req.user.uuid);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const period = parseTransactionStatsQuery(req.query);
    const stats = await getTransactionStats(req.user.uuid, period);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
}
