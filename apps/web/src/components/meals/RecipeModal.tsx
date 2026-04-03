"use client";

import { useState, useEffect } from "react";
import { X, Clock, Flame, Beef, Loader2 } from "lucide-react";

interface Props {
  mealName: string;
  mealType: string;
  calories: number;
  protein: number;
  prepTime: number;
  onClose: () => void;
}

export default function RecipeModal({ mealName, mealType, calories, protein, prepTime, onClose }: Props) {
  const [recipe, setRecipe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        const res = await fetch("/api/recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mealName }),
        });
        if (res.ok) {
          const { recipe: text } = await res.json();
          setRecipe(text);
        }
      } catch {
        setRecipe("Couldn't load recipe right now. Try again in a moment.");
      } finally {
        setLoading(false);
      }
    }
    fetchRecipe();
  }, [mealName]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const typeColors: Record<string, string> = {
    breakfast: "bg-amber/15 text-amber",
    lunch: "bg-blue/15 text-blue",
    dinner: "bg-blue/15 text-blue",
    snack: "bg-rose/15 text-rose",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-background rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-warm-white/8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${typeColors[mealType] || "bg-surface-raised text-warm-white/50"}`}>
                {mealType}
              </span>
              <h2 className="text-warm-white font-semibold text-lg leading-tight">{mealName}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-warm-white/40 hover:text-warm-white/70 transition-all shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Macro pills */}
          <div className="flex gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-raised text-warm-white/50">
              <Clock size={10} /> {prepTime}m
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber/10 text-amber/80">
              <Flame size={10} /> {calories} cal
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue/10 text-blue/80">
              <Beef size={10} /> {protein}g protein
            </span>
          </div>
        </div>

        {/* Recipe content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={24} className="text-primary animate-spin mb-3" />
              <p className="text-warm-white/40 text-sm">Loading recipe...</p>
            </div>
          ) : (
            <div className="prose-kin text-sm leading-relaxed">
              {recipe?.split("\n").map((line, i) => {
                if (line.startsWith("## ")) return null; // Skip title (already in header)
                if (line.startsWith("### ")) {
                  return (
                    <h3 key={i} className="text-primary font-semibold text-sm mt-5 mb-2">
                      {line.replace("### ", "")}
                    </h3>
                  );
                }
                if (line.startsWith("- **")) {
                  const match = line.match(/- \*\*(.+?)\*\*:?\s*(.*)/);
                  if (match) {
                    return (
                      <p key={i} className="text-warm-white/80 mb-1.5 pl-3">
                        <span className="font-semibold text-warm-white">{match[1]}</span>
                        {match[2] ? `: ${match[2]}` : ""}
                      </p>
                    );
                  }
                }
                if (line.startsWith("- ")) {
                  return (
                    <p key={i} className="text-warm-white/70 mb-1 pl-3 before:content-['•'] before:mr-2 before:text-primary/50">
                      {line.replace("- ", "")}
                    </p>
                  );
                }
                if (line.match(/^\d+\. \*\*/)) {
                  const match = line.match(/^(\d+)\. \*\*(.+?)\*\*:?\s*(.*)/);
                  if (match) {
                    return (
                      <div key={i} className="flex gap-3 mb-3">
                        <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                          {match[1]}
                        </span>
                        <p className="text-warm-white/80">
                          <span className="font-semibold text-warm-white">{match[2]}</span>
                          {match[3] ? `: ${match[3]}` : ""}
                        </p>
                      </div>
                    );
                  }
                }
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return (
                  <p key={i} className="text-warm-white/60 mb-1.5">
                    {line}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
