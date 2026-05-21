"use client";

import { RouteError } from "@/components/RouteError";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      heading="Onboarding hit a snag."
      body="Your progress is saved. Try again — if it keeps happening, text Kin and we'll finish setup over SMS."
    />
  );
}
