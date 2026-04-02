"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  partnerEmail: string;
  onUpdate: (email: string) => void;
  onNext: () => void;
  onBack: () => void;
}

type SendState = "idle" | "sending" | "sent" | "error";

export default function StepPartnerInvite({ partnerEmail, onUpdate, onNext, onBack }: Props) {
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValidEmail = partnerEmail.includes("@") && partnerEmail.includes(".");

  async function handleSendInvite() {
    if (!isValidEmail) return;

    setSendState("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerEmail }),
      });

      if (res.ok) {
        setSendState("sent");
        // Auto-advance after a short beat so the user sees the success state
        setTimeout(() => onNext(), 1800);
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? "Couldn't send invite. Try again.");
        setSendState("error");
      }
    } catch {
      setErrorMsg("Network error. Check your connection and try again.");
      setSendState("error");
    }
  }

  // ── Sent state ─────────────────────────────────────────────────────────
  if (sendState === "sent") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <CheckCircle size={26} className="text-primary" />
          </div>
          <h2 className="font-serif italic text-xl text-warm-white">Invite sent!</h2>
          <p className="text-warm-white/50 text-sm max-w-xs leading-relaxed">
            We sent an invite to{" "}
            <span className="text-warm-white">{partnerEmail}</span>.
            They&apos;ll be connected once they sign up.
          </p>
          <p className="text-warm-white/30 text-xs">Continuing in a moment…</p>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          Invite your partner
        </h2>
        <p className="text-warm-white/50 text-sm">
          They&apos;ll get their own private login and Kin chat, with a shared household view for
          meals, budget, and calendar
        </p>
      </div>

      <div className="bg-background rounded-lg p-4 border border-warm-white/10 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Mail size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-warm-white text-sm font-medium">Shared household, private profiles</p>
            <p className="text-warm-white/40 text-xs mt-1">
              Each parent gets their own AI thread and private budget view. Shared features include
              the meal plan, grocery list, calendar, and Sunday briefing.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          label="Partner's email"
          type="email"
          placeholder="partner@example.com"
          value={partnerEmail}
          onChange={(e) => {
            onUpdate(e.target.value);
            if (sendState === "error") {
              setSendState("idle");
              setErrorMsg("");
            }
          }}
          disabled={sendState === "sending"}
        />

        {sendState === "error" && (
          <div className="flex items-start gap-2 text-rose text-xs">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <p className="text-warm-white/30 text-xs">
          We&apos;ll send them a link to join your household. They can set up their own account and
          preferences.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleSendInvite}
          className="w-full"
          size="lg"
          disabled={!isValidEmail || sendState === "sending"}
        >
          {sendState === "sending" ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Sending invite…
            </>
          ) : (
            <>
              <Mail size={16} className="mr-2" />
              Send Invite &amp; Continue
            </>
          )}
        </Button>

        <button
          onClick={() => {
            onUpdate("");
            onNext();
          }}
          disabled={sendState === "sending"}
          className="w-full text-center text-sm text-warm-white/40 hover:text-warm-white/60 disabled:opacity-30 transition-colors py-2"
        >
          Skip for now <ArrowRight size={14} className="inline ml-1" />
        </button>

        <Button
          variant="secondary"
          onClick={onBack}
          className="w-full"
          size="lg"
          disabled={sendState === "sending"}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
