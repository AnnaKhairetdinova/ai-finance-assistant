import type { CreateTransactionInput } from "../types/transaction.js";
import { prisma } from "../config/prisma.js";

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
      select: {
        uuid: true,
        type: true,
        amount: true,
        category: true,
        description: true,
        transactionDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  findManyByUserUuid(userUuid: string) {
    return prisma.transaction.findMany({
      where: { userUuid },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      select: {
        uuid: true,
        type: true,
        amount: true,
        category: true,
        description: true,
        transactionDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
};
