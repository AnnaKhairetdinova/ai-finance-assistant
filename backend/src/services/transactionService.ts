import { Prisma } from "@prisma/client";
import { transactionRepository } from "../repositories/transactionRepository.js";
import type {
  CreateTransactionInput,
  TransactionResponse,
  TransactionStatsQuery,
  TransactionStatsResponse,
  UpdateTransactionInput,
} from "../types/transaction.js";
import { HttpError } from "../utils/httpError.js";

function toTransactionResponse(
  transaction: Awaited<ReturnType<typeof transactionRepository.create>>,
): TransactionResponse {
  return {
    uuid: transaction.uuid,
    type: transaction.type,
    amount: transaction.amount.toFixed(2),
    category: transaction.category,
    description: transaction.description,
    transactionDate: transaction.transactionDate.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

function toMoneyString(value: Prisma.Decimal | null | undefined): string {
  return new Prisma.Decimal(value ?? 0).toFixed(2);
}

function startOfUtcDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function endOfUtcDay(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<TransactionResponse> {
  const transaction = await transactionRepository.create(input);
  return toTransactionResponse(transaction);
}

export async function listUserTransactions(userUuid: string): Promise<TransactionResponse[]> {
  const transactions = await transactionRepository.findManyByUserUuid(userUuid);
  return transactions.map(toTransactionResponse);
}

export async function getTransactionByUuid(
  transactionUuid: string,
  userUuid: string,
): Promise<TransactionResponse> {
  const transaction = await transactionRepository.findByUuidAndUserUuid(
    transactionUuid,
    userUuid,
  );

  if (!transaction) {
    throw new HttpError(404, "Transaction not found");
  }

  return toTransactionResponse(transaction);
}

export async function updateTransaction(
  transactionUuid: string,
  userUuid: string,
  data: UpdateTransactionInput,
): Promise<TransactionResponse> {
  const transaction = await transactionRepository.updateByUuidAndUserUuid(
    transactionUuid,
    userUuid,
    data,
  );

  if (!transaction) {
    throw new HttpError(404, "Transaction not found");
  }

  return toTransactionResponse(transaction);
}

export async function deleteTransaction(transactionUuid: string, userUuid: string): Promise<void> {
  const deletedCount = await transactionRepository.deleteByUuidAndUserUuid(
    transactionUuid,
    userUuid,
  );

  if (deletedCount === 0) {
    throw new HttpError(404, "Transaction not found");
  }
}

export async function getTransactionStats(
  userUuid: string,
  period: TransactionStatsQuery,
): Promise<TransactionStatsResponse> {
  const { totals, byCategory } = await transactionRepository.getStatsByUserUuid(
    userUuid,
    startOfUtcDay(period.from),
    endOfUtcDay(period.to),
  );

  const income = new Prisma.Decimal(
    totals.find((row) => row.type === "income")?._sum.amount ?? 0,
  );
  const expense = new Prisma.Decimal(
    totals.find((row) => row.type === "expense")?._sum.amount ?? 0,
  );

  return {
    period: {
      from: period.from,
      to: period.to,
    },
    income: toMoneyString(income),
    expense: toMoneyString(expense),
    balance: toMoneyString(income.minus(expense)),
    byCategory: byCategory.map((row) => ({
      category: row.category,
      amount: toMoneyString(row._sum.amount),
    })),
  };
}
