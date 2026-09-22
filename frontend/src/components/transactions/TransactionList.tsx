import type { Transaction } from "../../types/transaction";
import { TransactionItem } from "./TransactionItem";

type TransactionListProps = {
  transactions: Transaction[];
  editingUuid: string | null;
  deletingUuid: string | null;
  onEdit: (uuid: string) => void;
  onCancelEdit: () => void;
  onUpdated: (transaction: Transaction) => void;
  onDelete: (uuid: string) => void;
};

export function TransactionList({
  transactions,
  editingUuid,
  deletingUuid,
  onEdit,
  onCancelEdit,
  onUpdated,
  onDelete,
}: TransactionListProps) {
  return (
    <ul className="transaction-list">
      {transactions.map((transaction) => (
        <TransactionItem
          key={transaction.uuid}
          transaction={transaction}
          isEditing={editingUuid === transaction.uuid}
          isDeleting={deletingUuid === transaction.uuid}
          onEdit={() => onEdit(transaction.uuid)}
          onCancelEdit={onCancelEdit}
          onUpdated={onUpdated}
          onDelete={() => onDelete(transaction.uuid)}
        />
      ))}
    </ul>
  );
}
