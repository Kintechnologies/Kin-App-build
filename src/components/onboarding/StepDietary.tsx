"use client";

import Button from "@/components/ui/Button";

interface Props {
  selected: string[];
  onUpdate: (prefs: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const dietaryOptions = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Low-carb",
  "Keto",
  "Nut allergy",
  "Shellfish allergy",
  "Halal",
  "Kosher",
  "Pescatarian",
  "No restrictions",
];

export default function StepDietary({ selected, onUpdate, onNext, onBack }: Props) {
  function toggle(pref: string) {
    if (pref === "No restrictions") {
      onUpdate(selected.includes(pref) ? [] : ["No restrictions"]);
      return;
    }
    const filtered = selected.filter((s) => s !== "No restrictions");
    if (filtered.includes(pref)) {
      onUpdate(filtered.filter((s) => s !== pref));
    } else {
      onUpdate([...filtered, pref]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          Any dietary preferences?
        </h2>
        <p className="text-warm-white/50 text-sm">
          Select all that apply to your household
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {dietaryOptions.map((pref) => (
          <button
            key={pref}
            type="button"
            onClick={() => toggle(pref)}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
              selected.includes(pref)
                ? "bg-primary/20 border-primary text-primary"
                : "bg-background border-warm-white/20 text-warm-white/60 hover:border-warm-white/40"
            }`}
          >
            {pref}
          </button>
        ))}
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
