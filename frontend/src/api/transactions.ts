import { api } from "./client";
import type { Transaction } from "../types/transaction";

export function getTransactions() {
  return api.get<Transaction[]>("/api/transactions");
}
