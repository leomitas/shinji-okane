import { Transaction as PrismaTransaction } from "@prisma/client";

// Exportamos o tipo gerado pelo Prisma para garantir consistência
export type Transaction = PrismaTransaction;

export type Category =
  | "Alimentação"
  | "Transporte"
  | "Lazer"
  | "Moradia"
  | "Educação"
  | "Saúde"
  | "Compras"
  | "Outros";

export const categoryConfig: Record<Category, { color: string; icon: string }> =
  {
    Alimentação: { color: "#34D399", icon: "🍔" },
    Transporte: { color: "#60A5FA", icon: "🚗" },
    Lazer: { color: "#FBBF24", icon: "🎬" },
    Moradia: { color: "#F87171", icon: "🏠" },
    Educação: { color: "#818CF8", icon: "📚" },
    Saúde: { color: "#A78BFA", icon: "❤️" },
    Compras: { color: "#FB923C", icon: "🛒" },
    Outros: { color: "#A3A3A3", icon: "⚙️" },
  };
