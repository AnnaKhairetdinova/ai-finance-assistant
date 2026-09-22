import type { TransactionCategory, TransactionType } from "@prisma/client";

export type CreateTransactionInput = {
  userUuid: string;
  type: TransactionType;
  amount: string;
  category: TransactionCategory;
  description: string;
  transactionDate: Date;
};

export type UpdateTransactionInput = {
  type?: TransactionType;
  amount?: string;
  category?: TransactionCategory;
  description?: string;
  transactionDate?: Date;
};

export type TransactionResponse = {
  uuid: string;
  type: TransactionType;
  amount: string;
  category: TransactionCategory;
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionStatsQuery = {
  from: string;
  to: string;
};

export type TransactionStatsResponse = {
  period: TransactionStatsQuery;
  income: string;
  expense: string;
  balance: string;
  byCategory: Array<{
    category: TransactionCategory;
    amount: string;
  }>;
};
