"use client";

import Button from "@/components/ui/Button";

interface Props {
  budget: number;
  onUpdate: (budget: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const budgetOptions = [
  { value: 100, label: "$100/week" },
  { value: 150, label: "$150/week" },
  { value: 200, label: "$200/week" },
  { value: 250, label: "$250/week" },
  { value: 300, label: "$300/week" },
  { value: 400, label: "$400+/week" },
];

export default function StepBudget({ budget, onUpdate, onNext, onBack }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          What&apos;s your weekly grocery budget?
        </h2>
        <p className="text-warm-white/50 text-sm">
          Kin will optimize your meal plan to stay within budget
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {budgetOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onUpdate(value)}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
              budget === value
                ? "bg-primary/20 border-primary text-primary"
                : "bg-background border-warm-white/20 text-warm-white/60 hover:border-warm-white/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1" size="lg" disabled={budget === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
