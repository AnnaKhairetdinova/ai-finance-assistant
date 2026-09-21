import { TransactionCategory, TransactionType } from "@prisma/client";
import { z } from "zod";

const amountSchema = z
  .string({ error: "Amount is required" })
  .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount")
  .refine((value) => Number(value) > 0, "Amount must be greater than 0");

const transactionDateSchema = z
  .union([z.iso.date(), z.iso.datetime()], { error: "Invalid transaction date" })
  .transform((value) => new Date(value));

export const createTransactionSchema = z.object({
  type: z.enum(TransactionType, { error: "Invalid transaction type" }),
  amount: amountSchema,
  category: z.enum(TransactionCategory, { error: "Invalid category" }),
  description: z
    .string({ error: "Description is required" })
    .trim()
    .min(1, "Description is required"),
  transactionDate: transactionDateSchema,
});

export function parseCreateTransactionBody(body: unknown) {
  return createTransactionSchema.parse(body);
}

export function parseTransactionUuid(uuid: unknown) {
  return z.uuid({ error: "Invalid transaction UUID" }).parse(uuid);
}
