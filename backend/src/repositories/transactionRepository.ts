import type { CreateTransactionInput, UpdateTransactionInput } from "../types/transaction.js";
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

  async updateByUuidAndUserUuid(
    transactionUuid: string,
    userUuid: string,
    data: UpdateTransactionInput,
  ) {
    const result = await prisma.transaction.updateMany({
      where: {
        uuid: transactionUuid,
        userUuid,
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return prisma.transaction.findFirst({
      where: {
        uuid: transactionUuid,
        userUuid,
      },
      select: publicTransactionSelect,
    });
  },

  async deleteByUuidAndUserUuid(transactionUuid: string, userUuid: string) {
    const result = await prisma.transaction.deleteMany({
      where: {
        uuid: transactionUuid,
        userUuid,
      },
    });

    return result.count;
  },

  async getStatsByUserUuid(userUuid: string, from: Date, to: Date) {
    const periodFilter = {
      userUuid,
      transactionDate: {
        gte: from,
        lte: to,
      },
    };

    const [totals, byCategory] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["type"],
        where: periodFilter,
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: {
          ...periodFilter,
          type: "expense",
        },
        _sum: { amount: true },
        orderBy: [{ _sum: { amount: "desc" } }, { category: "asc" }],
      }),
    ]);

    return { totals, byCategory };
  },
};
