import type { CreateTransactionInput } from "../types/transaction.js";
import { prisma } from "../config/prisma.js";

const publicTransactionSelect = {
  uuid: true,
  type: true,
  amount: true,
  category: true,
  description: true,
  transactionDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const transactionRepository = {
  create(data: CreateTransactionInput) {
    return prisma.transaction.create({
      data: {
        userUuid: data.userUuid,
        type: data.type,
        amount: data.amount,
        category: data.category,
        description: data.description,
        transactionDate: data.transactionDate,
      },
      select: publicTransactionSelect,
    });
  },

  findManyByUserUuid(userUuid: string) {
    return prisma.transaction.findMany({
      where: { userUuid },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      select: publicTransactionSelect,
    });
  },

  findByUuidAndUserUuid(transactionUuid: string, userUuid: string) {
    return prisma.transaction.findFirst({
      where: {
        uuid: transactionUuid,
        userUuid,
      },
      select: publicTransactionSelect,
    });
  },
};
