"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Transaction, Category, categoryConfig } from "@/lib/types";

ChartJS.register(ArcElement, Tooltip, Legend);

// --- Componentes filhos ---
const ExpenseItem: React.FC<{
  transaction: Transaction;
  onDelete: (transaction: Transaction) => void;
}> = ({ transaction, onDelete }) => {
  const config =
    categoryConfig[transaction.category as Category] ||
    categoryConfig["Outros"];
  return (
    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border animate-[fadeIn_0.3s_ease-out_forwards]">
      <div className="flex items-center gap-3">
        <span className="text-2xl">
          {transaction.isRecurring ? "🔄" : config.icon}
        </span>
        <div>
          <p className="font-semibold">
            {transaction.description}
            {transaction.isInstallment && (
              <span className="text-xs text-gray-500 ml-1">
                ({transaction.installmentNumber}/{transaction.totalInstallments}
                )
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium text-white px-2 py-0.5 rounded-full"
              style={{ backgroundColor: config.color }}
            >
              {transaction.category}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(transaction.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-bold text-lg">
          {transaction.amount.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        <button
          onClick={() => onDelete(transaction)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

const Summary: React.FC<{ transactions: Transaction[] }> = ({
  transactions,
}) => {
  const total = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const chartData = useMemo(() => {
    const categoryTotals = transactions.reduce((acc, t) => {
      acc[t.category as Category] =
        (acc[t.category as Category] || 0) + t.amount;
      return acc;
    }, {} as Record<Category, number>);
    const labels = Object.keys(categoryTotals) as Category[];
    const data = Object.values(categoryTotals);
    const backgroundColor = labels.map((label) => categoryConfig[label].color);
    return {
      labels,
      datasets: [
        { data, backgroundColor, borderColor: "#ffffff", borderWidth: 2 },
      ],
    };
  }, [transactions]);
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { font: { family: "Inter" } },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(context.parsed);
            }
            return label;
          },
        },
      },
    },
  };
  return (
    <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-lg h-fit">
      <h2 className="text-xl font-semibold mb-4 text-center">Resumo do Mês</h2>
      <div className="relative w-full h-64 sm:h-72 mx-auto">
        {transactions.length > 0 ? (
          <Doughnut data={chartData} options={chartOptions} />
        ) : (
          <p className="text-center text-gray-500 pt-24">
            Nenhuma despesa neste mês.
          </p>
        )}
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-semibold">Total do Mês:</h3>
        <p className="text-2xl font-bold text-indigo-600">
          {total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DE CLIENTE ---
export default function ExpenseTracker() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewedDate, setViewedDate] = useState(new Date());
  const [inputValue, setInputValue] = useState("");

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        // Tratamento de erro robusto
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errData = await response.json();
          throw new Error(errData.error || "Falha ao buscar dados.");
        } else {
          throw new Error(
            `Erro no servidor (código: ${response.status}). Verifique o console do terminal.`
          );
        }
      }
      const data: Transaction[] = await response.json();
      setAllTransactions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleAddExpense = async () => {
    if (!inputValue.trim()) return;
    setIsMutating(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: inputValue }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Ocorreu um erro ao adicionar.");
      }
      setInputValue("");
      await fetchTransactions();
    } catch (error: any) {
      setError(error.message || "Não consegui entender o gasto.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteExpense = async (transactionToDelete: Transaction) => {
    setError(null);
    try {
      await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionToDelete),
      });
      await fetchTransactions();
    } catch (err) {
      setError("Falha ao deletar transação.");
    }
  };

  const changeMonth = (amount: number) => {
    setViewedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const transactionsForMonth = useMemo(
    () =>
      allTransactions.filter((t) => {
        const tDate = new Date(t.transactionDate);
        return (
          tDate.getMonth() === viewedDate.getMonth() &&
          tDate.getFullYear() === viewedDate.getFullYear()
        );
      }),
    [allTransactions, viewedDate]
  );

  return (
    <main className="grid grid-cols-1 md:grid-cols-5 gap-8">
      <div className="md:col-span-3 bg-white p-6 rounded-2xl shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddExpense();
          }}
          className="mb-6"
        >
          <label
            htmlFor="expense-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Adicionar nova despesa:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              id="expense-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ex: Passagem de avião 4/6 R$ 250"
              className="flex-grow w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              disabled={isMutating}
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              style={{ minWidth: 100 }}
              disabled={isMutating}
            >
              {isMutating ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <span>Adicionar</span>
              )}
            </button>
          </div>
        </form>

        <div>
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 transition cursor-pointer"
            >
              &lt;
            </button>
            <h2 className="text-xl font-semibold text-center">
              {viewedDate.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              onClick={() => changeMonth(1)}
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 transition cursor-pointer"
            >
              &gt;
            </button>
          </div>
          <div className="space-y-3 min-h-[100px]">
            {isLoading ? (
              <p className="text-center text-gray-500 pt-8">
                Carregando transações...
              </p>
            ) : error ? (
              <p className="text-center text-red-500 pt-8">{error}</p>
            ) : transactionsForMonth.length > 0 ? (
              transactionsForMonth.map((t) => (
                <ExpenseItem
                  key={t.id}
                  transaction={t}
                  onDelete={handleDeleteExpense}
                />
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                Nenhuma transação neste mês.
              </p>
            )}
          </div>
        </div>
      </div>
      <Summary transactions={transactionsForMonth} />
    </main>
  );
}
