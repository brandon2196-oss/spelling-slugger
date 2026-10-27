# Supabase setup

The app needs one Supabase project (free tier is plenty). No Docker and no CLI are required.

## 1. Create the project
1. https://supabase.com → New project. Pick a name, a strong database password (save it in
   1Password), and the region closest to you (US East for Mississippi).
2. Wait for it to finish provisioning (about a minute).

## 2. Apply the schema
Option A — SQL editor (simplest):
1. Left sidebar → SQL Editor → New query.
2. Paste the whole contents of `migrations/0001_init.sql` and click Run.
3. You should see "Success. No rows returned".

Option B — Supabase CLI (for future migrations):
```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

## 3. Auth settings
Authentication → Providers → Email: enabled (default). Leave "Confirm email" on; the app shows a
"check your email" screen after sign-up.

Authentication → URL Configuration:
- Site URL: your deployed address (for example `https://spelling-slugger.vercel.app`)
- Redirect URLs: add `https://YOUR-APP/reset` and `http://localhost:5173/reset`

## 4. Keys for the app
Settings → API. Copy **Project URL** and the **anon public** key into `.env.local`
(and into Vercel's environment variables):
```
VITE_STORE=supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Never copy the `service_role` key anywhere near the frontend.

## Running the isolation test
`src/data/rls.integration.test.ts` proves two families cannot see each other's data. It only runs
when these are set (use a throwaway project, never production):
```
SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... SUPABASE_TEST_SERVICE_KEY=... npm test
```
