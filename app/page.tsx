import ExpenseTracker from "@/components/expense-tracker";

export default function HomePage() {
  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans">
      <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Analista de Despesas com IA
          </h1>
          <p className="text-gray-600 mt-2">
            Controle as suas despesas e preveja as suas faturas futuras!
          </p>
        </header>
        <ExpenseTracker />
      </div>
    </div>
  );
}
