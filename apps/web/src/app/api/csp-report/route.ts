/**
 * POST /api/csp-report
 *
 * Receiver for browser-emitted Content-Security-Policy violations. Next.js
 * sets `report-uri /api/csp-report` in next.config.mjs so violations land
 * here and we forward them to Sentry as `csp.violation` breadcrumbs.
 *
 * P1-I2 (audit v7): without a sink, the V6 promise to flip CSP from
 * Report-Only to enforced after "a week of clean logs" was unverifiable.
 * With Sentry aggregation the team can grep for csp.violation and make
 * an actual data-backed decision before setting CSP_ENFORCE=1.
 *
 * Two request body shapes show up in the wild:
 *   • Legacy `report-uri` payloads ({"csp-report": {...}})
 *   • New `report-to` payloads ([{ "type": "csp-violation", "body": {...} }])
 * Both get unwrapped into a flat object and forwarded.
 *
 * Always returns 204 — never let a malformed report break the browser.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

interface CspReport {
  "document-uri"?: string;
  "blocked-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "original-policy"?: string;
  "source-file"?: string;
  "status-code"?: number | string;
  "line-number"?: number | string;
  disposition?: string;
  referrer?: string;
}

function unwrap(body: unknown): CspReport | null {
  if (!body || typeof body !== "object") return null;
  // report-uri form
  const legacy = (body as { "csp-report"?: CspReport })["csp-report"];
  if (legacy) return legacy;
  // report-to form (array of entries with .body)
  if (Array.isArray(body)) {
    const first = body.find(
      (e) => typeof e === "object" && e !== null && "body" in e
    ) as { body?: CspReport } | undefined;
    return first?.body ?? null;
  }
  return body as CspReport;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const report = unwrap(body);
    if (!report) return new NextResponse(null, { status: 204 });

    Sentry.captureMessage("csp.violation", {
      level: "warning",
      tags: {
        directive:
          report["effective-directive"] || report["violated-directive"] || "?",
        blocked: report["blocked-uri"] || "?",
      },
      extra: { ...report },
    });
  } catch {
    // Never throw out of a CSP report receiver — browsers expect 204.
  }
  return new NextResponse(null, { status: 204 });
}
