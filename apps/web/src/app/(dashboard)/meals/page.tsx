"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Store,
  Lightbulb,
  Flame,
  Beef,
  Check,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Baby,
  RefreshCw,
  X,
  Ban,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import RecipeModal from "@/components/meals/RecipeModal";
import StarRating from "@/components/meals/StarRating";

interface MealOption {
  id: string;
  name: string;
  prep_time_minutes: number;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  kid_friendly: boolean;
  description: string;
}

interface GroceryItem {
  name: string;
  quantity: string;
  estimated_cost: number;
  recommended_store: string;
  section: string;
  savings_tip?: string;
}

interface MealOptions {
  breakfast_options: MealOption[];
  lunch_options: MealOption[];
  dinner_options: MealOption[];
  snack_options: MealOption[];
  grocery_items: GroceryItem[];
  kid_grocery_items: GroceryItem[];
  separate_kid_groceries: boolean;
  stores: string[];
  estimated_weekly_total: number;
  nutrition_summary: {
    avg_daily_calories: number;
    protein_focus: boolean;
    goals: string[];
  };
}

type GrocerySortMode = "store" | "section" | "list";

const categoryConfig = {
  breakfast: {
    emoji: "🌅",
    gradient: "from-amber/20 to-amber/5",
    accent: "text-amber",
    accentBg: "bg-amber/15",
    border: "border-amber/20",
    selectedBg: "bg-amber/10",
    selectedBorder: "border-amber/40",
    pillBg: "bg-amber/20 text-amber",
  },
  lunch: {
    emoji: "🥗",
    gradient: "from-blue/20 to-blue/5",
    accent: "text-blue",
    accentBg: "bg-blue/15",
    border: "border-blue/20",
    selectedBg: "bg-blue/10",
    selectedBorder: "border-blue/40",
    pillBg: "bg-blue/20 text-blue",
  },
  dinner: {
    emoji: "🍽️",
    gradient: "from-blue/20 to-blue/5",
    accent: "text-blue",
    accentBg: "bg-blue/15",
    border: "border-blue/20",
    selectedBg: "bg-blue/10",
    selectedBorder: "border-blue/40",
    pillBg: "bg-blue/20 text-blue",
  },
  snack: {
    emoji: "🥜",
    gradient: "from-rose/20 to-rose/5",
    accent: "text-rose",
    accentBg: "bg-rose/15",
    border: "border-rose/20",
    selectedBg: "bg-rose/10",
    selectedBorder: "border-rose/40",
    pillBg: "bg-rose/20 text-rose",
  },
};

