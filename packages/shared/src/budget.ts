export const BUDGET_CATEGORIES = [
  { label: "Rent / Mortgage", bucket: "needs" },
  { label: "Groceries", bucket: "needs" },
  { label: "Utilities", bucket: "needs" },
  { label: "Insurance", bucket: "needs" },
  { label: "Gas / Transport", bucket: "needs" },
  { label: "Childcare", bucket: "needs" },
  { label: "Medical", bucket: "needs" },
  { label: "Dining Out", bucket: "wants" },
  { label: "Entertainment", bucket: "wants" },
  { label: "Subscriptions", bucket: "wants" },
  { label: "Shopping", bucket: "wants" },
  { label: "Date Night", bucket: "wants" },
  { label: "Personal Care", bucket: "wants" },
  { label: "Emergency Fund", bucket: "savings" },
  { label: "Investments", bucket: "savings" },
  { label: "Debt Payoff", bucket: "savings" },
  { label: "Kids College", bucket: "savings" },
] as const;

export type BudgetBucket = "needs" | "wants" | "savings";
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];
