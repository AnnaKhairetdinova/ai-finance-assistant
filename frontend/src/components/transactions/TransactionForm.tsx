import { FormEvent, useState } from "react";
import { ApiError } from "../../api/client";
import { createTransaction, updateTransaction } from "../../api/transactions";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
  type CreateTransactionInput,
  type Transaction,
  type TransactionCategory,
  type TransactionType,
} from "../../types/transaction";
import { toDateInputValue } from "../../utils/transactionFormat";

type TransactionFormProps = {
  transaction?: Transaction;
  onSuccess: (transaction: Transaction) => void;
  onCancel?: () => void;
};

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInitialFormState(transaction?: Transaction): CreateTransactionInput {
  if (transaction) {
    return {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
      transactionDate: toDateInputValue(transaction.transactionDate),
    };
  }

  return {
    type: "expense",
    amount: "",
    category: "food",
    description: "",
    transactionDate: getLocalDateInputValue(),
  };
}

function isAllowedType(value: string): value is TransactionType {
  return TRANSACTION_TYPES.includes(value as TransactionType);
}

function isAllowedCategory(value: string): value is TransactionCategory {
  return TRANSACTION_CATEGORIES.includes(value as TransactionCategory);
}

function isPositiveDecimalAmount(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return false;
  }

  const [integerPart = "0", fractionPart = ""] = value.split(".");
  const significantInteger = integerPart.replace(/^0+/, "");
  const significantFraction = fractionPart.replace(/0+$/, "");

  return significantInteger !== "" || significantFraction !== "";
}

function getSubmitErrorMessage(error: unknown, isEditing: boolean) {
  if (error instanceof ApiError && error.status === 400 && error.message.trim()) {
    return error.message;
  }

  return isEditing
    ? "Не удалось сохранить транзакцию. Попробуйте ещё раз."
    : "Не удалось добавить транзакцию. Попробуйте ещё раз.";
}

export function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
  const isEditing = Boolean(transaction);
  const fieldId = transaction?.uuid ?? "new";
  const [form, setForm] = useState(() => getInitialFormState(transaction));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): string | null {
    if (!isAllowedType(form.type)) {
      return "Выберите тип транзакции.";
    }

    if (!form.amount.trim()) {
      return "Укажите сумму.";
    }

    if (!/^\d+(\.\d{1,2})?$/.test(form.amount.trim())) {
      return "Сумма должна быть больше 0 и содержать не больше двух знаков после точки.";
    }

    if (!isPositiveDecimalAmount(form.amount.trim())) {
      return "Сумма должна быть больше 0.";
    }

    if (!isAllowedCategory(form.category)) {
      return "Выберите категорию.";
    }

    if (!form.description.trim()) {
      return "Укажите описание.";
    }

    if (!form.transactionDate.trim()) {
      return "Укажите дату.";
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.transactionDate)) {
      return "Укажите корректную дату.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSuccess("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);

    const payload: CreateTransactionInput = {
      type: form.type,
      amount: form.amount.trim(),
      category: form.category,
      description: form.description.trim(),
      transactionDate: form.transactionDate,
    };

    try {
      const saved = transaction
        ? await updateTransaction(transaction.uuid, payload)
        : await createTransaction(payload);

      onSuccess(saved);

      if (!transaction) {
        setForm(getInitialFormState());
        setSuccess("Транзакция добавлена.");
      }
    } catch (requestError) {
      setError(getSubmitErrorMessage(requestError, isEditing));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="transaction-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEditing ? "Редактирование транзакции" : "Новая транзакция"}</h2>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}

      <fieldset className="transaction-form__type">
        <legend>Тип</legend>
        <label>
          <input
            type="radio"
            name={`${fieldId}-type`}
            value="expense"
            checked={form.type === "expense"}
            onChange={() => setForm((current) => ({ ...current, type: "expense" }))}
          />
          Расход
        </label>
        <label>
          <input
            type="radio"
            name={`${fieldId}-type`}
            value="income"
            checked={form.type === "income"}
            onChange={() => setForm((current) => ({ ...current, type: "income" }))}
          />
          Доход
        </label>
      </fieldset>

      <label htmlFor={`${fieldId}-amount`}>Сумма</label>
      <input
        id={`${fieldId}-amount`}
        name="amount"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={form.amount}
        onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
        required
      />

      <label htmlFor={`${fieldId}-category`}>Категория</label>
      <select
        id={`${fieldId}-category`}
        name="category"
        value={form.category}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            category: event.target.value as TransactionCategory,
          }))
        }
        required
      >
        {TRANSACTION_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <label htmlFor={`${fieldId}-description`}>Описание</label>
      <textarea
        id={`${fieldId}-description`}
        name="description"
        rows={3}
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({ ...current, description: event.target.value }))
        }
        required
      />

      <label htmlFor={`${fieldId}-transactionDate`}>Дата</label>
      <input
        id={`${fieldId}-transactionDate`}
        name="transactionDate"
        type="date"
        value={form.transactionDate}
        onChange={(event) =>
          setForm((current) => ({ ...current, transactionDate: event.target.value }))
        }
        required
      />

      <div className="transaction-form__actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Сохранение..." : "Добавление...") : isEditing ? "Сохранить" : "Добавить"}
        </button>
        {onCancel ? (
          <button type="button" className="button-secondary" onClick={onCancel} disabled={isSubmitting}>
            Отмена
          </button>
        ) : null}
      </div>
    </form>
  );
}
