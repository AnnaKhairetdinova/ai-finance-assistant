import type { TransactionCategory } from "../types/transaction";

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  food: "Еда",
  transport: "Транспорт",
  shopping: "Покупки",
  entertainment: "Развлечения",
  health: "Здоровье",
  subscriptions: "Подписки",
  housing: "Жильё",
  education: "Образование",
  other: "Другое",
};

export function getCategoryLabel(category: TransactionCategory) {
  return CATEGORY_LABELS[category] ?? category;
}
