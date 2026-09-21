import { transactionRepository } from "../repositories/transactionRepository.js";
import type {
  CreateTransactionInput,
  TransactionResponse,
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
