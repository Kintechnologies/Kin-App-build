"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Plus,
  TrendingUp,
  Home,
  ShoppingBag,
  PiggyBank,
  X,
  AlertTriangle,
  DollarSign,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface Transaction {
  id: string;
  amount: number;
  category: string;
  bucket: "needs" | "wants" | "savings";
  description: string;
  date: string;
}

const bucketConfig = {
  needs: {
    label: "Needs",
    percent: 50,
    color: "text-blue",
    bg: "bg-blue/10",
    bgStrong: "bg-blue/20",
    barColor: "bg-blue",
    barTrack: "border-blue/30",
    gradientFrom: "from-blue/20",
    icon: Home,
    description: "Housing, groceries, utilities, insurance, transport",
  },
  wants: {
    label: "Wants",
    percent: 30,
    color: "text-purple",
    bg: "bg-purple/10",
    bgStrong: "bg-purple/20",
    barColor: "bg-purple",
    barTrack: "border-purple/30",
    gradientFrom: "from-purple/20",
    icon: ShoppingBag,
    description: "Dining out, entertainment, subscriptions, shopping",
  },
  savings: {
    label: "Savings",
    percent: 20,
    color: "text-primary",
    bg: "bg-primary/10",
    bgStrong: "bg-primary/20",
    barColor: "bg-primary",
    barTrack: "border-primary/30",
    gradientFrom: "from-primary/20",
    icon: PiggyBank,
    description: "Emergency fund, investments, debt payoff",
  },
};

const categoryOptions: { label: string; bucket: "needs" | "wants" | "savings" }[] = [
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
];

function BucketCard({
  bucket,
  spent,
  budgetAmount,
}: {
  bucket: "needs" | "wants" | "savings";
  spent: number;
  budgetAmount: number;
}) {
  const config = bucketConfig[bucket];
  const Icon = config.icon;
  const percentage = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
  const isOver = spent > budgetAmount && budgetAmount > 0;
  const isNear = percentage >= 85 && !isOver;

  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-br ${config.gradientFrom} to-surface-raised border border-warm-white/5 transition-all hover:border-warm-white/10`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${config.bgStrong} flex items-center justify-center`}>
            <Icon size={18} className={config.color} />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${config.color}`}>{config.label}</h3>
            <p className="text-warm-white/30 text-[11px]">{config.description}</p>
          </div>
        </div>
        {isOver && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose/15 border border-rose/20">
            <AlertTriangle size={12} className="text-rose" />
            <span className="text-rose text-[10px] font-semibold">Over</span>
          </div>
        )}
        {isNear && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber/15 border border-amber/20">
            <AlertTriangle size={12} className="text-amber" />
            <span className="text-amber text-[10px] font-semibold">85%+</span>
          </div>
        )}
      </div>

      {/* Progress bar with border */}
      <div className={`w-full rounded-full h-3 mb-3 border ${isOver ? "border-rose/30" : config.barTrack} bg-background/30 overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${isOver ? "bg-rose" : config.barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="flex justify-between items-baseline">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono text-lg font-bold ${isOver ? "text-rose" : config.color}`}>
            ${spent.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </span>
          <span className="text-warm-white/20 text-xs font-mono">
            / ${budgetAmount.toLocaleString()}
          </span>
        </div>
        <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-lg ${isOver ? "bg-rose/15 text-rose" : `${config.bg} ${config.color}`}`}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

function AddTransactionModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: Omit<Transaction, "id">) => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const selectedCategory = categoryOptions.find((c) => c.label === category);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !category || !selectedCategory) return;
    onAdd({
      amount: parseFloat(amount),
      category,
      bucket: selectedCategory.bucket,
      description,
      date,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-warm-white font-semibold text-lg">Add Transaction</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-warm-white/40">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount — large, prominent */}
          <div>
            <label className="block text-sm text-warm-white/70 mb-1.5">Amount</label>
            <div className="flex items-center bg-surface-raised rounded-2xl px-4 py-4 border border-warm-white/10 focus-within:border-primary/40 transition-all">
              <span className="text-warm-white/30 text-2xl font-mono mr-1">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  setAmount(v);
                }}
                autoFocus
                className="bg-transparent text-warm-white text-2xl font-mono font-bold flex-1 focus:outline-none placeholder:text-warm-white/15 [appearance:textfield]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-warm-white/70 mb-2">Category</label>
            <div className="space-y-3">
              {(["needs", "wants", "savings"] as const).map((bucket) => (
                <div key={bucket}>
                  <p className={`text-xs font-semibold mb-1.5 ${bucketConfig[bucket].color}`}>
                    {bucketConfig[bucket].label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categoryOptions
                      .filter((c) => c.bucket === bucket)
                      .map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => setCategory(c.label)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            category === c.label
                              ? `${bucketConfig[bucket].bgStrong} ${bucketConfig[bucket].color} scale-105`
                              : "bg-surface-raised text-warm-white/40 hover:text-warm-white/60"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Description (optional)"
            placeholder="What was it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Button type="submit" className="w-full" size="lg" disabled={!amount || !category}>
            Add Transaction
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: income } = await supabase
        .from("household_income")
        .select("monthly_income")
        .eq("profile_id", user.id)
        .single();
      if (income) {
        setMonthlyIncome(income.monthly_income);
        setIncomeInput(income.monthly_income.toString());
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { data: txns } = await supabase
        .from("transactions")
        .select("*")
        .eq("profile_id", user.id)
        .gte("date", monthStart)
        .order("date", { ascending: false });
      if (txns) setTransactions(txns as Transaction[]);
      setLoading(false);
    }
    load();
  }, []);

  const saveIncome = useCallback(async () => {
    const val = parseInt(incomeInput.replace(/,/g, "")) || 0;
    setMonthlyIncome(val);
    setEditingIncome(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("household_income").upsert({
        profile_id: user.id,
        monthly_income: val,
      });
    }
  }, [incomeInput]);

  const addTransaction = useCallback(async (t: Omit<Transaction, "id">) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("transactions")
      .insert({ ...t, profile_id: user.id })
      .select()
      .single();

    if (data) {
      setTransactions((prev) => [data as Transaction, ...prev]);
    }
  }, []);

  const bucketTotals = { needs: 0, wants: 0, savings: 0 };
  transactions.forEach((t) => {
    bucketTotals[t.bucket] += Number(t.amount);
  });

  const budgetAmounts = {
    needs: Math.round(monthlyIncome * 0.5),
    wants: Math.round(monthlyIncome * 0.3),
    savings: Math.round(monthlyIncome * 0.2),
  };

  const totalSpent = bucketTotals.needs + bucketTotals.wants + bucketTotals.savings;
  const remaining = monthlyIncome - totalSpent;
  const overallPercent = monthlyIncome > 0 ? Math.round((totalSpent / monthlyIncome) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-2xl bg-blue/20 flex items-center justify-center">
              <Wallet size={16} className="text-blue" />
            </div>
            <h1 className="font-serif italic text-2xl text-primary">Budget</h1>
          </div>
          <p className="text-warm-white/40 text-sm ml-10">
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-background hover:shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Income card */}
      <div className="bg-gradient-to-br from-amber/15 via-amber/8 to-surface-raised rounded-2xl p-5 mb-6 border border-amber/10">
        {editingIncome ? (
          <div>
            <p className="text-warm-white/50 text-xs mb-3">Monthly household income</p>
            <div className="flex items-center bg-background/50 rounded-2xl px-4 py-3 border border-amber/20 focus-within:border-amber/50 transition-all mb-3">
              <span className="text-amber/50 text-2xl font-mono mr-1">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && saveIncome()}
                autoFocus
                placeholder="0"
                className="bg-transparent text-amber text-2xl font-mono font-bold flex-1 focus:outline-none placeholder:text-amber/20 [appearance:textfield]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveIncome} size="md" className="flex-1">
                <Check size={16} className="mr-1.5" /> Save Income
              </Button>
              <Button variant="ghost" onClick={() => setEditingIncome(false)} size="md">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber/20 flex items-center justify-center">
                  <TrendingUp size={20} className="text-amber" />
                </div>
                <div>
                  <p className="text-warm-white/50 text-xs">Monthly household income</p>
                  <p className="text-amber font-mono text-2xl font-bold">
                    {monthlyIncome > 0 ? `$${monthlyIncome.toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setEditingIncome(true); setIncomeInput(monthlyIncome > 0 ? monthlyIncome.toString() : ""); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber/15 text-amber hover:bg-amber/25 transition-all"
              >
                {monthlyIncome > 0 ? "Edit" : "Set up"}
              </button>
            </div>

            {monthlyIncome > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-amber/10">
                {(["needs", "wants", "savings"] as const).map((bucket) => (
                  <div key={bucket} className={`text-center rounded-xl py-2 ${bucketConfig[bucket].bg}`}>
                    <p className={`text-sm font-bold font-mono ${bucketConfig[bucket].color}`}>
                      ${budgetAmounts[bucket].toLocaleString()}
                    </p>
                    <p className="text-warm-white/30 text-[10px] font-semibold">
                      {bucketConfig[bucket].percent}% {bucketConfig[bucket].label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {monthlyIncome === 0 ? (
        <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-10 text-center border border-warm-white/5">
          <div className="w-16 h-16 rounded-3xl bg-amber/10 flex items-center justify-center mx-auto mb-4">
            <DollarSign size={28} className="text-amber/40" />
          </div>
          <p className="text-warm-white/60 text-sm mb-2 font-medium">Set your monthly income to get started</p>
          <p className="text-warm-white/30 text-xs max-w-xs mx-auto">
            Kin uses the 50/30/20 rule to help you budget — 50% needs, 30% wants, 20% savings
          </p>
        </div>
      ) : (
        <>
          {/* Overall summary */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-4 border border-warm-white/5">
              <p className="text-warm-white/40 text-xs mb-1">Spent this month</p>
              <p className="text-warm-white font-mono text-xl font-bold">
                ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </p>
              <p className="text-warm-white/20 text-[10px] font-mono mt-1">{overallPercent}% of income</p>
            </div>
            <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-4 border border-warm-white/5">
              <p className="text-warm-white/40 text-xs mb-1">Remaining</p>
              <p className={`font-mono text-xl font-bold ${remaining >= 0 ? "text-primary" : "text-rose"}`}>
                ${Math.abs(remaining).toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </p>
              <p className="text-warm-white/20 text-[10px] font-mono mt-1">
                {remaining >= 0 ? `${100 - overallPercent}% left` : "over budget"}
              </p>
            </div>
          </div>

          {/* 50/30/20 buckets */}
          <div className="space-y-3 mb-8">
            {(["needs", "wants", "savings"] as const).map((bucket) => (
              <BucketCard
                key={bucket}
                bucket={bucket}
                spent={bucketTotals[bucket]}
                budgetAmount={budgetAmounts[bucket]}
              />
            ))}
          </div>

          {/* Recent transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-warm-white font-semibold text-sm">Recent</h2>
              <span className="text-warm-white/25 text-xs">{transactions.length} this month</span>
            </div>
            {transactions.length === 0 ? (
              <div className="bg-gradient-to-br from-surface-raised to-background rounded-2xl p-8 text-center border border-warm-white/5">
                <p className="text-warm-white/40 text-sm mb-1">No transactions yet</p>
                <p className="text-warm-white/20 text-xs">Tap + to log your first expense</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 20).map((t) => {
                  const config = bucketConfig[t.bucket];
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-2xl px-4 py-3.5 bg-surface-raised border border-warm-white/5 hover:border-warm-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${config.bgStrong} flex items-center justify-center`}>
                          <config.icon size={15} className={config.color} />
                        </div>
                        <div>
                          <p className="text-warm-white text-sm font-medium">{t.category}</p>
                          <p className="text-warm-white/25 text-xs">
                            {t.description || new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <span className={`font-mono text-sm font-semibold ${config.color}`}>
                        -${Number(t.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onAdd={addTransaction}
        />
      )}
    </div>
  );
}
