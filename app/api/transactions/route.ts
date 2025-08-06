import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Transaction } from "@prisma/client";

// GET: Busca todas as transações
export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dados." },
      { status: 500 }
    );
  }
}

// DELETE: Deleta transações
export async function DELETE(request: NextRequest) {
  try {
    const transactionToDelete: Transaction = await request.json();

    if (transactionToDelete.isInstallment && transactionToDelete.purchaseId) {
      await prisma.transaction.deleteMany({
        where: { purchaseId: transactionToDelete.purchaseId },
      });
    } else if (
      transactionToDelete.isRecurring &&
      transactionToDelete.recurringId
    ) {
      await prisma.transaction.deleteMany({
        where: { recurringId: transactionToDelete.recurringId },
      });
    } else {
      await prisma.transaction.delete({
        where: { id: transactionToDelete.id },
      });
    }

    return NextResponse.json({ success: true, message: "Transação deletada." });
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    return NextResponse.json(
      { error: "Erro ao deletar transação." },
      { status: 500 }
    );
  }
}
