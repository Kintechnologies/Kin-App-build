#!/usr/bin/env node
/**
 * CLI wrapper for the morning-briefing test endpoint.
 *
 * Calls GET /api/test/morning-briefing for a single user (by phone) and
 * prints the pipeline trace. Defaults to a DRY RUN; pass --send to actually
 * deliver the SMS via Twilio, and --persist to write to the database.
 *
 * Usage:
 *   node scripts/test-morning-briefing.mjs --phone +16266762222
 *   node scripts/test-morning-briefing.mjs --phone +16266762222 --send
 *   node scripts/test-morning-briefing.mjs --phone +16266762222 --send --persist
 *   node scripts/test-morning-briefing.mjs --phone +16266762222 --url http://localhost:3000
 *
 * CRON_SECRET and the base URL (NEXT_PUBLIC_APP_URL) are read from
 * apps/web/.env.local. Override the base URL with --url, or force a local
 * run with --local (http://localhost:3000).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(scriptDir, "..", "apps", "web", ".env.local");

function loadEnvFile(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (line.trimStart().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env.local is optional — fall back to process.env
  }
  return env;
}

function parseArgs(argv) {
  const args = { send: false, persist: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--send") args.send = true;
    else if (a === "--persist") args.persist = true;
    else if (a === "--local") args.url = "http://localhost:3000";
    else if (a === "--phone") args.phone = argv[++i];
    else if (a === "--url") args.url = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

const HELP = `test-morning-briefing — fire a single-user morning briefing

  --phone <+1...>   Target profile by phone number (required)
  --send            Actually send the SMS (default: dry run)
  --persist         Write the briefing to the database
  --url <baseUrl>   Override base URL
  --local           Shorthand for --url http://localhost:3000
  -h, --help        Show this help
`;

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(HELP);
  process.exit(0);
}

const fileEnv = loadEnvFile(ENV_PATH);
const cronSecret = process.env.CRON_SECRET || fileEnv.CRON_SECRET;
const baseUrl = (
  args.url ||
  process.env.TEST_BASE_URL ||
  fileEnv.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

if (!cronSecret) {
  console.error("CRON_SECRET not found in env or apps/web/.env.local");
  process.exit(1);
}
if (!args.phone) {
  console.error("Provide --phone <+1...>  (see --help)");
  process.exit(1);
}

const params = new URLSearchParams({ phone: args.phone });
if (args.send) params.set("send", "true");
if (args.persist) params.set("persist", "true");
const endpoint = `${baseUrl}/api/test/morning-briefing?${params}`;

console.log(`-> GET ${baseUrl}/api/test/morning-briefing`);
console.log(`   phone:   ${args.phone}`);
console.log(`   send:    ${args.send}${args.send ? "" : "  (dry run — no SMS)"}`);
console.log(`   persist: ${args.persist}\n`);

let res;
try {
  res = await fetch(endpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
} catch (err) {
  console.error(`Request failed: ${err instanceof Error ? err.message : err}`);
  console.error(`Is the server running at ${baseUrl}?`);
  process.exit(1);
}

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error(`<- HTTP ${res.status} — non-JSON response:\n${text}`);
  process.exit(1);
}

console.log(`<- HTTP ${res.status}`);
console.log(JSON.stringify(json, null, 2));
process.exit(res.ok ? 0 : 1);
