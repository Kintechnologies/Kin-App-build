"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { HouseholdType } from "@/types";

interface Props {
  familyName: string;
  householdType: HouseholdType | "";
  onUpdate: (data: { familyName?: string; householdType?: HouseholdType }) => void;
  onNext: () => void;
}

const householdTypes: { value: HouseholdType; label: string }[] = [
  { value: "two-parent", label: "Two parents" },
  { value: "single-parent", label: "Single parent" },
  { value: "blended", label: "Blended family" },
  { value: "other", label: "Other" },
];

export default function StepFamilyName({ familyName, householdType, onUpdate, onNext }: Props) {
  const isValid = familyName.trim().length > 0 && householdType !== "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          What&apos;s your family name?
        </h2>
        <p className="text-warm-white/50 text-sm">
          This is how Kin will refer to your household
        </p>
      </div>

      <Input
        label="Family name"
        placeholder="e.g. The Johnsons"
        value={familyName}
        onChange={(e) => onUpdate({ familyName: e.target.value })}
        autoFocus
      />

      <div>
        <label className="block text-sm text-warm-white/70 mb-2">
          Household type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {householdTypes.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onUpdate({ householdType: value })}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                householdType === value
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-background border-warm-white/20 text-warm-white/60 hover:border-warm-white/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={onNext} className="w-full" size="lg" disabled={!isValid}>
        Continue
      </Button>
    </div>
  );
}
