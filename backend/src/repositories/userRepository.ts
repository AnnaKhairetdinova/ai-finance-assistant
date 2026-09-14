import { prisma } from "../config/prisma.js";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  create(data: { email: string; passwordHash: string }) {
    return prisma.user.create({
      data,
      select: {
        uuid: true,
        email: true,
      },
    });
  },
};
