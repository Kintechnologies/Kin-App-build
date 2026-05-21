"use client";

import { RouteError } from "@/components/RouteError";

export default function JoinError({
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
      heading="Couldn't load this invite."
      body="The link may have expired or already been used. Ask the person who invited you to resend, or email hello@kinai.family if it keeps happening."
    />
  );
}
