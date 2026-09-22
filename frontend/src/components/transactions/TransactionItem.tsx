import type { Transaction } from "../../types/transaction";
import { formatTransactionAmount, formatTransactionDate } from "../../utils/transactionFormat";
import { TransactionForm } from "./TransactionForm";

type TransactionItemProps = {
  transaction: Transaction;
  isEditing: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdated: (transaction: Transaction) => void;
  onDelete: () => void;
};

export function TransactionItem({
  transaction,
  isEditing,
  isDeleting,
  onEdit,
  onCancelEdit,
  onUpdated,
  onDelete,
}: TransactionItemProps) {
  if (isEditing) {
    return (
      <li className="transaction-item transaction-item--editing">
        <TransactionForm transaction={transaction} onSuccess={onUpdated} onCancel={onCancelEdit} />
      </li>
    );
  }

  return (
    <li className={`transaction-item transaction-item--${transaction.type}`}>
      <div className="transaction-item__main">
        <p className="transaction-item__description">{transaction.description}</p>
        <p className="transaction-item__meta">
          {transaction.category} · {formatTransactionDate(transaction.transactionDate)}
        </p>
      </div>
      <p className="transaction-item__amount">
        {formatTransactionAmount(transaction.amount, transaction.type)}
      </p>
      <div className="transaction-item__actions">
        <button type="button" className="button-secondary" onClick={onEdit} disabled={isDeleting}>
          Редактировать
        </button>
        <button type="button" className="button-danger" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? "Удаление..." : "Удалить"}
        </button>
      </div>
    </li>
  );
}
