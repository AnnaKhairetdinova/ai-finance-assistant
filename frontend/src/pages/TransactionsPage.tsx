import { useEffect, useState } from "react";
import { getTransactions } from "../api/transactions";
import { TransactionForm } from "../components/transactions/TransactionForm";
import { TransactionList } from "../components/transactions/TransactionList";
import type { Transaction } from "../types/transaction";

function insertCreatedTransaction(transactions: Transaction[], created: Transaction) {
  return [...transactions, created].sort((left, right) => {
    if (left.transactionDate !== right.transactionDate) {
      return left.transactionDate < right.transactionDate ? 1 : -1;
    }

    return left.createdAt < right.createdAt ? 1 : -1;
  });
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadTransactions() {
      setIsLoading(true);
      setError("");

      try {
        const result = await getTransactions();
        if (isActive) {
          setTransactions(result);
        }
      } catch {
        if (isActive) {
          setError("Не удалось загрузить транзакции. Попробуйте позже.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="transactions-page">
      <div className="transactions-page__header">
        <h1>Транзакции</h1>
        <button type="button" onClick={() => setIsFormOpen((open) => !open)}>
          {isFormOpen ? "Скрыть форму" : "Добавить транзакцию"}
        </button>
      </div>

      {isFormOpen ? (
        <TransactionForm
          onCreated={(created) => {
            setTransactions((current) => insertCreatedTransaction(current, created));
          }}
        />
      ) : null}

      {isLoading ? <p className="page-status">Загрузка транзакций...</p> : null}

      {!isLoading && error ? (
        <p className="page-status page-status--error" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && transactions.length === 0 ? (
        <p className="page-status">У вас пока нет транзакций.</p>
      ) : null}

      {!isLoading && !error && transactions.length > 0 ? (
        <TransactionList transactions={transactions} />
      ) : null}
    </main>
  );
}
