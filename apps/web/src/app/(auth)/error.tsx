"use client";

import { RouteError } from "@/components/RouteError";

export default function AuthError({
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
      heading="Sign-in tripped on something."
      body="We were notified. Try again — if it keeps happening, you can also onboard by texting Kin directly."
    />
  );
}
