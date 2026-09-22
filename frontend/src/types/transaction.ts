export type TransactionType = "income" | "expense";

export type TransactionCategory =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "health"
  | "subscriptions"
  | "housing"
  | "education"
  | "other";

export type Transaction = {
  uuid: string;
  type: TransactionType;
  amount: string;
  category: TransactionCategory;
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTransactionInput = {
  type: TransactionType;
  amount: string;
  category: TransactionCategory;
  description: string;
  transactionDate: string;
};

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  "food",
  "transport",
  "shopping",
  "entertainment",
  "health",
  "subscriptions",
  "housing",
  "education",
  "other",
];

export const TRANSACTION_TYPES: TransactionType[] = ["expense", "income"];

export type TransactionStatsPeriod = {
  from: string;
  to: string;
};

export type TransactionStatsCategory = {
  category: TransactionCategory;
  amount: string;
};

export type TransactionStats = {
  period: TransactionStatsPeriod;
  income: string;
  expense: string;
  balance: string;
  byCategory: TransactionStatsCategory[];
};
