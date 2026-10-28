# Deploying Cooper's Spelling Slugger on Replit

Everything runs on Brandon's existing **Replit Core** plan: one Autoscale deployment (the Node server
that serves the game and its API) plus a Replit Postgres database. No other vendor, no new
subscription. GitHub holds the code; Replit pulls from it.

| Piece | Where | Notes |
| --- | --- | --- |
| Code | GitHub, private repo `brandon2196-oss/spelling-slugger` | Push from the Mac. |
| Replit app | `extrainnings.zip` in Brandon's account (the old Extra Innings test site, replaced 2026-10-27; its last state is git tag `extrainnings-old` and a backup at `~/Documents/Personal-Projects/extrainnings-old-backup-2026-10-27.tgz`) | Receives code by `git push replit main` from the Mac. |
| App + API | Replit Autoscale deployment, first published 2026-10-27 at https://extrainningszip.replit.app | `npm run build:all` then `npm start` (see `.replit`). Bills against Core usage; one family is near the floor. |
| Database | Replit Postgres (production database, separate from the workspace's dev database) | `DATABASE_URL` is injected. Publishing shows a schema diff for approval; the migration is idempotent either way. |
| Domain | Your Extra Inning domain | Linked under Publishing → Domains → Add a domain. |

Status 2026-10-27: published and verified, machines capped at 1. The game is served at
https://extrainningszip.replit.app. Custom domain deliberately deferred (step 3 below, when wanted).
Note: Replit adds its own commit to the Repl on each publish, so pushes from the Mac use `--force`.

## 1. Import the repo into Replit (one time)
1. In Replit: **Create App → Import from GitHub** → pick `spelling-slugger`. Replit reads `.replit`
   (Node 22, build and run commands, port 3000).
2. Open the **Database** tool in the workspace and create a Postgres database. The workspace gets a
   development database; the deployment gets its own production database on first publish.
3. Press **Run** once in the workspace: it builds the frontend and server and starts on port 3000.
   If Run fails with "command not found", type `npm install` in the Shell tab first, then Run again.
   The webview should show the welcome screen. Register a test family to confirm the database works.

## 2. Publish
1. **Deploy → Autoscale**. Build command and run command are pre-filled from `.replit`:
   build `npm ci && npm run build:all`, run `npm start`.
2. When asked about the database, choose to create / use the **production** database so real data
   never lives in the dev database.
3. Under the deployment's machine settings, set the **maximum machines to 1**. One family needs no
   more, it keeps the bill at the floor, and it avoids two copies racing to set up the database on
   the very first start.
4. Publish. The first URL is `https://<app>.<user>.replit.app`.

Things you will see that are normal:
- The first visit after a quiet spell takes 3–5 seconds while the machine wakes (Autoscale sleeps
  when idle and wakes on the next request; nothing is paused or lost).
- A one-time warning in the deployment logs that `sslmode=require` is deprecated. The connection is
  still encrypted and verified; it is the database driver commenting on Replit's connection string.

## 3. Put it on the Extra Inning domain
Deployments → **Settings → Domains → Link a domain** → enter the hostname you want (for example a
subdomain of the Extra Inning domain). Replit shows the DNS records to add at the registrar (an A or
CNAME record plus a TXT verification record). After DNS propagates, Replit issues the certificate.
Cookies and share links follow the host automatically; nothing in the code names the domain.

## 4. Verify after the first publish
- Open the URL on an iPhone (Safari) and a laptop. Register a family, add a list (drop in a PDF),
  play a game, check the parent zone and history.
- Share → Add to Home Screen on the iPhone; icon and name should appear.
- Delete the test family from Account → Delete account.

## Updating the app
The Replit app receives code straight from the Mac over SSH (no GitHub login inside Replit). One-time
setup on the Mac, with the SSH command from the app's Developer → SSH tool:
```bash
git remote add replit ssh://8823e214-87fc-4925-b186-306f38fa996b@ssh.worf.replit.dev:22/home/runner/workspace
```
Then every update is:
```bash
npm test && git push origin main && git push --force replit main
```
and in Replit: **Republish**. Installed home-screen copies pick up the new version on their next launch.

## Password resets (no email provider)
Resets are done by you, from the workspace **Shell**, against the production database:
```bash
npm run reset-password -- mom@example.com NewPassword123
```
The workspace shell uses the development database by default; to point it at production, copy the
production `DATABASE_URL` from the Database tool's production tab into the command
(`DATABASE_URL='postgres://…' npm run reset-password -- …`). The new password ends up in the shell
history, so treat it as temporary: ask the parent to change it right away under Parent zone → Account.
The reset also signs out that parent's other devices.

## Local full-stack development (optional)
No Postgres install needed: PGlite (Postgres compiled to WebAssembly) runs embedded.
```bash
npm run dev:api                 # server on :3000 with DATABASE_URL=pglite://.data/dev
VITE_STORE=api npm run dev      # frontend on :5173, /api proxied to :3000
```
Plain `npm run dev` keeps running in local mode (no server) as before.
