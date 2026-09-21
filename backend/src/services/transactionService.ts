import { transactionRepository } from "../repositories/transactionRepository.js";
import type { CreateTransactionInput, TransactionResponse } from "../types/transaction.js";

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
