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