import type { Transaction } from "../../types/transaction";
import { TransactionItem } from "./TransactionItem";

type TransactionListProps = {
  transactions: Transaction[];
};

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <ul className="transaction-list">
      {transactions.map((transaction) => (
        <TransactionItem key={transaction.uuid} transaction={transaction} />
      ))}
    </ul>
  );
}
