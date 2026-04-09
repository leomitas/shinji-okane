import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { categoryConfig } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    if (!prompt)
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY || ""

    // URL utilizando a API v1 estável e o modelo gemini-2.5-flash
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const allowedCategories = Object.keys(categoryConfig)

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Analise o texto da despesa e extraia as informações em JSON.
              - Se for uma nova compra parcelada (ex: "TV em 10x de R$300"), defina "isInstallment": true, "totalInstallments": 10, "amount" (valor da parcela): 300, e "currentInstallment": 1.
              - Se for uma compra parcelada já em andamento (ex: "passagem 4/10 R$150"), defina "isInstallment": true, "currentInstallment": 4, "totalInstallments": 10, e "amount" (valor da parcela): 150.
              - Se for uma despesa recorrente (ex: "assinatura Netflix R$55"), defina "isRecurring": true, e "amount" com o valor mensal. Use a categoria "Assinaturas" para este tipo.
              - Se não for nenhum dos dois, "isInstallment" e "isRecurring" devem ser false, e "amount" o valor total.
              - Categorias permitidas: ${allowedCategories.join(
                ", ",
              )}. Texto: "${prompt}"`,
            },
          ],
        },
      ],
      // CORREÇÃO FINAL: Revertido para camelCase (padrão esperado pela API REST v1)
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            description: { type: "STRING" },
            amount: { type: "NUMBER" },
            category: { type: "STRING", enum: allowedCategories },
            isInstallment: { type: "BOOLEAN" },
            currentInstallment: { type: "NUMBER" },
            totalInstallments: { type: "NUMBER" },
            isRecurring: { type: "BOOLEAN" },
          },
          required: ["description", "amount", "category"],
        },
      },
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const result = await response.json()
    const aiResult = JSON.parse(
      result.candidates?.[0]?.content?.parts?.[0]?.text,
    )
    if (!aiResult) throw new Error("Resposta inválida da IA.")

    const purchaseId = crypto.randomUUID()
    const recurringId = crypto.randomUUID()
    const newTransactionsData = []

    if (aiResult.isInstallment && aiResult.totalInstallments > 0) {
      const startingInstallment = aiResult.currentInstallment || 1
      for (let i = startingInstallment; i <= aiResult.totalInstallments; i++) {
        const transactionDate = new Date()
        transactionDate.setMonth(
          transactionDate.getMonth() + (i - startingInstallment),
        )
        newTransactionsData.push({
          ...aiResult,
          amount: aiResult.amount,
          transactionDate,
          installmentNumber: i,
          purchaseId,
          isRecurring: false,
        })
      }
    } else if (aiResult.isRecurring) {
      for (let i = 0; i < 12; i++) {
        const transactionDate = new Date()
        transactionDate.setMonth(transactionDate.getMonth() + i)
        newTransactionsData.push({
          ...aiResult,
          transactionDate,
          recurringId,
          isInstallment: false,
        })
      }
    } else {
      newTransactionsData.push({
        ...aiResult,
        transactionDate: new Date(),
        isInstallment: false,
        isRecurring: false,
      })
    }

    const transactionsToCreate = newTransactionsData.map((t) => ({
      description: t.description,
      amount: t.amount,
      category: t.category,
      transactionDate: t.transactionDate,
      isInstallment: !!t.isInstallment,
      installmentNumber: t.installmentNumber,
      totalInstallments: t.totalInstallments,
      purchaseId: t.purchaseId,
      isRecurring: !!t.isRecurring,
      recurringId: t.recurringId,
    }))

    await prisma.transaction.createMany({
      data: transactionsToCreate,
    })

    return NextResponse.json({
      success: true,
      message: "Transações criadas com sucesso!",
    })
  } catch (error) {
    console.error("Erro na rota /api/analyze:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Erro interno no servidor."
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
