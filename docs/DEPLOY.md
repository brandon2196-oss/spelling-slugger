# Deploying Cooper's Spelling Slugger

Three services, all on free tiers. Expected running cost: **$0/month**.

| Piece | Service | Free tier | What it does |
| --- | --- | --- | --- |
| Database + accounts | Supabase | 500 MB database, 50k monthly active users, 2 projects | Stores families, players, word lists, games. Handles email/password sign-in and password-reset emails. |
| Hosting | Vercel (Hobby) | 100 GB bandwidth/month, non-commercial use | Serves the app over HTTPS, redeploys on every push to `main`. |
| Code | GitHub (private repo) | Unlimited private repos | Where you push changes from your Mac. |

Things to know about the free tiers:
- **Supabase pauses a free project after 7 days with no traffic.** Open the Supabase dashboard and click
  "Restore" to wake it (takes about a minute). If a family hits the app while it is paused they see a
  sign-in error until it wakes. The $25/month Pro plan removes the pause; not needed unless this
  becomes a nuisance.
- **Vercel Hobby is for non-commercial use.** This app has no payments or ads, so it qualifies.
- A custom domain (for example `spellingslugger.com`) is optional, about $12/year from any registrar.

## 1. Supabase (about 5 minutes)
Follow [`../supabase/README.md`](../supabase/README.md): create the project, run the migration in the
SQL editor, set the Auth URLs, copy the project URL and anon key.

## 2. GitHub
From the project folder:
```bash
gh repo create spelling-slugger --private --source . --push
```

## 3. Vercel
1. https://vercel.com → Add New → Project → import `spelling-slugger` from GitHub.
2. Framework preset: Vite (detected). Build command `npm run build`, output `dist` (defaults).
3. Environment variables (Production and Preview):
   - `VITE_STORE` = `supabase`
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
   - `VITE_APP_URL` = `https://<your-project>.vercel.app` (update after the first deploy, then redeploy)
4. Deploy. Copy the URL into Supabase → Authentication → URL Configuration (Site URL and `/reset`
   redirect), then redeploy once so `VITE_APP_URL` matches.

Every later `git push` to `main` redeploys automatically. The family's laptop needs nothing installed: it is a
website, and "Add to Home Screen" / "Install app" in the browser makes it feel native.

## 4. Verify after the first deploy
- Open the URL on an iPhone (Safari) and a laptop. Register a test family, add a list, play a game.
- Share → Add to Home Screen on the iPhone; the icon and name should appear.
- Run the family-isolation test once against the live project (use a second throwaway Supabase
  project or accept that it creates and deletes two test users):
  ```bash
  SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... SUPABASE_TEST_SERVICE_KEY=... npm test
  ```
- Delete the test family from Account → Delete account.

## Updating the app
```bash
npm test && npm run build && git push
```
Vercel builds and publishes in about a minute. Installed home-screen copies pick up the new version
on their next launch (the service worker auto-updates).

## Local development without Supabase
`npm run dev` with no `.env.local` runs in **local mode**: a fake sign-in and localStorage data, so
you can try everything on your own machine. Nothing in local mode is shared or backed up.
