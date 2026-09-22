import { useEffect, useState } from "react";
import { getTransactions } from "../api/transactions";
import { TransactionList } from "../components/transactions/TransactionList";
import type { Transaction } from "../types/transaction";

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
      <h1>Транзакции</h1>

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
