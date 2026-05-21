"use client";

import { RouteError } from "@/components/RouteError";

export default function ConnectError({
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
      heading="Couldn't open this invite."
      body="The link may have expired or already been used. Ask whoever invited you to send a fresh one, or text Kin if you keep hitting this."
    />
  );
}