function MealOptionCard({
  meal,
  isSelected,
  onToggle,
  onDismiss,
  onRecipe,
  rating,
  onRate,
  config,
}: {
  meal: MealOption;
  isSelected: boolean;
  onToggle: () => void;
  onDismiss: () => void;
  onRecipe: () => void;
  rating: number;
  onRate: (rating: number) => void;
  config: (typeof categoryConfig)[keyof typeof categoryConfig];
}) {
  const [showDismiss, setShowDismiss] = useState(false);

  return (
    <div
      className={`relative rounded-2xl p-4 transition-all duration-300 border-2 overflow-hidden group ${
        isSelected
          ? `${config.selectedBg} ${config.selectedBorder} shadow-lg scale-[1.01]`
          : "bg-surface-raised border-transparent hover:border-warm-white/15 hover:scale-[1.01] hover:shadow-md hover:shadow-black/20"
      }`}
    >
      {/* Color gradient accent at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`} />

      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {/* Recipe button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRecipe();
          }}
          aria-label="View recipe"
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-warm-white/5 hover:bg-primary/20 flex items-center justify-center transition-all"
        >
          <BookOpen size={13} className="text-warm-white/30 hover:text-primary" aria-hidden="true" />
        </button>
        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDismiss(true);
          }}
          aria-label="Not for us — remove from options"
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-warm-white/5 hover:bg-rose/20 flex items-center justify-center transition-all"
        >
          <X size={13} className="text-warm-white/30 hover:text-rose" aria-hidden="true" />
        </button>
        {/* Select button */}
        <button
          onClick={onToggle}
          aria-label={isSelected ? "Deselect meal" : "Select meal"}
          aria-pressed={isSelected}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isSelected
              ? `${config.accentBg} ${config.accent}`
              : "bg-warm-white/5 text-warm-white/20 group-hover:text-warm-white/40"
          }`}
        >
          <Check size={14} strokeWidth={isSelected ? 3 : 2} aria-hidden="true" />
        </button>
      </div>

      {/* Dismiss confirmation */}
      {showDismiss && (
        <div className="absolute inset-0 bg-surface-raised/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-10 p-4">
          <Ban size={20} className="text-rose/70" />
          <p className="text-warm-white/70 text-sm text-center">
            Remove <strong>{meal.name}</strong> and don&apos;t suggest it again?
          </p>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDismiss(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-warm-white/10 text-warm-white/60 hover:bg-warm-white/15"
            >
              Keep it
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-rose/20 text-rose hover:bg-rose/30"
            >
              Not for us
            </button>
          </div>
        </div>
      )}

      <button onClick={onToggle} className="w-full text-left">
        {/* Badges */}
        <div className="flex gap-1.5 mb-2">
          {meal.kid_friendly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber/15 text-amber border border-amber/20">
              <Baby size={10} /> Kid approved
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${config.pillBg}`}>
            {meal.meal_type}
          </span>
        </div>

        <h4 className={`text-sm font-semibold mb-1.5 pr-20 ${isSelected ? config.accent : "text-warm-white"}`}>
          {meal.name}
        </h4>
        <p className="text-warm-white/40 text-xs mb-3 leading-relaxed pr-8">
          {meal.description}
        </p>

        {/* Macro pills + rating */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface text-warm-white/50">
            <Clock size={10} /> {meal.prep_time_minutes}m
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber/10 text-amber/80">
            <Flame size={10} /> {meal.calories}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue/10 text-blue/80">
            <Beef size={10} /> {meal.protein}g
          </span>
        </div>
      </button>

      {/* Star rating — always visible when selected */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-warm-white/5 flex items-center justify-between">
          <span className="text-warm-white/30 text-[11px]">
            {rating > 0 ? "Your rating" : "How was it?"}
          </span>
          <StarRating currentRating={rating} onRate={onRate} />
        </div>
      )}
    </div>
  );
}

