import { api } from "./client";
import type { CreateTransactionInput, Transaction } from "../types/transaction";

export function getTransactions() {
  return api.get<Transaction[]>("/api/transactions");
}

export function createTransaction(input: CreateTransactionInput) {
  return api.post<Transaction>("/api/transactions", input);
}

export function updateTransaction(uuid: string, input: CreateTransactionInput) {
  return api.patch<Transaction>(`/api/transactions/${uuid}`, input);
}

export function deleteTransaction(uuid: string) {
  return api.delete(`/api/transactions/${uuid}`);
}
