# Deploying Cooper's Spelling Slugger on Replit

Everything runs on Brandon's existing **Replit Core** plan: one Autoscale deployment (the Node server
that serves the game and its API) plus a Replit Postgres database. No other vendor, no new
subscription. GitHub holds the code; Replit pulls from it.

| Piece | Where | Notes |
| --- | --- | --- |
| Code | GitHub, private repo `brandon2196-oss/spelling-slugger` | Push from the Mac. |
| App + API | Replit Autoscale deployment | `npm run build:all` then `npm start` (see `.replit`). Bills against Core usage; one family is near the floor. |
| Database | Replit Postgres (production database) | Created from the Database tool; `DATABASE_URL` is injected. |
| Domain | Your Extra Inning domain | Linked to the deployment under Deployments → Settings → Domains. |

## 1. Import the repo into Replit (one time)
1. In Replit: **Create App → Import from GitHub** → pick `spelling-slugger`. Replit reads `.replit`
   (Node 22, build and run commands, port 3000).
2. Open the **Database** tool in the workspace and create a Postgres database. The workspace gets a
   development database; the deployment gets its own production database on first publish.
3. Press **Run** once in the workspace: it builds the frontend and server and starts on port 3000.
   The webview should show the welcome screen. Register a test family to confirm the database works.

## 2. Publish
1. **Deploy → Autoscale**. Build command and run command are pre-filled from `.replit`:
   build `npm ci && npm run build:all`, run `npm start`.
2. When asked about the database, choose to create / use the **production** database so real data
   never lives in the dev database.
3. Publish. The first URL is `https://<app>.<user>.replit.app`.

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
```bash
npm test && npm run build:all && git push
```
Then in Replit: pull the latest `main` (Git pane → Pull) and **Republish**. Installed home-screen
copies pick up the new version on their next launch.

## Password resets (no email provider)
Resets are done by you, from the workspace **Shell**, against the production database:
```bash
npm run reset-password -- mom@example.com NewPassword123
```
The workspace shell uses the development database by default; to point it at production, copy the
production `DATABASE_URL` from the Database tool's production tab into the command
(`DATABASE_URL='postgres://…' npm run reset-password -- …`). The parent can then change the password
under Parent zone → Account.

## Local full-stack development (optional)
No Postgres install needed: PGlite (Postgres compiled to WebAssembly) runs embedded.
```bash
npm run dev:api                 # server on :3000 with DATABASE_URL=pglite://.data/dev
VITE_STORE=api npm run dev      # frontend on :5173, /api proxied to :3000
```
Plain `npm run dev` keeps running in local mode (no server) as before.
