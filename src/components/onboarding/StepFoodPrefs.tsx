"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Plus, X } from "lucide-react";

interface Props {
  loves: string[];
  dislikes: string[];
  onUpdate: (data: { loves?: string[]; dislikes?: string[] }) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

const loveSuggestions = [
  "Pasta", "Tacos", "Stir-fry", "Pizza", "Grilled chicken",
  "Salmon", "Burgers", "Curry", "Salads", "Soups",
];

const dislikeSuggestions = [
  "Liver", "Brussels sprouts", "Tofu", "Mushrooms", "Olives",
  "Anchovies", "Eggplant", "Beets",
];

function ChipInput({
  label,
  items,
  suggestions,
  onChange,
  color,
}: {
  label: string;
  items: string[];
  suggestions: string[];
  onChange: (items: string[]) => void;
  color: "primary" | "rose";
}) {
  const [input, setInput] = useState("");

  function add(item: string) {
    const trimmed = item.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
    }
    setInput("");
  }

  function remove(item: string) {
    onChange(items.filter((i) => i !== item));
  }

  const colorClasses =
    color === "primary"
      ? "bg-primary/20 border-primary text-primary"
      : "bg-rose/20 border-rose text-rose";

  return (
    <div className="space-y-2">
      <label className="block text-sm text-warm-white/70">{label}</label>

      {/* Selected items */}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses}`}
          >
            {item}
            <button onClick={() => remove(item)} className="hover:opacity-70">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-background border border-warm-white/20 rounded-lg px-3 py-2 text-sm text-warm-white placeholder:text-warm-white/30 focus:outline-none focus:border-primary"
          placeholder="Type and press Enter..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
            }
          }}
        />
        <button
          onClick={() => add(input)}
          disabled={!input.trim()}
          className="px-3 py-2 rounded-lg text-sm bg-primary/20 text-primary disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {suggestions
          .filter((s) => !items.includes(s))
          .slice(0, 6)
          .map((s) => (
            <button
              key={s}
              onClick={() => add(s)}
              className="px-2.5 py-1 rounded-full text-xs border border-warm-white/10 text-warm-white/40 hover:border-warm-white/30 hover:text-warm-white/60 transition-colors"
            >
              + {s}
            </button>
          ))}
      </div>
    </div>
  );
}

export default function StepFoodPrefs({ loves, dislikes, onUpdate, onSubmit, onBack, loading }: Props) {
  const isValid = loves.length >= 2;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          What does your family love to eat?
        </h2>
        <p className="text-warm-white/50 text-sm">
          Pick 2-3 favorites and 1-2 dislikes so Kin can personalize your meals
        </p>
      </div>

      <ChipInput
        label="Foods we love (pick at least 2)"
        items={loves}
        suggestions={loveSuggestions}
        onChange={(items) => onUpdate({ loves: items })}
        color="primary"
      />

      <ChipInput
        label="Foods we dislike (optional)"
        items={dislikes}
        suggestions={dislikeSuggestions}
        onChange={(items) => onUpdate({ dislikes: items })}
        color="rose"
      />

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          Back
        </Button>
        <Button
          onClick={onSubmit}
          className="flex-1"
          size="lg"
          disabled={!isValid || loading}
        >
          {loading ? "Building your meals..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
