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
