"use client";

import Button from "@/components/ui/Button";
import { Check } from "lucide-react";

interface Props {
  selectedStores: string[];
  separateKidGroceries: boolean | null;
  hasKids: boolean;
  hasDiet: boolean;
  onUpdateStores: (stores: string[]) => void;
  onUpdateSeparateKids: (separate: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

const storeOptions = [
  { id: "costco", name: "Costco", note: "Membership required", membership: true },
  { id: "walmart", name: "Walmart", note: "Everyday low prices" },
  { id: "aldi", name: "Aldi", note: "Budget-friendly staples" },
  { id: "trader-joes", name: "Trader Joe's", note: "Unique finds & organics" },
  { id: "whole-foods", name: "Whole Foods", note: "Organic & specialty" },
  { id: "kroger", name: "Kroger / Ralph's", note: "Wide selection" },
  { id: "target", name: "Target", note: "Convenient one-stop" },
  { id: "local", name: "Local grocery", note: "Support local" },
];

export default function StepStorePrefs({
  selectedStores,
  separateKidGroceries,
  hasKids,
  hasDiet,
  onUpdateStores,
  onUpdateSeparateKids,
  onNext,
  onBack,
}: Props) {
  function toggleStore(id: string) {
    if (selectedStores.includes(id)) {
      onUpdateStores(selectedStores.filter((s) => s !== id));
    } else {
      onUpdateStores([...selectedStores, id]);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          Where do you like to shop?
        </h2>
        <p className="text-warm-white/50 text-sm">
          Kin will tailor your grocery list to stores you actually use
        </p>
      </div>

      <div className="space-y-2">
        {storeOptions.map((store) => (
          <button
            key={store.id}
            type="button"
            onClick={() => toggleStore(store.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
              selectedStores.includes(store.id)
                ? "bg-primary/10 border-primary/50"
                : "bg-background border-warm-white/15 hover:border-warm-white/30"
            }`}
          >
            <div className="text-left">
              <span className={`block text-sm font-medium ${selectedStores.includes(store.id) ? "text-primary" : "text-warm-white/70"}`}>
                {store.name}
              </span>
              <span className="block text-[11px] text-warm-white/40">
                {store.note}
              </span>
            </div>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              selectedStores.includes(store.id) ? "bg-primary border-primary" : "border-warm-white/30"
            }`}>
              {selectedStores.includes(store.id) && <Check size={12} className="text-background" />}
            </div>
          </button>
        ))}
      </div>

      {/* Separate kid groceries question */}
      {hasKids && hasDiet && (
        <div className="bg-background rounded-lg p-4 border border-warm-white/10 space-y-3">
          <div>
            <p className="text-warm-white text-sm font-medium">
              Should Kin create a separate grocery section for the kids?
            </p>
            <p className="text-warm-white/40 text-xs mt-1">
              Since you have dietary goals, your kids might eat differently — more flexibility with carbs, treats, and kid favorites. Kin can split the list so everyone&apos;s covered.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdateSeparateKids(true)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                separateKidGroceries === true
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-surface border-warm-white/20 text-warm-white/60 hover:border-warm-white/40"
              }`}
            >
              Yes, separate lists
            </button>
            <button
              onClick={() => onUpdateSeparateKids(false)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                separateKidGroceries === false
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-surface border-warm-white/20 text-warm-white/60 hover:border-warm-white/40"
              }`}
            >
              No, one list is fine
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1" size="lg" disabled={selectedStores.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
