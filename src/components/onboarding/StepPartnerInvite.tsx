"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Mail, ArrowRight } from "lucide-react";

interface Props {
  partnerEmail: string;
  onUpdate: (email: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPartnerInvite({ partnerEmail, onUpdate, onNext, onBack }: Props) {
  const [skipped, setSkipped] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          Invite your partner
        </h2>
        <p className="text-warm-white/50 text-sm">
          They&apos;ll get their own private login and Kin chat, with a shared household view for meals, budget, and calendar
        </p>
      </div>

      <div className="bg-background rounded-lg p-4 border border-warm-white/10 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple/20 flex items-center justify-center shrink-0 mt-0.5">
            <Mail size={16} className="text-purple" />
          </div>
          <div>
            <p className="text-warm-white text-sm font-medium">Shared household, private profiles</p>
            <p className="text-warm-white/40 text-xs mt-1">
              Each parent gets their own AI thread and private budget view. Shared features include the meal plan, grocery list, calendar, and Sunday briefing.
            </p>
          </div>
        </div>
      </div>

      {!skipped && (
        <div className="space-y-3">
          <Input
            label="Partner's email"
            type="email"
            placeholder="partner@example.com"
            value={partnerEmail}
            onChange={(e) => onUpdate(e.target.value)}
          />
          <p className="text-warm-white/30 text-xs">
            We&apos;ll send them an invite to join your household. They can set up their own account and preferences.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {!skipped ? (
          <>
            <Button onClick={onNext} className="w-full" size="lg" disabled={!partnerEmail.includes("@")}>
              <Mail size={16} className="mr-2" /> Send Invite & Continue
            </Button>
            <button
              onClick={() => {
                setSkipped(true);
                onUpdate("");
                onNext();
              }}
              className="w-full text-center text-sm text-warm-white/40 hover:text-warm-white/60 transition-colors py-2"
            >
              Skip for now <ArrowRight size={14} className="inline ml-1" />
            </button>
          </>
        ) : (
          <Button onClick={onNext} className="w-full" size="lg">
            Continue
          </Button>
        )}
        <Button variant="secondary" onClick={onBack} className="w-full" size="lg">
          Back
        </Button>
      </div>
    </div>
  );
}
