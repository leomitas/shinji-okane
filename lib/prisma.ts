import { PrismaClient } from "@prisma/client";

// Previne múltiplas instâncias do Prisma Client em desenvolvimento
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
