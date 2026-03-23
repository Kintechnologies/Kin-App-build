"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export type NutritionGoal = "lose-weight" | "gain-muscle" | "maintain" | "heart-health" | "energy" | "kid-friendly";

interface NutritionData {
  goals: NutritionGoal[];
  calorieTarget: number;
  proteinPriority: boolean;
  healthyFats: boolean;
  lowSugar: boolean;
}

interface Props {
  data: NutritionData;
  onUpdate: (data: Partial<NutritionData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const goalOptions: { value: NutritionGoal; label: string; description: string }[] = [
  { value: "lose-weight", label: "Lose weight", description: "Lower calorie, balanced meals" },
  { value: "gain-muscle", label: "Build muscle", description: "High protein, nutrient dense" },
  { value: "maintain", label: "Maintain weight", description: "Balanced macros" },
  { value: "heart-health", label: "Heart health", description: "Low sodium, healthy fats" },
  { value: "energy", label: "More energy", description: "Complex carbs, steady fuel" },
  { value: "kid-friendly", label: "Kid-friendly", description: "Nutritious & appealing for kids" },
];

const calorieSuggestions = [1500, 1800, 2000, 2200, 2500, 3000];

export default function StepNutritionGoals({ data, onUpdate, onNext, onBack }: Props) {
  function toggleGoal(goal: NutritionGoal) {
    if (data.goals.includes(goal)) {
      onUpdate({ goals: data.goals.filter((g) => g !== goal) });
    } else {
      onUpdate({ goals: [...data.goals, goal] });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          What are your nutrition goals?
        </h2>
        <p className="text-warm-white/50 text-sm">
          Kin will act as your family nutritionist and tailor meals accordingly
        </p>
      </div>

      {/* Goals */}
      <div>
        <label className="block text-sm text-warm-white/70 mb-2">
          Goals (select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {goalOptions.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleGoal(value)}
              className={`px-3 py-3 rounded-lg text-left transition-colors border ${
                data.goals.includes(value)
                  ? "bg-primary/20 border-primary"
                  : "bg-background border-warm-white/20 hover:border-warm-white/40"
              }`}
            >
              <span className={`block text-sm font-medium ${data.goals.includes(value) ? "text-primary" : "text-warm-white/70"}`}>
                {label}
              </span>
              <span className="block text-[11px] text-warm-white/40 mt-0.5">
                {description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Calorie target */}
      <div>
        <label className="block text-sm text-warm-white/70 mb-2">
          Daily calorie target per adult (optional)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {calorieSuggestions.map((cal) => (
            <button
              key={cal}
              type="button"
              onClick={() => onUpdate({ calorieTarget: cal })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                data.calorieTarget === cal
                  ? "bg-amber/20 border-amber text-amber"
                  : "bg-background border-warm-white/20 text-warm-white/50 hover:border-warm-white/40"
              }`}
            >
              {cal.toLocaleString()} cal
            </button>
          ))}
        </div>
        <Input
          placeholder="Or type a custom amount..."
          type="number"
          value={data.calorieTarget || ""}
          onChange={(e) => onUpdate({ calorieTarget: parseInt(e.target.value) || 0 })}
        />
      </div>

      {/* Macro priorities */}
      <div>
        <label className="block text-sm text-warm-white/70 mb-2">
          Nutrition priorities
        </label>
        <div className="space-y-2">
          {[
            { key: "proteinPriority" as const, label: "High protein", desc: "Prioritize protein-rich meals and snacks" },
            { key: "healthyFats" as const, label: "Healthy fats", desc: "Avocado, nuts, olive oil, fatty fish" },
            { key: "lowSugar" as const, label: "Low sugar", desc: "Minimize added sugars and refined carbs" },
          ].map(({ key, label, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => onUpdate({ [key]: !data[key] })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                data[key]
                  ? "bg-primary/10 border-primary/50"
                  : "bg-background border-warm-white/15 hover:border-warm-white/30"
              }`}
            >
              <div className="text-left">
                <span className={`block text-sm font-medium ${data[key] ? "text-primary" : "text-warm-white/70"}`}>
                  {label}
                </span>
                <span className="block text-[11px] text-warm-white/40">{desc}</span>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                data[key] ? "bg-primary border-primary" : "border-warm-white/30"
              }`}>
                {data[key] && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#0C0F0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
