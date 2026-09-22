import { api } from "./client";
import type { CreateTransactionInput, Transaction } from "../types/transaction";

export function getTransactions() {
  return api.get<Transaction[]>("/api/transactions");
}

export function createTransaction(input: CreateTransactionInput) {
  return api.post<Transaction>("/api/transactions", input);
}
