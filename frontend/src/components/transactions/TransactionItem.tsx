import type { Transaction } from "../../types/transaction";
import { formatTransactionAmount, formatTransactionDate } from "../../utils/transactionFormat";

type TransactionItemProps = {
  transaction: Transaction;
};

export function TransactionItem({ transaction }: TransactionItemProps) {
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
    </li>
  );
}
