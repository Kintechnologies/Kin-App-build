This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase pg_cron + Vault bootstrap

(Audit V7 P2-I6) The pg_cron jobs in `supabase/migrations/058`, `060`, `063`,
and `064` originally hardcoded the Supabase Functions URL. Migration 072
replaced those with `public.functions_base_url()` — a SECURITY DEFINER
helper that reads `app_settings.functions_base_url` (a Supabase Vault row)
so the same cron registration works across staging and production.

Before deploying the migrations to a fresh project, seed the Vault row:

```sql
SELECT vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1',
  'functions_base_url'
);
```

Then run `supabase db push`. Migrations 072+ will `unschedule` the old
hardcoded jobs and reschedule them through the helper. Forgetting the
Vault seed makes the cron jobs register with a NULL URL — they will
serve 200 but never dispatch.

The same helper also gates `public.cron_dispatch_headers()` which carries
the `x-cron-secret` for every edge function invocation.
