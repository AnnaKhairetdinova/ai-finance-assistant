import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { getTransactionStats } from "../api/transactions";
import type { TransactionStats } from "../types/transaction";
import { getCategoryLabel } from "../utils/categoryLabels";
import { formatMoneyAmount } from "../utils/transactionFormat";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getCurrentMonthPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
}

function isZeroAmount(value: string) {
  return /^-?0+(?:\.0+)?$/.test(value);
}

function isEmptyStats(stats: TransactionStats) {
  return (
    isZeroAmount(stats.income) &&
    isZeroAmount(stats.expense) &&
    isZeroAmount(stats.balance) &&
    stats.byCategory.length === 0
  );
}

function getStatsErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 400 && error.message.trim()) {
    return error.message;
  }

  return "Не удалось загрузить статистику. Попробуйте позже.";
}

export function DashboardPage() {
  const initialPeriod = getCurrentMonthPeriod();
  const [from, setFrom] = useState(initialPeriod.from);
  const [to, setTo] = useState(initialPeriod.to);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats(periodFrom: string, periodTo: string) {
    setIsLoading(true);
    setError("");

    try {
      const result = await getTransactionStats(periodFrom, periodTo);
      setStats(result);
    } catch (requestError) {
      setError(getStatsErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStats(from, to);
    // Load current month once on mount.
  }, []);

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    if (!from || !to) {
      setError("Укажите начало и конец периода.");
      return;
    }

    if (from > to) {
      setError("Дата начала не может быть позже даты окончания.");
      return;
    }

    void loadStats(from, to);
  }

  return (
    <main className="dashboard-page">
      <h1>Главная</h1>

      <form className="dashboard-period" onSubmit={handleApply}>
        <label htmlFor="stats-from">С</label>
        <input
          id="stats-from"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <label htmlFor="stats-to">По</label>
        <input
          id="stats-to"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Загрузка..." : "Применить"}
        </button>
      </form>

      {error ? (
        <p className="page-status page-status--error" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading && !stats ? <p className="page-status">Загрузка статистики...</p> : null}

      {stats ? (
        <>
          <section className="dashboard-cards">
            <article className="dashboard-card">
              <h2>Доход</h2>
              <p>{formatMoneyAmount(stats.income)}</p>
            </article>
            <article className="dashboard-card dashboard-card--expense">
              <h2>Расход</h2>
              <p>{formatMoneyAmount(stats.expense)}</p>
            </article>
            <article className="dashboard-card dashboard-card--balance">
              <h2>Баланс</h2>
              <p>{formatMoneyAmount(stats.balance)}</p>
            </article>
          </section>

          {isEmptyStats(stats) ? (
            <p className="page-status">За выбранный период транзакций нет.</p>
          ) : (
            <section className="dashboard-categories">
              <h2>Расходы по категориям</h2>
              {stats.byCategory.length === 0 ? (
                <p className="page-status">Расходов за выбранный период нет.</p>
              ) : (
                <ul>
                  {stats.byCategory.map((item) => (
                    <li key={item.category}>
                      <span>{getCategoryLabel(item.category)}</span>
                      <span>{formatMoneyAmount(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}