function MealCategorySection({
  title,
  subtitle,
  options,
  selectedIds,
  onToggle,
  onDismiss,
  onRecipe,
  onRefresh,
  refreshing,
  mealType,
  ratings,
  onRate,
}: {
  title: string;
  subtitle: string;
  options: MealOption[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onDismiss: (id: string) => void;
  onRecipe: (meal: MealOption) => void;
  onRefresh: () => void;
  refreshing: boolean;
  mealType: keyof typeof categoryConfig;
  ratings: Record<string, number>;
  onRate: (mealName: string, rating: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const config = categoryConfig[mealType];
  const selectedCount = options.filter((o) => selectedIds.has(o.id)).length;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className={`rounded-2xl bg-gradient-to-r ${config.gradient} p-4 mb-3`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls={`meal-section-${mealType}`}
            className="flex items-center gap-3 flex-1"
          >
            <span className="text-2xl" aria-hidden="true">{config.emoji}</span>
            <div className="text-left">
              <h2 className="text-warm-white font-semibold text-base">{title}</h2>
              <p className="text-warm-white/40 text-xs">{subtitle}</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.pillBg}`}>
                {selectedCount}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Shuffle meal options"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 ${config.accentBg}`}
            >
              <RefreshCw size={14} className={`${config.accent} ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronUp size={16} className="text-warm-white/30" aria-hidden="true" />
              ) : (
                <ChevronDown size={16} className="text-warm-white/30" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div id={`meal-section-${mealType}`} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((meal) => (
            <MealOptionCard
              key={meal.id}
              meal={meal}
              isSelected={selectedIds.has(meal.id)}
              onToggle={() => onToggle(meal.id)}
              onDismiss={() => onDismiss(meal.id)}
              onRecipe={() => onRecipe(meal)}
              rating={ratings[meal.name] || 0}
              onRate={(r) => onRate(meal.name, r)}
              config={config}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GrocerySection({
  items,
  sortMode,
  title,
  icon,
}: {
  items: GroceryItem[];
  sortMode: GrocerySortMode;
  title?: string;
  icon?: React.ReactNode;
}) {
  let grouped: Record<string, GroceryItem[]> = {};

  if (sortMode === "store") {
    items.forEach((item) => {
      const key = item.recommended_store;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
  } else if (sortMode === "section") {
    items.forEach((item) => {
      const key = item.section;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
  } else {
    grouped = { "All Items": items };
  }

  return (
    <div>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-warm-white font-semibold text-sm">{title}</h3>
        </div>
      )}
      {Object.entries(grouped).map(([group, groupItems]) => (
        <div key={group} className="mb-5">
          {sortMode !== "list" && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <Store size={13} className="text-primary/60" />
              <span className="text-warm-white/60 text-xs font-semibold">{group}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/15 text-primary/70">{groupItems.length}</span>
            </div>
          )}
          <div className="space-y-1.5">
            {groupItems.map((item, i) => (
              <div
                key={`${group}-${i}`}
                className="flex items-center justify-between rounded-2xl px-4 py-3.5 bg-surface-raised hover:bg-surface-raised/80 transition-all"
              >
                <div className="flex-1">
                  <span className="text-warm-white text-sm font-medium">{item.name}</span>
                  <span className="text-warm-white/25 text-xs ml-2">{item.quantity}</span>
                  {item.savings_tip && (
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-primary/80">
                      <Lightbulb size={10} />
                      <span>{item.savings_tip}</span>
                    </div>
                  )}
                </div>
                <span className="text-amber font-mono text-sm font-medium ml-3">
                  ${item.estimated_cost.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getDefaultSelection(options: MealOptions): Set<string> {
  const preSelected = new Set<string>();
  [options.breakfast_options, options.lunch_options, options.dinner_options, options.snack_options].forEach((cat) => {
    cat.slice(0, 2).forEach((m) => preSelected.add(m.id));
  });
  return preSelected;
}

export default function MealsPage() {
  const [mealOptions, setMealOptions] = useState<MealOptions | null>(null);
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set());
  const [dismissedMeals, setDismissedMeals] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"pick" | "groceries">("pick");
  const [grocerySort, setGrocerySort] = useState<GrocerySortMode>("store");
  const [refreshingCategory, setRefreshingCategory] = useState<string | null>(null);
  const [recipeModal, setRecipeModal] = useState<MealOption | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loadingFromDb, setLoadingFromDb] = useState(false);
  const [dbError, setDbError] = useState(false);

  // Load ratings from Supabase
  useEffect(() => {
    async function loadRatings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("meal_ratings")
        .select("meal_name, rating")
        .order("created_at", { ascending: false });
      if (data) {
        const map: Record<string, number> = {};
        data.forEach((r) => {
          if (!map[r.meal_name]) map[r.meal_name] = r.rating;
        });
        setRatings(map);
      }
    }
    loadRatings();
  }, []);

  const rateMeal = useCallback(async (mealName: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [mealName]: rating }));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("meal_ratings").upsert(
        { profile_id: user.id, meal_name: mealName, rating },
        { onConflict: "profile_id,meal_name", ignoreDuplicates: false }
      );
    }
  }, []);

  // Load meal options: sessionStorage fast path, then DB fallback (#26)
  useEffect(() => {
    async function loadMealOptions() {
      // 1. Fast path — sessionStorage (same session, no DB round-trip)
      const stored = sessionStorage.getItem("mealOptions");
      if (stored) {
        try {
          const options: MealOptions = JSON.parse(stored);
          setMealOptions(options);
          setSelectedMeals(getDefaultSelection(options));
          const dismissed = sessionStorage.getItem("dismissedMeals");
          if (dismissed) setDismissedMeals(new Set(JSON.parse(dismissed)));
          return;
        } catch {
          // Corrupted storage — fall through to DB
          sessionStorage.removeItem("mealOptions");
        }
      }

      // 2. DB fallback — fetch most recent meal plan
      setLoadingFromDb(true);
      try {
        const supabase = createClient();
        const { data: plan, error } = await supabase
          .from("meal_plans")
          .select("meal_options")
          .order("generated_at", { ascending: false })
          .limit(1)
          .single();

        if (error || !plan?.meal_options) {
          // No plan in DB — show empty state with CTA
          setLoadingFromDb(false);
          return;
        }

        const options = plan.meal_options as MealOptions;
        setMealOptions(options);
        setSelectedMeals(getDefaultSelection(options));
        // Re-hydrate sessionStorage for subsequent navigations
        sessionStorage.setItem("mealOptions", JSON.stringify(options));
      } catch {
        setDbError(true);
      } finally {
        setLoadingFromDb(false);
      }
    }

    loadMealOptions();
  }, []);

  function toggleMeal(id: string) {
    setSelectedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function dismissMeal(id: string) {
    setDismissedMeals((prev) => {
      const next = new Set(prev);
      next.add(id);
      sessionStorage.setItem("dismissedMeals", JSON.stringify(Array.from(next)));
      return next;
    });
    setSelectedMeals((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function refreshCategory(mealType: string) {
    if (!mealOptions) return;
    setRefreshingCategory(mealType);

    // Shuffle existing options for this category (local re-order, not a new AI call)
    setTimeout(() => {
      const key = `${mealType}_options` as keyof MealOptions;
      const current = mealOptions[key] as MealOption[];
      const shuffled = [...current].sort(() => Math.random() - 0.5);
      setMealOptions({ ...mealOptions, [key]: shuffled });
      setRefreshingCategory(null);
    }, 600);
  }

  function getFilteredOptions(options: MealOption[]) {
    return options.filter((o) => !dismissedMeals.has(o.id));
  }

  if (!mealOptions) {
    // DB loading state — show subtle pulse animation
    if (loadingFromDb) {
      return (
        <div>
          <h1 className="font-serif italic text-2xl text-primary mb-1">Meal Plan</h1>
          <p className="text-warm-white/60 text-sm mb-8">Your personalized weekly meals</p>
          <div className="bg-surface-raised rounded-2xl p-10 flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary/50 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-warm-white/40 text-sm">Fetching your meal plan...</p>
          </div>
        </div>
      );
    }

    // DB error state
    if (dbError) {
      return (
        <div>
          <h1 className="font-serif italic text-2xl text-primary mb-1">Meal Plan</h1>
          <p className="text-warm-white/60 text-sm mb-8">Your personalized weekly meals</p>
          <div className="bg-surface-raised rounded-2xl p-8 text-center">
            <Sparkles size={32} className="text-primary/30 mx-auto mb-4" />
            <p className="text-warm-white/40 text-sm mb-4">
              Couldn&apos;t load your meal plan — try refreshing.
            </p>
          </div>
        </div>
      );
    }

    // True empty state — no plan exists yet
    return (
      <div>
        <h1 className="font-serif italic text-2xl text-primary mb-1">Meal Plan</h1>
        <p className="text-warm-white/60 text-sm mb-8">Your personalized weekly meals</p>
        <div className="bg-surface-raised rounded-2xl p-8 text-center">
          <Sparkles size={32} className="text-primary/30 mx-auto mb-4" />
          <p className="text-warm-white/40 text-sm mb-6">
            No meal plan yet. Complete setup to get your personalized picks.
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles size={14} />
            Get your meal plan
          </a>
        </div>
      </div>
    );
  }

  const totalSelected = selectedMeals.size;

  return (
    <div>
      {/* Header with gradient */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles size={16} className="text-primary shimmer" />
          </div>
          <h1 className="font-serif italic text-2xl text-primary">
            Your Meal Options
          </h1>
        </div>
        <p className="text-warm-white/50 text-sm ml-10">
          Pick what sounds good — Kin builds your grocery list
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("pick")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
            activeTab === "pick"
              ? "bg-primary text-background shadow-lg shadow-primary/25 scale-105"
              : "bg-surface-raised text-warm-white/50 hover:text-warm-white/70"
          }`}
        >
          Pick Meals
        </button>
        <button
          onClick={() => setActiveTab("groceries")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
            activeTab === "groceries"
              ? "bg-primary text-background shadow-lg shadow-primary/25 scale-105"
              : "bg-surface-raised text-warm-white/50 hover:text-warm-white/70"
          }`}
        >
          <ShoppingCart size={14} />
          Grocery List
        </button>
        {totalSelected > 0 && (
          <div className="ml-auto self-center px-3 py-1.5 rounded-2xl text-xs font-semibold bg-primary/20 text-primary">
            {totalSelected} picked
          </div>
        )}
      </div>

      {activeTab === "pick" ? (
        <div>
          {/* Nutrition card */}
          {mealOptions.nutrition_summary && (
            <div className="bg-gradient-to-r from-amber/15 to-amber/5 rounded-2xl p-4 mb-6 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber/20 flex items-center justify-center shrink-0">
                <Flame size={20} className="text-amber" />
              </div>
              <div>
                <p className="text-warm-white font-semibold text-sm">
                  {mealOptions.nutrition_summary.avg_daily_calories} cal/day target
                </p>
                <p className="text-warm-white/40 text-xs">
                  {mealOptions.nutrition_summary.protein_focus
                    ? "High protein focus — snacks are protein-heavy"
                    : "Balanced macros across all meals"}
                </p>
              </div>
            </div>
          )}

          <MealCategorySection
            title="Breakfast"
            subtitle="Pick a few go-to breakfasts for the week"
            options={getFilteredOptions(mealOptions.breakfast_options)}
            selectedIds={selectedMeals}
            onToggle={toggleMeal}
            onDismiss={dismissMeal}
            onRecipe={setRecipeModal}
            onRefresh={() => refreshCategory("breakfast")}
            refreshing={refreshingCategory === "breakfast"}
            mealType="breakfast"
            ratings={ratings}
            onRate={rateMeal}
          />

          <MealCategorySection
            title="Lunch"
            subtitle="Quick meals to power through the afternoon"
            options={getFilteredOptions(mealOptions.lunch_options)}
            selectedIds={selectedMeals}
            onToggle={toggleMeal}
            onDismiss={dismissMeal}
            onRecipe={setRecipeModal}
            onRefresh={() => refreshCategory("lunch")}
            refreshing={refreshingCategory === "lunch"}
            mealType="lunch"
            ratings={ratings}
            onRate={rateMeal}
          />

          <MealCategorySection
            title="Dinner"
            subtitle="What the family eats together"
            options={getFilteredOptions(mealOptions.dinner_options)}
            selectedIds={selectedMeals}
            onToggle={toggleMeal}
            onDismiss={dismissMeal}
            onRecipe={setRecipeModal}
            onRefresh={() => refreshCategory("dinner")}
            refreshing={refreshingCategory === "dinner"}
            mealType="dinner"
            ratings={ratings}
            onRate={rateMeal}
          />

          <MealCategorySection
            title="Snacks"
            subtitle={
              mealOptions.nutrition_summary.protein_focus
                ? "High-protein picks to fuel your goals"
                : "Smart bites between meals"
            }
            options={getFilteredOptions(mealOptions.snack_options)}
            selectedIds={selectedMeals}
            onToggle={toggleMeal}
            onDismiss={dismissMeal}
            onRecipe={setRecipeModal}
            onRefresh={() => refreshCategory("snack")}
            refreshing={refreshingCategory === "snack"}
            mealType="snack"
            ratings={ratings}
            onRate={rateMeal}
          />
        </div>
      ) : (
        <div>
          {/* Sort controls */}
          <div className="flex gap-2 mb-5">
            {([
              { value: "store" as const, label: "By Store" },
              { value: "section" as const, label: "By Aisle" },
              { value: "list" as const, label: "All" },
            ]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setGrocerySort(value)}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all duration-300 ${
                  grocerySort === value
                    ? "bg-primary text-background shadow-md shadow-primary/20 scale-105"
                    : "bg-surface-raised text-warm-white/40 hover:text-warm-white/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <GrocerySection items={mealOptions.grocery_items} sortMode={grocerySort} />

          {mealOptions.kid_grocery_items.length > 0 && (
            <div className="mt-6 pt-6 border-t border-warm-white/8">
              <GrocerySection
                items={mealOptions.kid_grocery_items}
                sortMode={grocerySort}
                title={mealOptions.separate_kid_groceries ? "Kids' Groceries" : "Kid-Friendly Extras"}
                icon={<div className="w-7 h-7 rounded-xl bg-amber/20 flex items-center justify-center"><Baby size={14} className="text-amber" /></div>}
              />
            </div>
          )}

          <div className="mt-6 bg-gradient-to-r from-primary/15 to-primary/5 rounded-2xl p-5 flex justify-between items-center">
            <span className="text-warm-white font-semibold">Estimated Total</span>
            <span className="text-primary font-mono text-xl font-bold">
              ${mealOptions.estimated_weekly_total.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Recipe modal */}
      {recipeModal && (
        <RecipeModal
          mealName={recipeModal.name}
          mealType={recipeModal.meal_type}
          calories={recipeModal.calories}
          protein={recipeModal.protein}
          prepTime={recipeModal.prep_time_minutes}
          onClose={() => setRecipeModal(null)}
        />
      )}
    </div>
  );
}
