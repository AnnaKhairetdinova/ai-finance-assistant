import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { deleteTransaction, getTransactions } from "../api/transactions";
import { TransactionForm } from "../components/transactions/TransactionForm";
import { TransactionList } from "../components/transactions/TransactionList";
import type { Transaction } from "../types/transaction";

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((left, right) => {
    if (left.transactionDate !== right.transactionDate) {
      return left.transactionDate < right.transactionDate ? 1 : -1;
    }

    return left.createdAt < right.createdAt ? 1 : -1;
  });
}

function getDeleteErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 400 && error.message.trim()) {
    return error.message;
  }

  return "Не удалось удалить транзакцию. Попробуйте ещё раз.";
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [deletingUuid, setDeletingUuid] = useState<string | null>(null);

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

  async function handleDelete(uuid: string) {
    if (deletingUuid) {
      return;
    }

    const confirmed = window.confirm("Удалить эту транзакцию?");
    if (!confirmed) {
      return;
    }

    setActionError("");
    setNotice("");
    setDeletingUuid(uuid);

    try {
      await deleteTransaction(uuid);
      setTransactions((current) => current.filter((transaction) => transaction.uuid !== uuid));
      if (editingUuid === uuid) {
        setEditingUuid(null);
      }
      setNotice("Транзакция удалена.");
    } catch (requestError) {
      setActionError(getDeleteErrorMessage(requestError));
    } finally {
      setDeletingUuid(null);
    }
  }

  return (
    <main className="transactions-page">
      <div className="transactions-page__header">
        <h1>Транзакции</h1>
        <button type="button" onClick={() => setIsCreateFormOpen((open) => !open)}>
          {isCreateFormOpen ? "Скрыть форму" : "Добавить транзакцию"}
        </button>
      </div>

      {notice ? (
        <p className="form-success" role="status">
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p className="page-status page-status--error" role="alert">
          {actionError}
        </p>
      ) : null}

      {isCreateFormOpen ? (
        <TransactionForm
          onSuccess={(created) => {
            setTransactions((current) => sortTransactions([...current, created]));
            setNotice("");
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
        <TransactionList
          transactions={transactions}
          editingUuid={editingUuid}
          deletingUuid={deletingUuid}
          onEdit={(uuid) => {
            setActionError("");
            setNotice("");
            setEditingUuid(uuid);
          }}
          onCancelEdit={() => setEditingUuid(null)}
          onUpdated={(updated) => {
            setTransactions((current) =>
              sortTransactions(
                current.map((transaction) =>
                  transaction.uuid === updated.uuid ? updated : transaction,
                ),
              ),
            );
            setEditingUuid(null);
            setActionError("");
            setNotice("Транзакция сохранена.");
          }}
          onDelete={handleDelete}
        />
      ) : null}
    </main>
  );
}
